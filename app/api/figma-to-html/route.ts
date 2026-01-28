import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import {
  parseFigmaUrl,
  generateHtmlFilename,
  convertReactToHtml,
  extractImageConstants,
  replaceImagePlaceholders,
  wrapInHtmlDocument,
} from '@/app/lib/figma-utils';

/**
 * POST /api/figma-to-html
 *
 * Processes a Figma URL and generates HTML from the design.
 *
 * Request body:
 * {
 *   url: string;  // Figma design URL
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   html?: string;
 *   filename?: string;
 *   error?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Parse Figma URL
    const parseResult = parseFigmaUrl(url);

    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json(
        { success: false, error: parseResult.error || 'Invalid Figma URL' },
        { status: 400 }
      );
    }

    const { fileKey, nodeId } = parseResult.data;

    // Note: In a real implementation, you would call the Figma MCP here
    // Since the Figma MCP is a Claude Code plugin, we need to handle this differently
    // For now, we'll return instructions to use the html-renderer skill

    // Generate filename
    const filename = generateHtmlFilename(fileKey, nodeId);
    const htmlDir = path.join(process.cwd(), 'html');
    const filePath = path.join(htmlDir, filename);

    // Ensure html directory exists
    try {
      await fs.mkdir(htmlDir, { recursive: true });
    } catch (error) {
      console.error('Error creating html directory:', error);
    }

    // Return instructions for now
    // In a production environment, this would call the Figma MCP directly
    return NextResponse.json({
      success: false,
      error: 'FIGMA_MCP_REQUIRED',
      message:
        'This endpoint requires the Figma MCP to be called. Please use the html-renderer skill in Claude Code to generate the HTML first.',
      instructions: {
        fileKey,
        nodeId,
        command: `Use the html-renderer skill with Figma node: ${fileKey}/${nodeId}`,
        expectedOutputPath: filePath,
      },
    });
  } catch (error) {
    console.error('Error processing Figma URL:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/figma-to-html?filename={filename}
 *
 * Retrieves generated HTML from the html/ directory
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename is required' },
        { status: 400 }
      );
    }

    // Read HTML file
    const htmlDir = path.join(process.cwd(), 'html');
    const filePath = path.join(htmlDir, filename);

    try {
      const html = await fs.readFile(filePath, 'utf-8');

      return NextResponse.json({
        success: true,
        html,
        filename,
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error reading HTML file:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
