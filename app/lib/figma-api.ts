/**
 * Figma REST API client for server-side use.
 * Fetches screenshot URLs for given nodes using the Figma Images API.
 */

export interface FigmaScreenshotResult {
  imageUrl: string;
  fileKey: string;
  nodeId: string;
}

/**
 * Fetch a screenshot URL from the Figma REST API.
 *
 * Uses: GET https://api.figma.com/v1/images/{fileKey}?ids={nodeId}&format=png&scale=2
 * Returns the temporary S3 URL that Figma generates for the rendered node.
 */
export async function fetchFigmaScreenshotUrl(
  fileKey: string,
  nodeId: string
): Promise<FigmaScreenshotResult> {
  const token = process.env.FIGMA_API_KEY;
  if (!token) {
    throw new Error('FIGMA_API_KEY environment variable is not set');
  }

  // Figma API expects node IDs with hyphens in the query string
  const formattedNodeId = nodeId.replace(/:/g, '-');

  const apiUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${formattedNodeId}&format=png&scale=2`;

  const response = await fetch(apiUrl, {
    headers: { 'X-Figma-Token': token },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Figma API error (${response.status}): ${text}`);
  }

  const data = await response.json();

  if (data.err) {
    throw new Error(`Figma API returned error: ${data.err}`);
  }

  // Figma returns images keyed by the nodeId (colon or hyphen format)
  const imageUrl = data.images?.[nodeId] || data.images?.[formattedNodeId];

  if (!imageUrl) {
    throw new Error(
      `No image URL returned for node ${nodeId}. Available keys: ${Object.keys(data.images || {}).join(', ')}`
    );
  }

  return { imageUrl, fileKey, nodeId };
}
