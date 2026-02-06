import { NextRequest, NextResponse } from 'next/server';
import { parseFigmaUrl } from '@/app/lib/figma-utils';
import { extractVariables } from '@/app/lib/puck-template';

/**
 * POST /api/figma-to-puck
 *
 * Accepts a Figma URL, parses it, and returns the data needed
 * for Claude Code to process the design via Figma MCP.
 *
 * The actual Figma MCP call + HTML conversion is done by Claude Code
 * using the html-renderer skill. This endpoint orchestrates the flow.
 *
 * Request: { figmaUrl: string } or { figmaUrl?: string, html: string }
 * Response: { success, fileKey, nodeId, html?, variables?, error? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { figmaUrl, html } = body;

    // If HTML is provided directly (from Claude Code callback), process it
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

    // Otherwise, parse the Figma URL for processing
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

    // Return parsed data — the client will trigger Claude Code to process
    return NextResponse.json({
      success: true,
      figmaUrl,
      fileKey,
      nodeId,
      message: 'FIGMA_MCP_REQUIRED',
      prompt: `Rewrite the returned output to be Puck friendly and responsive, replacing ALL existing classes with Tailwind v4 utility classes only.

Rules:
1) Keep the same DOM structure and all data-* attributes exactly as they are.
2) Do not add custom CSS, <style> tags, inline styles, or external fonts. Use Tailwind classes for typography and colors.
3) The final output MUST include a <body> wrapper.
4) IMPORTANT: Replace absolute positioning with a responsive layout using flex and spacing utilities. At the end there should be no absolute positioning.
5) Make the card responsive.
6) Use Tailwind font and color tokens.
7) The button should be accessible, and styled with Tailwind utilities (hover and focus states included).
8) After generating the HTML, verify your work:
   - Compare the rendered HTML with the original Figma screenshot
   - If there are visual discrepancies, iterate on the HTML/CSS to match the design more closely
   - Pay special attention to: spacing, colors, font sizes, alignment, and how elements wrap/stack on mobile
   - Repeat until the rendered output matches the Figma design. And dont forget to use a responsive layout`,
    });
  } catch (error) {
    console.error('Error in figma-to-puck:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
