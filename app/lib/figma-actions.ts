'use server';

/**
 * Figma Server Actions
 *
 * Server-side functions for processing Figma designs.
 * These run on the server and can access the filesystem and external APIs.
 */

import { promises as fs } from 'fs';
import path from 'path';
import {
  parseFigmaUrl,
  generateHtmlFilename,
  convertReactToHtml,
  extractImageConstants,
  replaceImagePlaceholders,
  wrapInHtmlDocument,
} from './figma-utils';

export interface FigmaProcessResult {
  success: boolean;
  html?: string;
  bodyHtml?: string;
  filename?: string;
  fileKey?: string;
  nodeId?: string;
  error?: string;
}

/**
 * Process a Figma URL and generate HTML
 *
 * This is a server action that:
 * 1. Parses the Figma URL
 * 2. Returns the parsed data so the client can call the Figma MCP
 * 3. The actual MCP call happens client-side via Claude Code tools
 */
export async function processFigmaUrl(url: string): Promise<FigmaProcessResult> {
  try {
    // Parse Figma URL
    const parseResult = parseFigmaUrl(url);

    if (!parseResult.success || !parseResult.data) {
      return {
        success: false,
        error: parseResult.error || 'Invalid Figma URL',
      };
    }

    const { fileKey, nodeId } = parseResult.data;

    return {
      success: true,
      fileKey,
      nodeId,
    };
  } catch (error) {
    console.error('Error processing Figma URL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process Figma URL',
    };
  }
}

/**
 * Save HTML to the html/ directory
 */
export async function saveHtmlToFile(
  html: string,
  fileKey: string,
  nodeId: string
): Promise<{ success: boolean; filename?: string; error?: string }> {
  try {
    const filename = generateHtmlFilename(fileKey, nodeId);
    const htmlDir = path.join(process.cwd(), 'html');
    const filePath = path.join(htmlDir, filename);

    // Ensure html directory exists
    await fs.mkdir(htmlDir, { recursive: true });

    // Write HTML to file
    await fs.writeFile(filePath, html, 'utf-8');

    return {
      success: true,
      filename,
    };
  } catch (error) {
    console.error('Error saving HTML file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save HTML file',
    };
  }
}

/**
 * Read HTML from the html/ directory
 */
export async function readHtmlFile(
  filename: string
): Promise<{ success: boolean; html?: string; error?: string }> {
  try {
    const htmlDir = path.join(process.cwd(), 'html');
    const filePath = path.join(htmlDir, filename);

    const html = await fs.readFile(filePath, 'utf-8');

    return {
      success: true,
      html,
    };
  } catch (error) {
    console.error('Error reading HTML file:', error);
    return {
      success: false,
      error: 'File not found',
    };
  }
}

/**
 * Process React code from Figma MCP and convert to clean HTML
 */
export async function processReactCode(
  reactCode: string,
  fileKey: string,
  nodeId: string
): Promise<FigmaProcessResult> {
  try {
    // Extract image constants
    const imageConstants = extractImageConstants(reactCode);

    // Convert React to HTML
    let html = convertReactToHtml(reactCode);

    // Replace image placeholders
    html = replaceImagePlaceholders(html, imageConstants);

    // Extract body content (remove function wrapper if present)
    let bodyHtml = html;

    // Wrap in complete HTML document
    const fullHtml = wrapInHtmlDocument(bodyHtml);

    // Save to file
    const saveResult = await saveHtmlToFile(fullHtml, fileKey, nodeId);

    if (!saveResult.success) {
      return {
        success: false,
        error: saveResult.error,
      };
    }

    return {
      success: true,
      html: fullHtml,
      bodyHtml,
      filename: saveResult.filename,
      fileKey,
      nodeId,
    };
  } catch (error) {
    console.error('Error processing React code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process React code',
    };
  }
}

/**
 * List all HTML files in the html/ directory
 */
export async function listHtmlFiles(): Promise<{
  success: boolean;
  files?: string[];
  error?: string;
}> {
  try {
    const htmlDir = path.join(process.cwd(), 'html');

    try {
      const files = await fs.readdir(htmlDir);
      const htmlFiles = files.filter((file) => file.endsWith('.html'));

      return {
        success: true,
        files: htmlFiles,
      };
    } catch (error) {
      // Directory doesn't exist yet
      return {
        success: true,
        files: [],
      };
    }
  } catch (error) {
    console.error('Error listing HTML files:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list HTML files',
    };
  }
}
