/**
 * Figma REST API client for server-side use.
 * Fetches screenshot URLs, image fills, and vector assets using the Figma APIs.
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
  /** True if this asset was extracted from a vector/SVG node (logo, icon, shape). */
  isVector?: boolean;
}

export interface FigmaLayoutInfo {
  width: number;
  height: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  itemSpacing?: number;
  layoutMode?: string;
  children: {
    name: string;
    type: string;
    width: number;
    height: number;
    padding?: { top: number; right: number; bottom: number; left: number };
    itemSpacing?: number;
    cornerRadius?: number;
    fills?: string[];
    fontSize?: number;
    fontWeight?: number;
    textContent?: string;
  }[];
}

// ---------------------------------------------------------------------------
// Vector / visual-asset detection helpers
// ---------------------------------------------------------------------------

/** Figma node types that are vector primitives. */
const VECTOR_TYPES = new Set([
  'VECTOR',
  'BOOLEAN_OPERATION',
  'STAR',
  'LINE',
  'ELLIPSE',
  'REGULAR_POLYGON',
]);

/** Container types that may wrap vector groups (logos, icons). */
const CONTAINER_TYPES = new Set([
  'FRAME',
  'GROUP',
  'COMPONENT',
  'INSTANCE',
]);

const GRADIENT_TYPES = new Set([
  'GRADIENT_LINEAR',
  'GRADIENT_RADIAL',
  'GRADIENT_ANGULAR',
  'GRADIENT_DIAMOND',
]);

/** Recursively check if a node tree contains at least one vector primitive. */
function containsVectors(node: any): boolean {
  if (VECTOR_TYPES.has(node.type)) return true;
  if (node.children) {
    return node.children.some((child: any) => containsVectors(child));
  }
  return false;
}

/** Recursively check if a node tree contains any TEXT nodes. */
function containsText(node: any): boolean {
  if (node.type === 'TEXT') return true;
  if (node.children) {
    return node.children.some((child: any) => containsText(child));
  }
  return false;
}

/** Recursively check if a node tree contains any IMAGE fills. */
function containsImageFills(node: any): boolean {
  if (node.fills?.some((f: any) => f.type === 'IMAGE' && f.visible !== false)) {
    return true;
  }
  if (node.children) {
    return node.children.some((child: any) => containsImageFills(child));
  }
  return false;
}

/** Check if a node has a gradient fill (strong signal of visual asset). */
function hasGradientFill(node: any): boolean {
  return node.fills?.some(
    (f: any) => f.visible !== false && GRADIENT_TYPES.has(f.type)
  ) ?? false;
}

/**
 * Check if a node has a visually meaningful fill (gradient OR opaque solid).
 * Used to distinguish real visual assets from transparent wrapper frames.
 */
function hasVisualFill(node: any): boolean {
  return node.fills?.some((f: any) => {
    if (f.visible === false) return false;
    if (GRADIENT_TYPES.has(f.type)) return true;
    if (f.type === 'SOLID' && (f.opacity === undefined || f.opacity > 0.1)) return true;
    return false;
  }) ?? false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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

  const imageUrl = data.images?.[nodeId] || data.images?.[formattedNodeId];

  if (!imageUrl) {
    throw new Error(
      `No image URL returned for node ${nodeId}. Available keys: ${Object.keys(data.images || {}).join(', ')}`
    );
  }

  return { imageUrl, fileKey, nodeId };
}

/**
 * Fetch the file structure for a node. Extract image fills, vector assets, and layout metadata.
 * Render image/vector nodes via the Figma Images API.
 */
export async function fetchFigmaNodeData(
  fileKey: string,
  nodeId: string
): Promise<{ imageFills: FigmaImageFill[]; layout: FigmaLayoutInfo | null }> {
  const token = process.env.FIGMA_API_KEY;
  if (!token) {
    throw new Error('FIGMA_API_KEY environment variable is not set');
  }

  const formattedNodeId = nodeId.replace(/:/g, '-');
  // Use depth=30 to capture deeply-nested vector paths (logos can be 10+ levels deep)
  const fileUrl = `https://api.figma.com/v1/files/${fileKey}?ids=${formattedNodeId}&depth=30`;

  const fileResponse = await fetch(fileUrl, {
    headers: { 'X-Figma-Token': token },
  });

  if (!fileResponse.ok) {
    console.error('Failed to fetch Figma file structure');
    return { imageFills: [], layout: null };
  }

  const fileData = await fileResponse.json();

  // Collect raster image nodes and vector nodes separately
  const imageNodeIds: { id: string; name: string; width: number; height: number }[] = [];
  const vectorNodeIds: { id: string; name: string; width: number; height: number }[] = [];
  let rootNode: any = null;

  // Find the target node in the document
  function findNode(node: any): any {
    if (node.id === nodeId) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNode(child);
        if (found) return found;
      }
    }
    return null;
  }

  if (fileData.document) {
    rootNode = findNode(fileData.document);
  }

  // Walk nodes to find raster image fills
  function walkForImages(node: any) {
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
        walkForImages(child);
      }
    }
  }

  /**
   * Walk nodes to find vector / graphic assets (logos, icons, illustrations).
   *
   * Detection strategy (captures the MOST SPECIFIC visual unit):
   *
   * 1. Vector primitives (VECTOR, BOOLEAN_OPERATION, etc.) → export directly
   *
   * 2. Containers with a VISUAL FILL (gradient or opaque solid) that have no
   *    text or raster images inside → these ARE the visual asset (app icon with
   *    gradient background, colored badge, etc.). CAPTURE immediately.
   *
   * 3. Small containers (≤ 200px both dims) with vectors inside but no text
   *    or images → likely an icon or small logo. CAPTURE.
   *
   * 4. Large containers WITHOUT a visual fill → just layout wrappers.
   *    RECURSE into children to find the actual assets deeper.
   *
   * This ensures:
   * - "Image or video" (375×126, no fills) → recurses (wrapper)
   * - "TLife_Android_512px" (126×126, GRADIENT_LINEAR) → captured (the logo)
   * - "icon-close-outlined" (24×24, no fills) → captured (small icon)
   */
  function walkForVectors(node: any, isRoot: boolean = false) {
    // Don't export the root node itself as a vector
    if (isRoot) {
      if (node.children) {
        for (const child of node.children) {
          walkForVectors(child);
        }
      }
      return;
    }

    // Skip nodes already captured as image fills
    const nodeHasImageFill = node.fills?.some(
      (f: any) => f.type === 'IMAGE' && f.visible !== false
    );
    if (nodeHasImageFill) return;

    // Skip invisible nodes
    if (node.visible === false) return;

    const bb = node.absoluteBoundingBox;
    if (!bb) return;

    const w = Math.round(bb.width);
    const h = Math.round(bb.height);

    // Skip tiny decorative elements
    if (w < 8 || h < 8) return;

    // --- Vector primitives: always capture ---
    if (VECTOR_TYPES.has(node.type)) {
      vectorNodeIds.push({
        id: node.id,
        name: node.name || 'vector',
        width: w,
        height: h,
      });
      return;
    }

    // --- Non-container nodes: nothing to do ---
    if (!CONTAINER_TYPES.has(node.type)) {
      if (node.children) {
        for (const child of node.children) walkForVectors(child);
      }
      return;
    }

    // --- Container node: decide whether to capture or recurse ---

    // Reject containers with text or raster images — they're content areas
    if (containsText(node) || containsImageFills(node)) {
      if (node.children) {
        for (const child of node.children) walkForVectors(child);
      }
      return;
    }

    // Rule A: Container has a gradient fill → it IS a visual asset
    //         (e.g. app icon with gradient background + vector shapes)
    //         Capture regardless of whether we can see vectors inside
    //         (depth may have truncated them).
    if (hasGradientFill(node)) {
      console.log(
        `[Figma] Detected graphic asset (gradient): "${node.name}" (${node.type}, ${w}x${h})`
      );
      vectorNodeIds.push({
        id: node.id,
        name: node.name || 'graphic',
        width: w,
        height: h,
      });
      return;
    }

    // From here, the container has no gradient fill.
    // Check if it contains vectors (may fail if tree was truncated by depth).
    const hasVectors = containsVectors(node);

    // Rule B: Small container (≤ 200px) with vectors → icon / small logo
    if (w <= 200 && h <= 200 && hasVectors) {
      console.log(
        `[Figma] Detected vector icon: "${node.name}" (${node.type}, ${w}x${h})`
      );
      vectorNodeIds.push({
        id: node.id,
        name: node.name || 'icon',
        width: w,
        height: h,
      });
      return;
    }

    // Rule C: Small container (≤ 200px) with opaque solid fill + has children
    //         but no vectors found (maybe depth-truncated) → still worth capturing
    if (w <= 200 && h <= 200 && hasVisualFill(node) && node.children?.length > 0) {
      console.log(
        `[Figma] Detected graphic asset (solid+children): "${node.name}" (${node.type}, ${w}x${h})`
      );
      vectorNodeIds.push({
        id: node.id,
        name: node.name || 'graphic',
        width: w,
        height: h,
      });
      return;
    }

    // Rule D: Large container without meaningful fill → layout wrapper, recurse
    if (node.children) {
      for (const child of node.children) {
        walkForVectors(child);
      }
    }
  }

  if (rootNode) {
    walkForImages(rootNode);
    walkForVectors(rootNode, true);
  }

  // Deduplicate: remove vector nodes that overlap with image fill nodes
  const imageIdSet = new Set(imageNodeIds.map((n) => n.id));
  const uniqueVectorNodes = vectorNodeIds.filter((n) => !imageIdSet.has(n.id));

  if (uniqueVectorNodes.length > 0) {
    console.log(
      `[Figma] Found ${uniqueVectorNodes.length} vector/graphic asset(s): ${uniqueVectorNodes.map((n) => `"${n.name}"`).join(', ')}`
    );
  }

  // Extract layout info from root node
  let layout: FigmaLayoutInfo | null = null;
  if (rootNode?.absoluteBoundingBox) {
    layout = {
      width: Math.round(rootNode.absoluteBoundingBox.width),
      height: Math.round(rootNode.absoluteBoundingBox.height),
      padding: extractPadding(rootNode),
      itemSpacing: rootNode.itemSpacing,
      layoutMode: rootNode.layoutMode,
      children: (rootNode.children || []).map((child: any) => {
        const fills = (child.fills || [])
          .filter((f: any) => f.type === 'SOLID' && f.visible !== false)
          .map((f: any) => rgbaToHex(f.color, f.opacity));

        return {
          name: child.name,
          type: child.type,
          width: child.absoluteBoundingBox
            ? Math.round(child.absoluteBoundingBox.width)
            : 0,
          height: child.absoluteBoundingBox
            ? Math.round(child.absoluteBoundingBox.height)
            : 0,
          padding: extractPadding(child),
          itemSpacing: child.itemSpacing,
          cornerRadius: child.cornerRadius,
          fills,
          fontSize: child.style?.fontSize,
          fontWeight: child.style?.fontWeight,
          textContent:
            child.type === 'TEXT' ? child.characters : undefined,
        };
      }),
    };
  }

  // -----------------------------------------------------------------------
  // Fetch rendered images via Figma Images API
  // -----------------------------------------------------------------------

  let imageFills: FigmaImageFill[] = [];

  // Batch 1: Raster image nodes (scale=2)
  if (imageNodeIds.length > 0) {
    const ids = imageNodeIds.map((n) => n.id.replace(/:/g, '-')).join(',');
    const imagesUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${ids}&format=png&scale=2`;

    const imagesResponse = await fetch(imagesUrl, {
      headers: { 'X-Figma-Token': token },
    });

    if (imagesResponse.ok) {
      const imagesData = await imagesResponse.json();
      for (const node of imageNodeIds) {
        const fmtId = node.id.replace(/:/g, '-');
        const url =
          imagesData.images?.[node.id] || imagesData.images?.[fmtId];
        if (url) {
          imageFills.push({
            nodeId: node.id,
            nodeName: node.name,
            imageUrl: url,
            width: node.width,
            height: node.height,
            isVector: false,
          });
        }
      }
    }
  }

  // Batch 2: Vector/graphic nodes (scale=4 for crisp rendering)
  if (uniqueVectorNodes.length > 0) {
    const ids = uniqueVectorNodes.map((n) => n.id.replace(/:/g, '-')).join(',');
    const vectorsUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${ids}&format=png&scale=4`;

    const vectorsResponse = await fetch(vectorsUrl, {
      headers: { 'X-Figma-Token': token },
    });

    if (vectorsResponse.ok) {
      const vectorsData = await vectorsResponse.json();
      for (const node of uniqueVectorNodes) {
        const fmtId = node.id.replace(/:/g, '-');
        const url =
          vectorsData.images?.[node.id] || vectorsData.images?.[fmtId];
        if (url) {
          imageFills.push({
            nodeId: node.id,
            nodeName: node.name,
            imageUrl: url,
            width: node.width,
            height: node.height,
            isVector: true,
          });
        }
      }
    } else {
      console.error('[Figma] Failed to fetch vector node renders');
    }
  }

  return { imageFills, layout };
}

function extractPadding(node: any) {
  if (
    node.paddingTop !== undefined ||
    node.paddingRight !== undefined ||
    node.paddingBottom !== undefined ||
    node.paddingLeft !== undefined
  ) {
    return {
      top: node.paddingTop ?? 0,
      right: node.paddingRight ?? 0,
      bottom: node.paddingBottom ?? 0,
      left: node.paddingLeft ?? 0,
    };
  }
  return undefined;
}

function rgbaToHex(color: any, opacity?: number): string {
  if (!color) return '#000000';
  const r = Math.round((color.r ?? 0) * 255);
  const g = Math.round((color.g ?? 0) * 255);
  const b = Math.round((color.b ?? 0) * 255);
  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  if (opacity !== undefined && opacity < 1) {
    const a = Math.round(opacity * 255);
    return hex + a.toString(16).padStart(2, '0');
  }
  return hex;
}
