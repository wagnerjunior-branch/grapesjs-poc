import Anthropic from '@anthropic-ai/sdk';
import type { FigmaImageFill } from './figma-api';

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

function buildPrompt(imageFills: FigmaImageFill[]): string {
  let imageSection = '';

  if (imageFills.length > 0) {
    const imageList = imageFills
      .map(
        (img) =>
          `- "${img.nodeName}" (${img.width}x${img.height}): ${img.imageUrl}`
      )
      .join('\n');

    imageSection = `

IMPORTANT — Real image assets extracted from this Figma design:
${imageList}

You MUST use these actual image URLs in the corresponding <img> tags. Match each image to its position in the design by name and size. Do NOT use placeholder URLs.`;
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
8) Match font sizes, font weights, spacing, and padding as closely as possible.
9) Make the component responsive and mobile-friendly.${imageSection}

Output ONLY the raw <body>...</body> HTML. No markdown fences, no explanation, no code comments.`;
}

/**
 * Send a Figma screenshot to Claude Vision and get back HTML.
 */
export async function generateHtmlFromScreenshot(
  screenshotUrl: string,
  imageFills: FigmaImageFill[] = []
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
            text: buildPrompt(imageFills),
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
