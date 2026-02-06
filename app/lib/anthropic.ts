import Anthropic from '@anthropic-ai/sdk';

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

const FIGMA_TO_PUCK_PROMPT = `You are a frontend developer. You are given a screenshot of a Figma design component.

Your task: Generate the HTML that faithfully reproduces this design, following these rules:

1) Use Tailwind v4 utility classes ONLY. No custom CSS, <style> tags, inline styles, or external fonts.
2) The output MUST be a single <body> element containing the full component markup.
3) Replace absolute positioning with a responsive layout using flex and spacing utilities.
4) Make the component responsive — it should look good on mobile and desktop.
5) Use Tailwind font-size, font-weight, and color utility tokens for all typography.
6) Buttons must be accessible with hover and focus states (e.g. hover:bg-*, focus:ring-*).
7) Include data-* attributes where semantically appropriate (e.g. data-component="card").
8) For any images in the design, use <img> tags with a descriptive alt attribute and a placeholder src="https://placehold.co/WIDTHxHEIGHT" with appropriate dimensions.
9) Output ONLY the raw HTML. No markdown fences, no explanation, no comments outside the HTML.

Output the <body>...</body> element and nothing else.`;

/**
 * Send a Figma screenshot to Claude Vision and get back HTML.
 */
export async function generateHtmlFromScreenshot(
  screenshotUrl: string
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
            text: FIGMA_TO_PUCK_PROMPT,
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
