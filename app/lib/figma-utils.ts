/**
 * Figma URL Utility Functions
 *
 * Utilities for parsing and validating Figma URLs, extracting file and node IDs,
 * and handling Figma-specific formatting.
 */

export interface FigmaUrlData {
  fileKey: string;
  nodeId: string;
  fileName?: string;
  branchKey?: string;
  url: string;
}

export interface FigmaUrlParseResult {
  success: boolean;
  data?: FigmaUrlData;
  error?: string;
}

/**
 * Parse a Figma URL and extract fileKey, nodeId, and other metadata
 *
 * Supports formats:
 * - https://www.figma.com/design/{fileKey}/{fileName}?node-id={nodeId}
 * - https://www.figma.com/design/{fileKey}/branch/{branchKey}/{fileName}?node-id={nodeId}
 * - https://figma.com/design/{fileKey}/{fileName}?node-id={nodeId}
 */
export function parseFigmaUrl(url: string): FigmaUrlParseResult {
  try {
    // Validate URL format
    const urlObj = new URL(url);

    // Check if it's a Figma URL
    if (!urlObj.hostname.includes('figma.com')) {
      return {
        success: false,
        error: 'URL must be from figma.com',
      };
    }

    // Extract pathname components
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    // Check if it's a design URL
    if (pathParts[0] !== 'design' && pathParts[0] !== 'file') {
      return {
        success: false,
        error: 'URL must be a Figma design or file URL',
      };
    }

    let fileKey: string;
    let fileName: string | undefined;
    let branchKey: string | undefined;

    // Parse based on URL structure
    if (pathParts.length >= 3 && pathParts[2] === 'branch' && pathParts.length >= 5) {
      // Format: /design/{fileKey}/branch/{branchKey}/{fileName}
      fileKey = pathParts[3]; // Use branchKey as fileKey when branch exists
      branchKey = pathParts[3];
      fileName = pathParts[4];
    } else if (pathParts.length >= 3) {
      // Format: /design/{fileKey}/{fileName}
      fileKey = pathParts[1];
      fileName = pathParts[2];
    } else {
      return {
        success: false,
        error: 'Invalid Figma URL format',
      };
    }

    // Extract node-id from query parameters
    const nodeIdParam = urlObj.searchParams.get('node-id');

    if (!nodeIdParam) {
      return {
        success: false,
        error: 'URL must include a node-id query parameter',
      };
    }

    // Convert node-id format from "1-2" to "1:2" (Figma uses hyphens in URLs, colons in API)
    const nodeId = nodeIdParam.replace(/-/g, ':');

    return {
      success: true,
      data: {
        fileKey,
        nodeId,
        fileName,
        branchKey,
        url,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid URL format',
    };
  }
}

/**
 * Validate Figma URL format
 */
export function validateFigmaUrl(url: string): { valid: boolean; error?: string } {
  const result = parseFigmaUrl(url);
  return {
    valid: result.success,
    error: result.error,
  };
}

/**
 * Generate a unique filename for HTML output
 */
export function generateHtmlFilename(fileKey: string, nodeId: string): string {
  const timestamp = Date.now();
  const sanitizedNodeId = nodeId.replace(/:/g, '-');
  return `figma-${fileKey}-${sanitizedNodeId}-${timestamp}.html`;
}

/**
 * Generate a unique folder name for screenshots
 */
export function generateScreenshotFolder(fileKey: string, nodeId: string): string {
  const timestamp = Date.now();
  const sanitizedNodeId = nodeId.replace(/:/g, '-');
  return `figma-${fileKey}-${sanitizedNodeId}-${timestamp}`;
}

/**
 * Convert React JSX/TSX code to clean HTML
 * (Helper function for processing Figma MCP output)
 */
export function convertReactToHtml(reactCode: string): string {
  let html = reactCode;

  // Remove export statement and function wrapper
  html = html.replace(/^export\s+default\s+function\s+\w+\s*\([^)]*\)\s*{\s*return\s*\(?\s*/gm, '');
  html = html.replace(/\s*\)?\s*;\s*}\s*$/gm, '');

  // Convert className to class
  html = html.replace(/className=/g, 'class=');

  // Convert self-closing tags
  html = html.replace(/<(\w+)([^>]*?)\s*\/>/g, '<$1$2></$1>');

  // Remove React fragments
  html = html.replace(/<>\s*/g, '');
  html = html.replace(/\s*<\/>/g, '');

  // Clean up variable references (like {imgVariable})
  html = html.replace(/{\s*(\w+)\s*}/g, (match, varName) => {
    // This will be replaced with actual values from const declarations
    return `{{${varName}}}`;
  });

  return html.trim();
}

/**
 * Extract image constants from React code
 */
export function extractImageConstants(reactCode: string): Record<string, string> {
  const constants: Record<string, string> = {};
  const constRegex = /const\s+(\w+)\s*=\s*["']([^"']+)["']/g;

  let match;
  while ((match = constRegex.exec(reactCode)) !== null) {
    const [, varName, url] = match;
    if (url.startsWith('http')) {
      constants[varName] = url;
    }
  }

  return constants;
}

/**
 * Replace image placeholders with actual URLs
 */
export function replaceImagePlaceholders(
  html: string,
  constants: Record<string, string>
): string {
  let result = html;

  Object.entries(constants).forEach(([varName, url]) => {
    const placeholder = new RegExp(`{{${varName}}}`, 'g');
    result = result.replace(placeholder, url);
  });

  return result;
}

/**
 * Wrap body content in complete HTML document
 */
export function wrapInHtmlDocument(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Figma Design</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&display=swap');

    body {
      font-family: 'IBM Plex Sans', sans-serif;
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
}
