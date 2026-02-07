/**
 * Figma MCP client for server-side use.
 * Connects to the Figma desktop MCP server via Streamable HTTP transport.
 * Used as an alternative data source when FIGMA_MCP_URL is set.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { FigmaLayoutInfo } from './figma-api';

// ---------------------------------------------------------------------------
// Client lifecycle
// ---------------------------------------------------------------------------

/**
 * Create and connect an MCP client to the Figma MCP server.
 * The caller is responsible for calling `client.close()` when done.
 */
export async function createFigmaMCPClient(serverUrl: string): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(serverUrl));
  const client = new Client(
    { name: 'figma-to-puck', version: '1.0.0' },
  );
  await client.connect(transport);
  console.log('[MCP] Connected to Figma MCP server at', serverUrl);
  return client;
}

// ---------------------------------------------------------------------------
// get_screenshot
// ---------------------------------------------------------------------------

/**
 * Fetch a screenshot of a Figma node via the MCP `get_screenshot` tool.
 * Returns the raw PNG image as a Buffer.
 */
export async function mcpGetScreenshot(
  client: Client,
  fileKey: string,
  nodeId: string,
): Promise<Buffer> {
  console.log(`[MCP] Calling get_screenshot for ${fileKey} / ${nodeId}`);

  const result = await client.callTool({
    name: 'get_screenshot',
    arguments: { fileKey, nodeId },
  });

  const content = 'content' in result ? (result.content as any[]) : [];
  const imageBlock = content.find(
    (block: any) => block.type === 'image' && block.data,
  );

  if (!imageBlock) {
    const textBlock = content.find((block: any) => block.type === 'text');
    const errorMsg = textBlock?.text || 'No image returned from MCP get_screenshot';
    throw new Error(`[MCP] get_screenshot failed: ${errorMsg}`);
  }

  console.log(`[MCP] Got screenshot (${imageBlock.mimeType || 'image/png'})`);
  return Buffer.from(imageBlock.data, 'base64');
}

// ---------------------------------------------------------------------------
// get_design_context
// ---------------------------------------------------------------------------

export interface MCPDesignContext {
  /** Generated code/markup from the MCP server */
  code: string;
  /** Asset download URLs extracted from the response */
  assetUrls: string[];
}

/**
 * Fetch design context (code + asset URLs) for a Figma node via MCP.
 * The MCP `get_design_context` tool returns generated code and asset download URLs.
 */
export async function mcpGetDesignContext(
  client: Client,
  fileKey: string,
  nodeId: string,
): Promise<MCPDesignContext> {
  console.log(`[MCP] Calling get_design_context for ${fileKey} / ${nodeId}`);

  const result = await client.callTool({
    name: 'get_design_context',
    arguments: {
      fileKey,
      nodeId,
      clientFrameworks: 'html',
      clientLanguages: 'html,css',
      disableCodeConnect: true,
    },
  });

  const content = 'content' in result ? (result.content as any[]) : [];

  const textBlocks = content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text as string);

  const fullText = textBlocks.join('\n');

  if (!fullText) {
    throw new Error('[MCP] get_design_context returned no text content');
  }

  // Extract asset URLs — MCP returns URLs like:
  //   https://www.figma.com/api/mcp/asset/{uuid}  (no file extension!)
  //   http://localhost:3845/assets/{hash}.png  (local MCP desktop server)
  //   https://...figma.../*.png?...
  const mcpAssetRegex = /https?:\/\/[^\s"'<>]*figma\.com\/api\/mcp\/asset\/[^\s"'<>]+/gi;
  const localMcpRegex = /https?:\/\/(?:localhost|127\.0\.0\.1):\d+\/assets\/[^\s"'<>]+/gi;
  const fileAssetRegex = /https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|svg|gif|webp)(?:\?[^\s"'<>]*)?/gi;

  const allUrls = [
    ...(fullText.match(mcpAssetRegex) || []),
    ...(fullText.match(localMcpRegex) || []),
    ...(fullText.match(fileAssetRegex) || []),
  ];
  // Strip trailing quotes/semicolons that might have been captured
  const cleanUrls = allUrls.map((u) => u.replace(/[";]+$/, ''));
  const assetUrls = [...new Set(cleanUrls)];

  console.log(`[MCP] Got design context: ${fullText.length} chars, ${assetUrls.length} asset URL(s)`);

  return { code: fullText, assetUrls };
}

// ---------------------------------------------------------------------------
// get_metadata — node structure for layout info + vector detection
// ---------------------------------------------------------------------------

export interface MetadataNode {
  type: 'frame' | 'text' | 'instance';
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  children: MetadataNode[];
}

function extractAttr(attrs: string, name: string): string | null {
  const match = new RegExp(`${name}="([^"]*)"`, 'i').exec(attrs);
  return match ? match[1] : null;
}

/**
 * Parse the XML metadata returned by `get_metadata` into a tree structure.
 */
export function parseMetadataXml(xml: string): MetadataNode | null {
  const stack: MetadataNode[] = [];
  let root: MetadataNode | null = null;

  // Match opening tags, self-closing tags, and closing tags
  const tokenRegex = /<(frame|text|instance)\s+([^>]*?)\s*\/\s*>|<(frame|text|instance)\s+([^>]*?)>|<\/(frame|text|instance)>/g;
  let match;

  while ((match = tokenRegex.exec(xml)) !== null) {
    if (match[5]) {
      // Closing tag: </frame>, </text>, </instance>
      const node = stack.pop();
      if (stack.length > 0 && node) {
        stack[stack.length - 1].children.push(node);
      } else if (node) {
        root = node;
      }
    } else {
      // Opening or self-closing tag
      const isSelfClosing = !!match[1];
      const type = (match[1] || match[3]) as 'frame' | 'text' | 'instance';
      const attrs = match[2] || match[4];

      const node: MetadataNode = {
        type,
        id: extractAttr(attrs, 'id') || '',
        name: extractAttr(attrs, 'name') || '',
        x: parseFloat(extractAttr(attrs, 'x') || '0'),
        y: parseFloat(extractAttr(attrs, 'y') || '0'),
        width: parseFloat(extractAttr(attrs, 'width') || '0'),
        height: parseFloat(extractAttr(attrs, 'height') || '0'),
        children: [],
      };

      if (isSelfClosing) {
        if (stack.length > 0) {
          stack[stack.length - 1].children.push(node);
        } else {
          root = node;
        }
      } else {
        stack.push(node);
      }
    }
  }

  return root;
}

/** Recursively check whether a metadata node tree contains any text nodes. */
function metadataContainsText(node: MetadataNode): boolean {
  if (node.type === 'text') return true;
  return node.children.some((child) => metadataContainsText(child));
}

/**
 * Find vector container nodes in the metadata tree.
 * A vector container is a small frame (≤ 200px) with children but no text descendants.
 * These should be exported as a single screenshot instead of sub-components.
 */
export function findVectorContainers(node: MetadataNode, isRoot = true): MetadataNode[] {
  const results: MetadataNode[] = [];

  if (!isRoot) {
    const w = node.width;
    const h = node.height;

    if (
      (node.type === 'frame' || node.type === 'instance') &&
      w <= 200 && h <= 200 &&
      w >= 8 && h >= 8 &&
      node.children.length > 0 &&
      !metadataContainsText(node)
    ) {
      results.push(node);
      return results; // Don't recurse into vector containers
    }
  }

  for (const child of node.children) {
    results.push(...findVectorContainers(child, false));
  }

  return results;
}

/**
 * Fetch node structure metadata via MCP `get_metadata` tool.
 * Returns the parsed XML as a MetadataNode tree.
 */
export async function mcpGetMetadata(
  client: Client,
  fileKey: string,
  nodeId: string,
): Promise<MetadataNode | null> {
  console.log(`[MCP] Calling get_metadata for ${fileKey} / ${nodeId}`);

  const result = await client.callTool({
    name: 'get_metadata',
    arguments: { fileKey, nodeId },
  });

  const content = 'content' in result ? (result.content as any[]) : [];
  const textBlock = content.find((block: any) => block.type === 'text');

  if (!textBlock?.text) {
    console.warn('[MCP] get_metadata returned no text content');
    return null;
  }

  const root = parseMetadataXml(textBlock.text);
  if (root) {
    console.log(`[MCP] Parsed metadata: root "${root.name}" (${root.width}x${root.height})`);
  }
  return root;
}

// ---------------------------------------------------------------------------
// Build FigmaLayoutInfo from metadata
// ---------------------------------------------------------------------------

/**
 * Build a FigmaLayoutInfo structure from parsed MCP metadata.
 * Provides spacing, dimensions, and text content to Claude Vision for accurate layout.
 */
export function buildLayoutFromMetadata(root: MetadataNode): FigmaLayoutInfo {
  // Find the innermost "content" container — skip wrapper frames that are same-size as root
  let contentRoot = root;
  while (
    contentRoot.children.length === 1 &&
    contentRoot.children[0].type === 'frame' &&
    Math.abs(contentRoot.children[0].width - contentRoot.width) < 2 &&
    Math.abs(contentRoot.children[0].height - contentRoot.height) < 2
  ) {
    contentRoot = contentRoot.children[0];
  }

  // Infer layout direction from children positions
  const children = contentRoot.children;
  let layoutMode: string | undefined;
  if (children.length >= 2) {
    const allSameX = children.every((c) => Math.abs(c.x - children[0].x) < 2);
    const allSameY = children.every((c) => Math.abs(c.y - children[0].y) < 2);
    if (allSameX) layoutMode = 'VERTICAL';
    else if (allSameY) layoutMode = 'HORIZONTAL';
  }

  // Infer item spacing from consecutive children
  let itemSpacing: number | undefined;
  if (children.length >= 2 && layoutMode === 'VERTICAL') {
    const gaps: number[] = [];
    for (let i = 1; i < children.length; i++) {
      const gap = children[i].y - (children[i - 1].y + children[i - 1].height);
      gaps.push(Math.round(gap));
    }
    if (gaps.length > 0) {
      itemSpacing = gaps[0]; // Use the first gap
    }
  }

  // Collect text content recursively
  function findTextNodes(node: MetadataNode): { name: string; x: number; y: number; width: number; height: number }[] {
    if (node.type === 'text') {
      return [{ name: node.name, x: node.x, y: node.y, width: Math.round(node.width), height: Math.round(node.height) }];
    }
    return node.children.flatMap((child) => findTextNodes(child));
  }

  return {
    width: Math.round(contentRoot.width),
    height: Math.round(contentRoot.height),
    itemSpacing,
    layoutMode,
    children: children.map((child) => {
      const textNodes = findTextNodes(child);
      return {
        name: child.name,
        type: child.type.toUpperCase(),
        width: Math.round(child.width),
        height: Math.round(child.height),
        textContent: textNodes.length > 0
          ? textNodes.map((t) => t.name).join(', ')
          : undefined,
      };
    }),
  };
}
