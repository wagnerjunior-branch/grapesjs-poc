import { NextRequest, NextResponse } from 'next/server';
import { parseFigmaUrl } from '@/app/lib/figma-utils';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * POST /api/figma-process
 *
 * Creates a processing request that Claude Code will detect and handle
 * by invoking the html-renderer skill.
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

    // Create a processing request file that Claude can detect
    const requestsDir = path.join(process.cwd(), '.figma-requests');
    await fs.mkdir(requestsDir, { recursive: true });

    const requestId = `${fileKey}-${nodeId.replace(/:/g, '-')}-${Date.now()}`;
    const requestFile = path.join(requestsDir, `${requestId}.json`);

    const requestData = {
      id: requestId,
      url,
      fileKey,
      nodeId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await fs.writeFile(requestFile, JSON.stringify(requestData, null, 2), 'utf-8');

    // Return a special response that triggers Claude to process
    return NextResponse.json({
      success: true,
      requestId,
      fileKey,
      nodeId,
      message: 'CLAUDE_PROCESS_REQUEST',
      instruction: `Please invoke the /html-renderer skill for Figma node: ${fileKey}/${nodeId}`,
    });
  } catch (error) {
    console.error('Error creating process request:', error);
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
 * GET /api/figma-process?requestId={id}
 *
 * Check the status of a processing request
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: 'Request ID is required' },
        { status: 400 }
      );
    }

    const requestsDir = path.join(process.cwd(), '.figma-requests');
    const requestFile = path.join(requestsDir, `${requestId}.json`);

    try {
      const data = await fs.readFile(requestFile, 'utf-8');
      const request = JSON.parse(data);

      return NextResponse.json({
        success: true,
        request,
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error reading request:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
