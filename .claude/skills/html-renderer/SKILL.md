---
name: html-renderer
description: Creates html and CSS from figma designs
context: fork
allowed-tools: Read, Grep, Glob, Write
---

The user will be providing a figma node id. You will be fetching the figma react using the get_design_context on the figma MCP. Then, call `npm run fetch-figma <fileKey> <nodeId> screenshots/<folder_name>/original.png` to save a local screnshot of the node

Rewrite the returned output to be GrapesJS friendly and responsive, replacing ALL existing classes with Tailwind v4 utility classes only.

You will write the output with html and css in a single file under the html/ folder. It will go top level into this repository with any name you see fit, as long as it is unique.

Rules:

1) Keep the same DOM structure and all data-* attributes exactly as they are.
2) Do not add custom CSS, <style> tags, inline styles, or external fonts. Use Tailwind classes for typography and colors.
3) The final output MUST include a <body> wrapper.
4) IMPORTANT: Replace absolute positioning with a responsive layout using flex and spacing utilities. At the end there should be no absolute positioning
5) Make the card responsive.
6) Use Tailwind font and color tokens.
7) The button should be accessible, and styled only with Tailwind utilities (hover and focus states included).
8) After creating the HTML file, verify your work by:
    - Compare the rendered screenshot under screenshots/<folder_name>/<output_file>.png  screenshots/<folder_name>/original.png
    - If there are visual discrepancies, iterate on the HTML/CSS to match the design more closely
    - Pay special attention to: spacing, colors, font sizes, alignment, and how elements wrap/stack on
      mobile
    - Repeat until the rendered output matches the Figma design. And dont forget to use a responsive layout