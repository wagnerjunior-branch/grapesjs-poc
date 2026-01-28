/**
 * Figma Request Processing
 *
 * This module handles Figma design conversion requests.
 * When a user submits a Figma URL, Claude Code will:
 * 1. Call Figma MCP to get design context
 * 2. Convert React code to HTML
 * 3. Save to html/ directory
 * 4. Return path for loading in editor
 */

export interface FigmaRequest {
  url: string;
  fileKey: string;
  nodeId: string;
  timestamp: number;
}

/**
 * Log a Figma processing request
 * Claude will monitor this and process automatically
 */
export function logFigmaRequest(fileKey: string, nodeId: string): FigmaRequest {
  const request: FigmaRequest = {
    url: `https://www.figma.com/design/${fileKey}?node-id=${nodeId}`,
    fileKey,
    nodeId,
    timestamp: Date.now(),
  };

  // Log to console for Claude to detect
  console.log('🎨 FIGMA_REQUEST:', JSON.stringify(request));

  return request;
}

/**
 * Check if a Figma HTML file exists
 */
export function getFigmaHtmlPath(fileKey: string, nodeId: string): string {
  const sanitizedNodeId = nodeId.replace(/:/g, '-');
  return `html/figma-${fileKey}-${sanitizedNodeId}.html`;
}
