import Anthropic from '@anthropic-ai/sdk';
import type { FigmaImageFill, FigmaLayoutInfo } from './figma-api';
import type { ClaudeComponent } from './puck-components';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

function buildPrompt(
  imageFills: FigmaImageFill[],
  layout: FigmaLayoutInfo | null
): string {
  let imageSection = '';

  if (imageFills.length > 0) {
    const rasterImages = imageFills.filter((img) => !img.isVector);
    const vectorAssets = imageFills.filter((img) => img.isVector);

    const parts: string[] = [];

    if (rasterImages.length > 0) {
      const rasterList = rasterImages
        .map((img) => `- "${img.nodeName}" (${img.width}x${img.height}): ${img.imageUrl}`)
        .join('\n');
      parts.push(`Raster images (photos, backgrounds):\n${rasterList}`);
    }

    if (vectorAssets.length > 0) {
      const vectorList = vectorAssets
        .map((img) => `- "${img.nodeName}" (${img.width}x${img.height}, vector/logo): ${img.imageUrl}`)
        .join('\n');
      parts.push(`Vector assets (logos, icons, SVG shapes — exported as PNG):\n${vectorList}`);
    }

    imageSection = `

IMPORTANT — Real image assets extracted from this Figma design:
${parts.join('\n\n')}

You MUST use these actual image URLs in the corresponding <img> tags. Match each image to its position in the design by name and size. Do NOT use placeholder URLs.
For vector/logo assets, use object-fit: contain so they are not cropped.`;
  }

  let layoutSection = '';

  if (layout) {
    const rootPadding = layout.padding
      ? `padding: ${layout.padding.top}px ${layout.padding.right}px ${layout.padding.bottom}px ${layout.padding.left}px`
      : 'no padding';
    const rootSpacing = layout.itemSpacing !== undefined
      ? `gap/spacing between children: ${layout.itemSpacing}px`
      : '';
    const rootLayout = layout.layoutMode
      ? `layout: ${layout.layoutMode === 'VERTICAL' ? 'flex-col' : 'flex-row'}`
      : '';

    const childrenDetails = layout.children
      .map((child) => {
        const parts = [`  - "${child.name}" (${child.type}, ${child.width}x${child.height})`];
        if (child.padding) {
          parts.push(`    padding: ${child.padding.top}px ${child.padding.right}px ${child.padding.bottom}px ${child.padding.left}px`);
        }
        if (child.itemSpacing !== undefined) {
          parts.push(`    gap: ${child.itemSpacing}px`);
        }
        if (child.cornerRadius) {
          parts.push(`    border-radius: ${child.cornerRadius}px`);
        }
        if (child.fills && child.fills.length > 0) {
          parts.push(`    background: ${child.fills.join(', ')}`);
        }
        if (child.fontSize) {
          parts.push(`    font-size: ${child.fontSize}px`);
        }
        if (child.fontWeight) {
          parts.push(`    font-weight: ${child.fontWeight}`);
        }
        if (child.textContent) {
          parts.push(`    text: "${child.textContent}"`);
        }
        return parts.join('\n');
      })
      .join('\n');

    layoutSection = `

EXACT LAYOUT DATA extracted from Figma (use these EXACT values for pixel-perfect spacing):
Root container: ${layout.width}x${layout.height}, ${rootPadding}, ${rootSpacing}, ${rootLayout}
Children:
${childrenDetails}

Use Tailwind arbitrary values to match these exact measurements. Examples:
- p-[24px], px-[16px], pt-[32px] for padding
- gap-[12px] for spacing between children
- rounded-[8px] for border radius
- text-[16px] for font size
- w-[${layout.width}px] or max-w-[${layout.width}px] for container width`;
  }

  return `You are an expert frontend developer. You are given a screenshot of a Figma design component.

Your task: Generate HTML that is a PIXEL-PERFECT reproduction of this design.

CRITICAL RULES:

1) Use Tailwind v4 utility classes ONLY. No custom CSS, <style> tags, inline styles, or external fonts.
2) The output MUST be a single <body> element wrapping everything.
3) Use responsive flex layout — NO absolute or fixed positioning.
4) Match the EXACT colors from the design. Use Tailwind arbitrary values like bg-[#E20074] for brand colors that don't have standard Tailwind equivalents. Pay close attention to pinks, magentas, and other brand colors.
5) Include EVERY visible element: headings, text, buttons, icons, close buttons, images — do NOT skip anything.
6) Buttons and CTAs are critical — reproduce them with correct background color, text color, padding, border-radius, and full width. Add hover: and focus: states.
7) For close/dismiss buttons (X icons), use an SVG or the × character.
8) Match font sizes, font weights, spacing, and padding as closely as possible using the layout data provided below.
9) Make the component responsive and mobile-friendly.${imageSection}${layoutSection}

Output ONLY the raw <body>...</body> HTML. No markdown fences, no explanation, no code comments.`;
}

/**
 * Send a Figma screenshot to Claude Vision and get back HTML.
 */
export async function generateHtmlFromScreenshot(
  screenshotUrl: string,
  imageFills: FigmaImageFill[] = [],
  layout: FigmaLayoutInfo | null = null
): Promise<string> {
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'url',
              url: screenshotUrl,
            },
          },
          {
            type: 'text',
            text: buildPrompt(imageFills, layout),
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text content');
  }

  let html = textBlock.text;

  // Strip markdown code fences if Claude included them
  html = html.replace(/^```html?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  return html.trim();
}

// ---------------------------------------------------------------------------
// Component-based prompt (JSON output)
// ---------------------------------------------------------------------------

/**
 * Build the design code section for the prompt.
 * Strips Tailwind class names containing CSS variables with forward slashes
 * (Figma design tokens like --font/size/24) to prevent Tailwind scanner errors.
 *
 * Regexes are constructed dynamically via new RegExp() to avoid Tailwind
 * picking up class-like patterns from our source code.
 */
function buildDesignCodeSection(designCode: string): string {
  // Build regex patterns dynamically to prevent Tailwind from scanning them.
  // Each entry: [pattern, flags, replacement]
  const varPat = 'var\\([^,]+,([^)]+)\\)';
  const varPatFull = 'var\\([^)]+\\)';
  const varSlash = 'var\\([^)]*\\/[^)]*\\)';

  const replacements: [string, string][] = [
    [`text-\\[length:${varPat}\\]`, '/* font-size: $1 */'],
    [`font-\\[${varPat}\\]`, '/* font: $1 */'],
    [`font-\\[family-name:${varPatFull}\\]`, '/* font-family: see design */'],
    [`text-\\[color:${varPat}\\]`, '/* color: $1 */'],
    [`leading-\\[${varPat}\\]`, '/* line-height: $1 */'],
    [`gap-\\[${varPat}\\]`, '/* gap: $1 */'],
    [`rounded-\\[${varPat}\\]`, '/* border-radius: $1 */'],
    [`p([xytblr])-\\[${varPat}\\]`, '/* padding-$1: $2 */'],
    [`bg-\\[${varPat}\\]`, '/* background: $1 */'],
    [`shadow-\\[[^\\]]*${varSlash}[^\\]]*\\]`, '/* shadow: see design */'],
  ];

  let cleaned = designCode;
  for (const [pattern, replacement] of replacements) {
    cleaned = cleaned.replace(new RegExp(pattern, 'g'), replacement);
  }

  // Truncate design code if too large to avoid hitting token limits
  const MAX_DESIGN_CODE_LENGTH = 8000;
  if (cleaned.length > MAX_DESIGN_CODE_LENGTH) {
    console.warn(`[Claude] Design code truncated from ${cleaned.length} to ${MAX_DESIGN_CODE_LENGTH} chars`);
    cleaned = cleaned.slice(0, MAX_DESIGN_CODE_LENGTH) + '\n<!-- truncated -->';
  }

  return [
    '',
    '',
    'FIGMA DESIGN CODE — Extract EXACT pixel values from this code for your JSON output:',
    '- Look for padding, gap, font-size, font-weight, color, alignment, border-radius values',
    '- CSS comments like "/* font-size: 24px */" show the resolved values from Figma design tokens',
    '- For close/dismiss buttons aligned via spacer + icon pattern, use flexDirection "row" with justifyContent "flex-end"',
    '- Match all spacing, sizes, and colors EXACTLY as specified',
    '',
    cleaned,
  ].join('\n');
}

function buildComponentPrompt(
  imageFills: FigmaImageFill[],
  layout: FigmaLayoutInfo | null,
  designCode?: string,
): string {
  let imageSection = '';

  if (imageFills.length > 0) {
    const rasterImages = imageFills.filter((img) => !img.isVector);
    const vectorAssets = imageFills.filter((img) => img.isVector);

    const parts: string[] = [];

    if (rasterImages.length > 0) {
      const rasterList = rasterImages
        .map((img) => `- "${img.nodeName}" (${img.width}x${img.height}): ${img.imageUrl}`)
        .join('\n');
      parts.push(`Raster images (photos, backgrounds):\n${rasterList}`);
    }

    if (vectorAssets.length > 0) {
      const vectorList = vectorAssets
        .map((img) => `- "${img.nodeName}" (${img.width}x${img.height}, vector/logo): ${img.imageUrl}`)
        .join('\n');
      parts.push(`Vector assets (logos, icons, SVG shapes — exported as high-res PNG):\n${vectorList}`);
    }

    imageSection = `

IMPORTANT — Real image assets extracted from this Figma design:
${parts.join('\n\n')}

You MUST use these actual image URLs in Image component src props. Match each image to its position in the design by name and size. Do NOT use placeholder URLs.
For vector/logo assets, use objectFit "contain" (not "cover") so logos and icons are not cropped.
Set the Image width/height to match the original dimensions from the design.`;
  }

  let layoutSection = '';

  if (layout) {
    const rootPadding = layout.padding
      ? `padding: ${layout.padding.top}px ${layout.padding.right}px ${layout.padding.bottom}px ${layout.padding.left}px`
      : 'no padding';
    const rootSpacing = layout.itemSpacing !== undefined
      ? `gap/spacing between children: ${layout.itemSpacing}px`
      : '';
    const rootLayout = layout.layoutMode
      ? `layout: ${layout.layoutMode === 'VERTICAL' ? 'column' : 'row'}`
      : '';

    const childrenDetails = layout.children
      .map((child) => {
        const parts = [`  - "${child.name}" (${child.type}, ${child.width}x${child.height})`];
        if (child.padding) {
          parts.push(`    padding: ${child.padding.top}px ${child.padding.right}px ${child.padding.bottom}px ${child.padding.left}px`);
        }
        if (child.itemSpacing !== undefined) {
          parts.push(`    gap: ${child.itemSpacing}px`);
        }
        if (child.cornerRadius) {
          parts.push(`    border-radius: ${child.cornerRadius}px`);
        }
        if (child.fills && child.fills.length > 0) {
          parts.push(`    background: ${child.fills.join(', ')}`);
        }
        if (child.fontSize) {
          parts.push(`    font-size: ${child.fontSize}px`);
        }
        if (child.fontWeight) {
          parts.push(`    font-weight: ${child.fontWeight}`);
        }
        if (child.textContent) {
          parts.push(`    text: "${child.textContent}"`);
        }
        return parts.join('\n');
      })
      .join('\n');

    layoutSection = `

EXACT LAYOUT DATA extracted from Figma (use these EXACT values for pixel-perfect spacing):
Root container: ${layout.width}x${layout.height}, ${rootPadding}, ${rootSpacing}, ${rootLayout}
Children:
${childrenDetails}`;
  }

  return `You are an expert frontend developer. You are given a screenshot of a Figma design component.

Your task: Produce a JSON array of UI components that faithfully reproduces this design.

AVAILABLE COMPONENT TYPES AND THEIR PROPS:

1. Flex — flexbox layout container (has "children" array for nested components)
   Props: direction ("column"|"row"), wrap ("nowrap"|"wrap"), justifyContent ("flex-start"|"center"|"flex-end"|"space-between"|"space-around"), alignItems ("flex-start"|"center"|"flex-end"|"stretch"), gap (number, in pixels, e.g. 16), backgroundColor (hex), paddingTop/paddingRight/paddingBottom/paddingLeft (e.g. "24px"), maxWidth (e.g. "600px"|"100%"), borderRadius (e.g. "8px")

2. Grid — CSS grid layout container (has "children" array for nested components)
   Props: numColumns (number, 1-12), gap (number, in pixels, e.g. 16), alignItems ("flex-start"|"center"|"flex-end"|"stretch"), backgroundColor (hex), paddingTop/paddingRight/paddingBottom/paddingLeft (e.g. "24px"), maxWidth (e.g. "600px"|"100%"), borderRadius (e.g. "8px")

3. Space — spacing between elements
   Props: size (e.g. "24px"), direction ("vertical"|"horizontal")

4. Heading — heading text (h1-h6)
   Props: text (string), level ("h1"-"h6"), color (hex), fontSize (e.g. "32px"), fontWeight (e.g. "700"), textAlign ("left"|"center"|"right")

5. Text — paragraph text
   Props: text (string), color (hex), fontSize (e.g. "16px"), fontWeight (e.g. "400"), textAlign ("left"|"center"|"right")

6. Image — image element
   Props: src (URL), alt (string), width (e.g. "100%"|"200px"), height (e.g. "auto"|"300px"), objectFit ("cover"|"contain"|"fill"|"none"), borderRadius (e.g. "8px")

7. Button — CTA button/link
   Props: text (string), href (URL or "#"), backgroundColor (hex), color (hex), fontSize (e.g. "16px"), fontWeight (e.g. "600"), paddingX (e.g. "24px"), paddingY (e.g. "12px"), borderRadius (e.g. "8px"), fullWidth (boolean)

8. Divider — horizontal line
   Props: color (hex), thickness (e.g. "1px")

WHEN TO USE FLEX vs GRID:
- Use Flex with direction "column" for: vertical stacking (most common for mobile-first layouts).
- Use Flex with direction "row" for: horizontal rows where items have different widths (e.g. icon + text, logo + spacer + close button).
- Use Flex with wrap "wrap" for: items that should wrap to the next line when they don't fit.
- Use Grid with numColumns for: equal-width columns, card grids, image galleries.
- Use Space between elements when you need explicit spacing that isn't handled by the parent's gap.

RULES:
- The root of the array MUST be one or more Flex or Grid components.
- Use exact hex colors from the design (e.g. "#E20074" for magenta/pink brand colors).
- Use exact pixel values for spacing, font sizes, padding from the layout data below.
- For images, use the real image URLs provided below. Do NOT use placeholder URLs.
- For logos, icons, and vector assets: use the provided PNG URLs with objectFit "contain" and set width/height to their original pixel dimensions (e.g. "120px", "40px").
- For raster photos/backgrounds: use objectFit "cover" as usual.
- Include EVERY visible element: headings, text, buttons, icons, close buttons, images, logos.
- Use nested Flex/Grid for layout grouping (rows within columns, etc.).
- gap prop on Flex and Grid is a NUMBER (pixels), NOT a string. E.g. gap: 16, NOT gap: "16px".
- Padding and size values are STRINGS with units (e.g. "16px", "100%").

CRITICAL WIDTH RULES:
- ALL Flex and Grid containers should use maxWidth "100%" unless you have a specific reason to constrain them.
- NEVER use a fixed pixel maxWidth (like "375px" or "327px") on content cards, panels, or sheets — they must fill their parent container.
- The root overlay/background Flex should ALWAYS be maxWidth "100%".
- Inner content containers (cards, sheets, panels) should ALSO be maxWidth "100%".
- Only use a fixed pixel maxWidth if the element is explicitly a small, centered widget that should NOT stretch.

CRITICAL IMAGE RULES:
- The provided image assets (PNG/JPG) are ALREADY CROPPED and contain their own backgrounds.
- Do NOT wrap images in a Flex with a backgroundColor that duplicates the image's background. Just use the Image component directly.
- Do NOT add colored borders, shadows, or backgrounds around images — the image file already includes those visual elements.
- Place images directly as children of the main layout Flex, not inside extra wrapper Flex containers with background colors.

CRITICAL ALIGNMENT RULES:
- Close/dismiss buttons (X icon): MUST be in a Flex with direction "row" and justifyContent "flex-end" to align to the RIGHT side. The X should be a simple Text component with "×" character.
- Images and logos that are narrower than their container: the PARENT Flex MUST have alignItems "center" to CENTER them horizontally.
- Text that appears centered in the design: set textAlign "center" AND ensure the parent Flex has alignItems "center".
- When the overall layout is a column, always set alignItems "center" on Flex containers that visually center their content.

CRITICAL BUTTON RULES:
- If a button spans the full width of its container in the design, set fullWidth: true.
- On mobile-sized designs (< 500px wide), buttons that take most of the width should use fullWidth: true.
- The button's parent Flex should have alignItems "stretch" when the button is full-width.
- Button borderRadius should match the design EXACTLY. Most buttons have slightly rounded corners (borderRadius "8px" or "12px"). Do NOT use large borderRadius like "28px", "32px", or "999px" which creates a pill-shaped button — only use those if the design clearly shows a pill/capsule shape.

CRITICAL IMAGE SIZE RULES:
- App icons and logos should be rendered at a LARGE visible size to match the Figma design. In mobile interstitials, app icons are typically 120px-180px wide.
- Look at the proportion of the image relative to the card width in the screenshot — if the image takes about 40-50% of the card width, set its dimensions accordingly (e.g. "160px" for a full-width card).
- Do NOT make images too small (e.g. "60px" or "80px") for app icons that appear prominently in the design.

EXAMPLE OUTPUT (mobile bottom-sheet interstitial with overlay, close button, centered image, full-width CTA):
[
  {
    "type": "Flex",
    "props": {
      "direction": "column",
      "alignItems": "stretch",
      "justifyContent": "flex-end",
      "gap": 0,
      "backgroundColor": "rgba(0,0,0,0.4)",
      "maxWidth": "100%"
    },
    "children": [
      {
        "type": "Flex",
        "props": {
          "direction": "column",
          "alignItems": "stretch",
          "gap": 0,
          "backgroundColor": "#ffffff",
          "maxWidth": "100%",
          "borderRadius": "24px 24px 0px 0px"
        },
        "children": [
          {
            "type": "Flex",
            "props": { "direction": "row", "justifyContent": "flex-end", "gap": 0, "paddingTop": "16px", "paddingRight": "16px" },
            "children": [
              { "type": "Text", "props": { "text": "×", "fontSize": "24px", "color": "#333333" } }
            ]
          },
          {
            "type": "Flex",
            "props": { "direction": "column", "alignItems": "center", "gap": 24, "paddingTop": "16px", "paddingRight": "24px", "paddingBottom": "24px", "paddingLeft": "24px" },
            "children": [
              { "type": "Image", "props": { "src": "https://example.com/logo.png", "alt": "App icon", "width": "160px", "height": "160px", "objectFit": "contain", "borderRadius": "24px" } },
              {
                "type": "Flex",
                "props": { "direction": "column", "alignItems": "center", "gap": 8 },
                "children": [
                  { "type": "Heading", "props": { "text": "Try our app", "level": "h2", "color": "#141414", "fontSize": "24px", "fontWeight": "800", "textAlign": "center" } },
                  { "type": "Text", "props": { "text": "Manage your account easily.", "color": "#414141", "fontSize": "14px", "fontWeight": "400", "textAlign": "center" } }
                ]
              }
            ]
          },
          {
            "type": "Flex",
            "props": { "direction": "column", "alignItems": "stretch", "paddingTop": "12px", "paddingRight": "24px", "paddingBottom": "32px", "paddingLeft": "24px" },
            "children": [
              { "type": "Button", "props": { "text": "Download app", "href": "#", "backgroundColor": "#E20074", "color": "#ffffff", "fontSize": "16px", "fontWeight": "600", "paddingX": "16px", "paddingY": "14px", "borderRadius": "8px", "fullWidth": true } }
            ]
          }
        ]
      }
    ]
  }
]
${imageSection}${layoutSection}${designCode ? buildDesignCodeSection(designCode) : ''}

Output ONLY the raw JSON array. No markdown fences, no explanation, no comments.`;
}

/**
 * Send a Figma screenshot to Claude Vision and get back a JSON component array.
 */
export async function generateComponentsFromScreenshot(
  screenshotUrl: string,
  imageFills: FigmaImageFill[] = [],
  layout: FigmaLayoutInfo | null = null,
  designCode?: string,
): Promise<ClaudeComponent[]> {
  const anthropic = getClient();

  const prompt = buildComponentPrompt(imageFills, layout, designCode);
  console.log(`[Claude] Prompt length: ${prompt.length} chars, screenshot: ${screenshotUrl.slice(0, 80)}...`);
  console.log(`[Claude] Image fills: ${imageFills.length}, layout: ${layout ? 'yes' : 'no'}, designCode: ${designCode ? `${designCode.length} chars` : 'no'}`);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'url',
              url: screenshotUrl,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  });

  console.log(`[Claude] Response: stop_reason=${message.stop_reason}, usage=${JSON.stringify(message.usage)}`);

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text content');
  }

  let raw = textBlock.text;

  // Strip markdown code fences if Claude included them
  raw = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  raw = raw.trim();

  // Log first/last 200 chars for debugging
  console.log(`[Claude] Raw response length: ${raw.length}`);
  console.log(`[Claude] Raw start: ${raw.slice(0, 200)}`);
  console.log(`[Claude] Raw end: ${raw.slice(-200)}`);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Attempt to extract JSON array from surrounding text
    const arrayStart = raw.indexOf('[');
    const arrayEnd = raw.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd > arrayStart) {
      const extracted = raw.slice(arrayStart, arrayEnd + 1);
      console.log(`[Claude] Attempting JSON extraction from index ${arrayStart} to ${arrayEnd}`);
      try {
        parsed = JSON.parse(extracted);
      } catch {
        console.error('[Claude] Failed to parse extracted JSON:', extracted.slice(0, 500));
        console.error('[Claude] Full raw response:', raw.slice(0, 1000));
        throw new Error('Claude returned invalid JSON for component generation');
      }
    } else {
      console.error('[Claude] No JSON array found in response:', raw.slice(0, 1000));
      throw new Error('Claude returned invalid JSON for component generation');
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Claude response is not an array of components');
  }

  return parsed as ClaudeComponent[];
}

// ---------------------------------------------------------------------------
// Self-correction loop: compare generated HTML against original screenshot
// ---------------------------------------------------------------------------

function buildRefinementPrompt(
  currentHtml: string,
  currentJson: ClaudeComponent[],
): string {
  return `You are an expert frontend developer reviewing the quality of a generated UI.

I'm showing you TWO things:
1. The ORIGINAL Figma design screenshot (the image above)
2. The GENERATED HTML code below (which was produced from the screenshot)

Your task: Compare the generated HTML against the original screenshot and identify ANY layout/alignment differences.

GENERATED HTML:
\`\`\`html
${currentHtml}
\`\`\`

CURRENT JSON COMPONENTS:
\`\`\`json
${JSON.stringify(currentJson, null, 2)}
\`\`\`

COMMON ISSUES TO CHECK:
- Does a content card/panel take the full width in the original but has a fixed pixel maxWidth (e.g. "375px", "327px") in the HTML?
  Fix: Change maxWidth to "100%" — content containers should ALWAYS fill their parent width.
- Is a button too pill-shaped (large borderRadius like 28px+) when it should have slightly rounded corners?
  Fix: Change borderRadius to "8px" or "12px" — most buttons are NOT pills unless the design explicitly shows a capsule shape.
- Is an app icon/logo image too small compared to the original screenshot?
  Fix: Increase width/height to match the proportion in the design (typically 120-180px for app icons in mobile interstitials).
- Is a close/dismiss button (X) aligned to the RIGHT side? In the original design it's usually top-right.
  Fix: The parent Flex needs direction "row" and justifyContent "flex-end"
- Are images/logos CENTERED horizontally? Check if they appear centered in the screenshot.
  Fix: The parent Flex needs alignItems "center"
- Is an image wrapped in a Flex with a backgroundColor that duplicates the image's own background?
  Fix: REMOVE the backgroundColor from the wrapper Flex — the image PNG already contains its background.
- Does a button span the full width in the original design but not in the generated HTML?
  Fix: Set fullWidth: true on the Button AND set the parent Flex alignItems to "stretch".
- Is text centered when it should be? Check textAlign and parent alignItems.
- Are elements properly spaced? Compare gaps and padding.
- Is the overall vertical/horizontal flow correct?
- Are Flex containers using the right justifyContent and alignItems?

IMPORTANT RULES:
- Do NOT change text content — only fix layout, alignment, structure, and button width.
- Do NOT change image URLs.
- Keep ALL existing components — do not remove anything.
- You may modify Flex props: direction, wrap, alignItems, justifyContent, gap, padding, maxWidth.
- You may change any maxWidth from a fixed pixel value to "100%".
- You may remove unnecessary backgroundColor from Flex wrappers around images.
- You may change Button fullWidth between true/false to match the design.
- You may change a Flex to a Grid (or vice versa) if the layout requires it.

If the layout matches the original screenshot perfectly, respond with EXACTLY:
NO_CHANGES

If there are differences, output the CORRECTED full JSON array (same format as the input).
Output ONLY the raw JSON array or "NO_CHANGES". No markdown fences, no explanation.`;
}

/**
 * Compare generated components against the original screenshot and fix alignment issues.
 * Returns corrected components, or null if no changes are needed.
 */
async function refineComponents(
  screenshotUrl: string,
  currentHtml: string,
  currentJson: ClaudeComponent[],
): Promise<ClaudeComponent[] | null> {
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'url',
              url: screenshotUrl,
            },
          },
          {
            type: 'text',
            text: buildRefinementPrompt(currentHtml, currentJson),
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    console.warn('[Refine] Claude returned no text content');
    return null;
  }

  let raw = textBlock.text.trim();

  // Strip markdown code fences if Claude included them
  raw = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  raw = raw.trim();

  if (raw === 'NO_CHANGES' || raw.startsWith('NO_CHANGES')) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn('[Refine] Failed to parse refinement JSON, skipping:', raw.slice(0, 200));
    return null;
  }

  if (!Array.isArray(parsed)) {
    console.warn('[Refine] Refinement response is not an array, skipping');
    return null;
  }

  return parsed as ClaudeComponent[];
}

/**
 * Generate components from a screenshot, then iteratively refine them by comparing
 * the rendered HTML against the original screenshot. Up to `maxRefinements` rounds.
 */
export async function generateAndRefineComponents(
  screenshotUrl: string,
  imageFills: FigmaImageFill[] = [],
  layout: FigmaLayoutInfo | null = null,
  designCode?: string,
  maxRefinements: number = 2,
  renderToHtml: (components: ClaudeComponent[]) => string = componentsToHtmlDefault,
): Promise<ClaudeComponent[]> {
  // Step 1: Initial generation
  let components = await generateComponentsFromScreenshot(
    screenshotUrl,
    imageFills,
    layout,
    designCode,
  );

  // Step 2: Iterative refinement loop
  for (let i = 0; i < maxRefinements; i++) {
    const html = renderToHtml(components);
    console.log(`[Refine] Iteration ${i + 1}/${maxRefinements} — comparing HTML (${html.length} chars) against screenshot`);

    const refined = await refineComponents(screenshotUrl, html, components);

    if (!refined) {
      console.log(`[Refine] Iteration ${i + 1}: No changes needed — layout matches screenshot`);
      break;
    }

    console.log(`[Refine] Iteration ${i + 1}: Got corrected components (${refined.length} root elements)`);
    components = refined;
  }

  return components;
}

/**
 * Default HTML renderer for refinement (imported here to avoid circular deps).
 * The actual renderer is passed in from the caller, but this provides a fallback.
 */
function componentsToHtmlDefault(components: ClaudeComponent[]): string {
  // Minimal inline renderer matching puck-components.ts logic
  return components.map((c) => componentToHtmlInline(c)).join('\n');
}

function componentToHtmlInline(comp: ClaudeComponent): string {
  const p = comp.props;
  switch (comp.type) {
    case 'Flex': {
      const style = [
        'display:flex',
        `flex-direction:${p.direction || 'column'}`,
        p.wrap ? `flex-wrap:${p.wrap}` : '',
        `align-items:${p.alignItems || 'stretch'}`,
        `justify-content:${p.justifyContent || 'flex-start'}`,
        `gap:${p.gap != null ? `${p.gap}px` : '0px'}`,
        `padding:${p.paddingTop || '0px'} ${p.paddingRight || '0px'} ${p.paddingBottom || '0px'} ${p.paddingLeft || '0px'}`,
        p.backgroundColor ? `background-color:${p.backgroundColor}` : '',
        `max-width:${p.maxWidth || '100%'}`,
        `border-radius:${p.borderRadius || '0px'}`,
        'width:100%',
        'box-sizing:border-box',
      ].filter(Boolean).join(';');
      const children = comp.children ? comp.children.map(componentToHtmlInline).join('\n') : '';
      return `<div style="${style}">\n${children}\n</div>`;
    }
    case 'Grid': {
      const cols = p.numColumns || 2;
      const style = [
        'display:grid',
        `grid-template-columns:repeat(${cols}, 1fr)`,
        `gap:${p.gap != null ? `${p.gap}px` : '16px'}`,
        `align-items:${p.alignItems || 'stretch'}`,
        `padding:${p.paddingTop || '0px'} ${p.paddingRight || '0px'} ${p.paddingBottom || '0px'} ${p.paddingLeft || '0px'}`,
        p.backgroundColor ? `background-color:${p.backgroundColor}` : '',
        `max-width:${p.maxWidth || '100%'}`,
        `border-radius:${p.borderRadius || '0px'}`,
        'width:100%',
        'box-sizing:border-box',
      ].filter(Boolean).join(';');
      const children = comp.children ? comp.children.map(componentToHtmlInline).join('\n') : '';
      return `<div style="${style}">\n${children}\n</div>`;
    }
    case 'Space': {
      const dir = p.direction || 'vertical';
      const size = p.size || '24px';
      if (dir === 'horizontal') return `<div style="width:${size};height:0px"></div>`;
      return `<div style="height:${size}"></div>`;
    }
    case 'Heading': {
      const tag = p.level || 'h2';
      const style = `color:${p.color || '#000'};font-size:${p.fontSize || '24px'};font-weight:${p.fontWeight || '700'};text-align:${p.textAlign || 'left'};margin:0`;
      return `<${tag} style="${style}">${p.text || ''}</${tag}>`;
    }
    case 'Text': {
      const style = `color:${p.color || '#333'};font-size:${p.fontSize || '16px'};font-weight:${p.fontWeight || '400'};text-align:${p.textAlign || 'left'};margin:0`;
      return `<p style="${style}">${p.text || ''}</p>`;
    }
    case 'Image': {
      const style = `width:${p.width || '100%'};height:${p.height || 'auto'};object-fit:${p.objectFit || 'cover'};border-radius:${p.borderRadius || '0px'};display:block`;
      return `<img src="${p.src || ''}" alt="${p.alt || ''}" style="${style}" />`;
    }
    case 'Button': {
      const style = [
        `display:${p.fullWidth ? 'block' : 'inline-block'}`,
        `background-color:${p.backgroundColor || '#2563eb'}`,
        `color:${p.color || '#fff'}`,
        `font-size:${p.fontSize || '16px'}`,
        `font-weight:${p.fontWeight || '600'}`,
        `padding:${p.paddingY || '12px'} ${p.paddingX || '24px'}`,
        `border-radius:${p.borderRadius || '8px'}`,
        'text-decoration:none',
        'text-align:center',
        p.fullWidth ? 'width:100%' : '',
        'box-sizing:border-box',
      ].filter(Boolean).join(';');
      return `<a href="${p.href || '#'}" style="${style}">${p.text || ''}</a>`;
    }
    case 'Divider':
      return `<hr style="border:none;border-top:${p.thickness || '1px'} solid ${p.color || '#e5e7eb'};margin:0;width:100%" />`;
    default:
      return '';
  }
}
