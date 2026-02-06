/**
 * Figma REST API client for server-side use.
 * Fetches screenshot URLs and image fills using the Figma Images API.
 */

export interface FigmaScreenshotResult {
  imageUrl: string;
  fileKey: string;
  nodeId: string;
}

export interface FigmaImageFill {
  nodeId: string;
  nodeName: string;
  imageUrl: string;
  width: number;
  height: number;
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

/**
 * Fetch the file structure for a node and extract child nodes that have image fills.
 * Then render those nodes as individual images via the Figma Images API.
 */
export async function fetchFigmaImageFills(
  fileKey: string,
  nodeId: string
): Promise<FigmaImageFill[]> {
  const token = process.env.FIGMA_API_KEY;
  if (!token) {
    throw new Error('FIGMA_API_KEY environment variable is not set');
  }

  // Get the file structure for this node
  const formattedNodeId = nodeId.replace(/:/g, '-');
  const fileUrl = `https://api.figma.com/v1/files/${fileKey}?ids=${formattedNodeId}&depth=10`;

  const fileResponse = await fetch(fileUrl, {
    headers: { 'X-Figma-Token': token },
  });

  if (!fileResponse.ok) {
    console.error('Failed to fetch Figma file structure');
    return [];
  }

  const fileData = await fileResponse.json();

  // Find nodes with image fills
  const imageNodeIds: { id: string; name: string; width: number; height: number }[] = [];

  function walkNodes(node: any) {
    const hasImageFill = node.fills?.some(
      (fill: any) => fill.type === 'IMAGE' && fill.visible !== false
    );

    if (hasImageFill && node.absoluteBoundingBox) {
      imageNodeIds.push({
        id: node.id,
        name: node.name || 'image',
        width: Math.round(node.absoluteBoundingBox.width),
        height: Math.round(node.absoluteBoundingBox.height),
      });
    }

    if (node.children) {
      for (const child of node.children) {
        walkNodes(child);
      }
    }
  }

  // Walk the document tree
  if (fileData.document) {
    walkNodes(fileData.document);
  }

  if (imageNodeIds.length === 0) {
    return [];
  }

  // Render image nodes via the Images API
  const ids = imageNodeIds.map((n) => n.id.replace(/:/g, '-')).join(',');
  const imagesUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${ids}&format=png&scale=2`;

  const imagesResponse = await fetch(imagesUrl, {
    headers: { 'X-Figma-Token': token },
  });

  if (!imagesResponse.ok) {
    console.error('Failed to fetch Figma image renders');
    return [];
  }

  const imagesData = await imagesResponse.json();
  const results: FigmaImageFill[] = [];

  for (const node of imageNodeIds) {
    const formattedId = node.id.replace(/:/g, '-');
    const url = imagesData.images?.[node.id] || imagesData.images?.[formattedId];
    if (url) {
      results.push({
        nodeId: node.id,
        nodeName: node.name,
        imageUrl: url,
        width: node.width,
        height: node.height,
      });
    }
  }

  return results;
}
