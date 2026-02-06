import { NextRequest, NextResponse } from 'next/server';
import { parseFigmaUrl } from '@/app/lib/figma-utils';
import { extractVariables } from '@/app/lib/puck-template';
import { fetchFigmaScreenshotUrl } from '@/app/lib/figma-api';
import { generateHtmlFromScreenshot } from '@/app/lib/anthropic';

// Allow up to 60 seconds for the Claude API call on Vercel
export const maxDuration = 60;

/**
 * POST /api/figma-to-puck
 *
 * Two modes:
 * 1. { html: string } — process provided HTML (extract variables, return)
 * 2. { figmaUrl: string } — fetch screenshot from Figma, convert via Claude Vision, return HTML
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

    // Path 2: Figma URL → screenshot → Claude Vision → HTML
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

    // Step 1: Fetch screenshot URL from Figma REST API
    const { imageUrl } = await fetchFigmaScreenshotUrl(fileKey, nodeId);

    // Step 2: Send screenshot to Claude Vision → get HTML
    const generatedHtml = await generateHtmlFromScreenshot(imageUrl);

    // Step 3: Extract template variables
    const variables = extractVariables(generatedHtml);

    return NextResponse.json({
      success: true,
      html: generatedHtml,
      variables,
      figmaUrl,
      screenshotUrl: imageUrl,
      assets: [],
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
