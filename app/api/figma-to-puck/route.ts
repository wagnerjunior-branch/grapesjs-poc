import { NextRequest, NextResponse } from 'next/server';
import { parseFigmaUrl } from '@/app/lib/figma-utils';
import { extractVariables } from '@/app/lib/puck-template';
import {
  fetchFigmaScreenshotUrl,
  fetchFigmaNodeData,
  type FigmaImageFill,
} from '@/app/lib/figma-api';
import { generateAndRefineComponents } from '@/app/lib/anthropic';
import { getImageHostingService } from '@/app/lib/image-hosting';
import {
  jsonToPuckData,
  componentsToHtml,
} from '@/app/lib/puck-components';
import {
  createFigmaMCPClient,
  mcpGetScreenshot,
  mcpGetDesignContext,
  mcpGetMetadata,
  findVectorContainers,
  buildLayoutFromMetadata,
} from '@/app/lib/figma-mcp';

// Allow up to 120 seconds for Claude API calls (initial + refinement loop) on Vercel
export const maxDuration = 120;

/**
 * Download an image from a URL and upload it to the image hosting service.
 * Returns the permanent hosted URL.
 */
async function uploadImageToHost(
  imageUrl: string,
  filename: string
): Promise<string> {
  try {
    console.log(`[Upload] Downloading image: ${imageUrl.slice(0, 120)}...`);
    const service = getImageHostingService();
    const response = await fetch(imageUrl);
    console.log(`[Upload] Download status: ${response.status} for "${filename}"`);
    if (!response.ok) {
      console.warn(`[Upload] Download failed (${response.status}), falling back to original URL`);
      return imageUrl;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    console.log(`[Upload] Downloaded ${buffer.length} bytes, uploading to host...`);
    const result = await service.upload(buffer, filename);
    console.log(`[Upload] Hosted URL: ${result.url}`);
    return result.url;
  } catch (err) {
    console.error(`[Upload] Failed to upload image "${filename}":`, err);
    console.warn(`[Upload] Falling back to original Figma URL (may expire in ~30 min)`);
    return imageUrl;
  }
}

/**
 * MCP pipeline: Figma MCP server → screenshot + assets → Claude Vision → Puck Data
 *
 * Uses three MCP tools:
 * - get_screenshot: node screenshot as base64 PNG
 * - get_metadata: XML node structure (positions, sizes, types)
 * - get_design_context: generated code + asset download URLs
 *
 * Metadata is used to:
 * 1. Detect vector containers (logos/icons) and screenshot them individually
 * 2. Build FigmaLayoutInfo for accurate spacing/alignment
 */
async function processFigmaViaMCP(
  fileKey: string,
  nodeId: string,
  mcpUrl: string,
  figmaUrl: string,
) {
  const client = await createFigmaMCPClient(mcpUrl);
  try {
    const service = getImageHostingService();

    // Step 1: Get screenshot + metadata in parallel
    const [screenshotBuffer, metadata] = await Promise.all([
      mcpGetScreenshot(client, fileKey, nodeId),
      mcpGetMetadata(client, fileKey, nodeId),
    ]);
    console.log(`[MCP] Screenshot buffer: ${screenshotBuffer.length} bytes`);

    // Upload main screenshot to ImgBB
    const screenshotResult = await service.upload(screenshotBuffer, `figma-${fileKey}-${nodeId}.png`);
    const screenshotUrl = screenshotResult.url;
    console.log(`[MCP] Screenshot hosted at: ${screenshotUrl}`);

    // Step 2: Detect vector containers from metadata and screenshot them individually
    const vectorFills: FigmaImageFill[] = [];
    if (metadata) {
      const vectorContainers = findVectorContainers(metadata);
      if (vectorContainers.length > 0) {
        console.log(`[MCP] Found ${vectorContainers.length} vector container(s): ${vectorContainers.map((v) => `"${v.name}"`).join(', ')}`);

        for (const vec of vectorContainers) {
          try {
            const vecBuffer = await mcpGetScreenshot(client, fileKey, vec.id);
            const safeName = vec.name.replace(/[^a-zA-Z0-9-_]/g, '_');
            const vecResult = await service.upload(vecBuffer, `${safeName}-${Math.round(vec.width)}x${Math.round(vec.height)}.png`);
            vectorFills.push({
              nodeId: vec.id,
              nodeName: vec.name,
              imageUrl: vecResult.url,
              width: Math.round(vec.width),
              height: Math.round(vec.height),
              isVector: true,
            });
            console.log(`[MCP] Vector "${vec.name}" hosted at: ${vecResult.url}`);
          } catch (err) {
            console.warn(`[MCP] Failed to screenshot vector "${vec.name}":`, err);
          }
        }
      }
    }

    // Step 3: Get design context for additional asset URLs + exact design code
    const { code: designCode, assetUrls } = await mcpGetDesignContext(client, fileKey, nodeId);

    // Download and re-host each asset from design context
    const urlMap = new Map<string, string>(); // original URL → hosted URL
    console.log(`[MCP] Design context asset URLs: ${assetUrls.length}`, assetUrls);
    const contextFills: FigmaImageFill[] = await Promise.all(
      assetUrls.map(async (url, idx) => {
        const filename = `asset-${idx}-${fileKey}.png`;
        const hostedUrl = await uploadImageToHost(url, filename);
        // Only add to map if the URL actually changed (upload succeeded)
        if (hostedUrl !== url) {
          urlMap.set(url, hostedUrl);
          console.log(`[MCP] Asset ${idx}: ${url.slice(0, 60)} → ${hostedUrl}`);
        } else {
          console.warn(`[MCP] Asset ${idx}: upload failed, still localhost: ${url.slice(0, 60)}`);
        }
        return {
          nodeId: `mcp-asset-${idx}`,
          nodeName: `asset-${idx}`,
          imageUrl: hostedUrl,
          width: 0,
          height: 0,
          isVector: false,
        } satisfies FigmaImageFill;
      }),
    );

    // Replace localhost MCP asset URLs in design code with hosted URLs
    let processedDesignCode = designCode;
    for (const [originalUrl, hostedUrl] of urlMap) {
      processedDesignCode = processedDesignCode.replaceAll(originalUrl, hostedUrl);
    }

    // Combine vector fills (from metadata screenshots) + context fills (from design context)
    const allFills = [...vectorFills, ...contextFills];
    const hostedAssets = allFills.map((f) => f.imageUrl);

    // Step 4: Build layout info from metadata
    const layout = metadata ? buildLayoutFromMetadata(metadata) : null;
    if (layout) {
      console.log(`[MCP] Layout: ${layout.width}x${layout.height}, mode=${layout.layoutMode}, spacing=${layout.itemSpacing}`);
    }

    // Step 5: Claude Vision → JSON components → iterative refinement
    const components = await generateAndRefineComponents(
      screenshotUrl,
      allFills,
      layout,
      processedDesignCode,
      2, // max refinement iterations
      componentsToHtml,
    );

    // Step 6: Post-process — replace ALL localhost MCP asset URLs in components.
    // Walk the component tree and upload any localhost images directly.
    async function rehostLocalImages(comps: typeof components): Promise<void> {
      for (const comp of comps) {
        if (comp.props.src && /^https?:\/\/(?:localhost|127\.0\.0\.1):\d+/.test(comp.props.src)) {
          const localUrl = comp.props.src as string;
          // Check if we already have a mapping
          if (urlMap.has(localUrl)) {
            comp.props.src = urlMap.get(localUrl)!;
          } else {
            // Try to download and upload to ImgBB
            console.log(`[MCP] Re-hosting unmapped localhost image: ${localUrl.slice(0, 80)}`);
            try {
              const resp = await fetch(localUrl);
              if (resp.ok) {
                const buffer = Buffer.from(await resp.arrayBuffer());
                console.log(`[MCP] Downloaded ${buffer.length} bytes from localhost, uploading to ImgBB...`);
                const result = await service.upload(buffer, `mcp-rehost-${Date.now()}.png`);
                urlMap.set(localUrl, result.url);
                comp.props.src = result.url;
                console.log(`[MCP] Re-hosted: ${localUrl.slice(0, 50)} → ${result.url}`);
              } else {
                console.error(`[MCP] Failed to download localhost image: ${resp.status}`);
              }
            } catch (err) {
              console.error(`[MCP] Failed to re-host localhost image:`, err);
            }
          }
        }
        if (comp.children) await rehostLocalImages(comp.children);
      }
    }
    await rehostLocalImages(components);

    // Step 7: Convert to Puck Data + HTML
    const puckData = jsonToPuckData(components);
    const generatedHtml = componentsToHtml(components);
    const variables = extractVariables(generatedHtml);

    return NextResponse.json({
      success: true,
      puckData,
      components,
      html: generatedHtml,
      variables,
      figmaUrl,
      screenshotUrl,
      assets: hostedAssets,
    });
  } finally {
    await client.close();
    console.log('[MCP] Client closed');
  }
}

/**
 * POST /api/figma-to-puck
 *
 * Two modes:
 * 1. { html: string } — process provided HTML (extract variables, return)
 * 2. { figmaUrl: string } — fetch screenshot, extract images, upload to ImgBB,
 *    convert via Claude Vision to structured components, return puckData
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { figmaUrl, html } = body;

    // Path 1: HTML provided directly — extract variables and return
    if (html && typeof html === 'string') {
      const variables = extractVariables(html);
      return NextResponse.json({
        success: true,
        html,
        variables,
        figmaUrl: figmaUrl || null,
        assets: [],
      });
    }

    // Path 2: Figma URL → screenshot → Claude Vision → JSON components → Puck Data
    if (!figmaUrl || typeof figmaUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'figmaUrl is required' },
        { status: 400 }
      );
    }

    const parseResult = parseFigmaUrl(figmaUrl);
    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json(
        { success: false, error: parseResult.error || 'Invalid Figma URL' },
        { status: 400 }
      );
    }

    const { fileKey, nodeId } = parseResult.data;

    // Route: MCP pipeline (preferred) or REST API fallback
    const mcpUrl = process.env.FIGMA_MCP_URL;
    if (mcpUrl) {
      console.log('[MCP] Using Figma MCP pipeline');
      return await processFigmaViaMCP(fileKey, nodeId, mcpUrl, figmaUrl);
    }

    console.log('[REST] Using Figma REST API pipeline');

    // Step 1: Fetch screenshot URL and node data (image fills + layout) in parallel
    const [{ imageUrl }, { imageFills, layout }] = await Promise.all([
      fetchFigmaScreenshotUrl(fileKey, nodeId),
      fetchFigmaNodeData(fileKey, nodeId),
    ]);

    // Step 2: Upload extracted images to ImgBB for permanent hosting
    const hostedFills: FigmaImageFill[] = await Promise.all(
      imageFills.map(async (fill) => {
        const safeName = fill.nodeName.replace(/[^a-zA-Z0-9-_]/g, '_');
        const hostedUrl = await uploadImageToHost(
          fill.imageUrl,
          `${safeName}-${fill.width}x${fill.height}.png`
        );
        return { ...fill, imageUrl: hostedUrl };
      })
    );

    const hostedAssets = hostedFills.map((f) => f.imageUrl);

    // Step 3: Send screenshot + hosted image fills + layout to Claude Vision → JSON components → refine
    const components = await generateAndRefineComponents(
      imageUrl,
      hostedFills,
      layout,
      undefined, // no design code from REST API
      2, // max refinement iterations
      componentsToHtml,
    );

    // Step 4: Convert JSON components → Puck Data
    const puckData = jsonToPuckData(components);

    // Step 5: Generate flat HTML for export and variable extraction
    const generatedHtml = componentsToHtml(components);

    // Step 6: Extract template variables from the generated HTML
    const variables = extractVariables(generatedHtml);

    return NextResponse.json({
      success: true,
      puckData,
      components,
      html: generatedHtml,
      variables,
      figmaUrl,
      screenshotUrl: imageUrl,
      assets: hostedAssets,
    });
  } catch (error) {
    console.error('Error in figma-to-puck:', error);

    const message =
      error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('environment variable') ? 503 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status }
    );
  }
}
