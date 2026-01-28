# Figma to Form Editor - Complete Workflow Guide

## Overview

This guide explains the integrated workflow for converting Figma designs directly into editable HTML templates using a simple form interface.

## Architecture

### Complete Flow

```
1. User enters Figma URL
   ↓
2. System parses URL (extracts fileKey & nodeId)
   ↓
3. Claude Code calls Figma MCP get_design_context
   ↓
4. React/HTML code is generated with Tailwind CSS
   ↓
5. HTML is saved to html/ directory
   ↓
6. Form editor analyzes HTML for editable elements
   ↓
7. User edits content via dynamic form
   ↓
8. Live preview updates on blur
   ↓
9. Export modified HTML
```

## Routes

### `/figma-editor` (NEW)
- **Purpose**: Figma-to-Form-Editor workflow entry point
- **Stage 1**: Figma URL input
- **Stage 2**: Form-based content editor with live preview

### `/template-editor`
- **Purpose**: Direct HTML template editing (existing)
- **Supports**:
  - `?demo=true` - Load demo template
  - `?html=<encoded>` - Load custom HTML

## User Flow

### Step 1: Access the Figma Editor

Navigate to: `http://localhost:3000/figma-editor`

Or click **"Figma to Editor"** button on the home page.

### Step 2: Enter Figma URL

1. Open your Figma file
2. Select a frame, component, or section you want to convert
3. Copy the URL from your browser address bar
4. Paste it into the input field

**Expected URL format:**
```
https://www.figma.com/design/{fileKey}/{fileName}?node-id={nodeId}&m=dev
```

**Example:**
```
https://www.figma.com/design/uXhPriLGgHXFqLIZw4xx3T/Banners-Exploration?node-id=3556-11384&m=dev
```

### Step 3: Processing

When you submit the URL:

1. **Client-side validation** checks URL format
2. **Server action** parses fileKey and nodeId
3. **Processing indicator** shows "Processing Figma design..."
4. **Claude Code automatically**:
   - Calls Figma MCP `get_design_context`
   - Converts React code to clean HTML
   - Removes absolute positioning (uses flexbox)
   - Applies Tailwind CSS v4 classes
   - Saves HTML to `html/` directory
5. **Form editor loads** with generated HTML

### Step 4: Edit Content

The form editor automatically detects editable elements:

- **Headings** (h1-h6) → Text input
- **Button text** → Text input with max length
- **Link text** → Text input
- **Paragraphs** → Textarea (for longer content)
- **Images**:
  - `src` attribute → URL input with validation
  - `alt` attribute → Text input

**Features**:
- Grouped by page sections
- Character counters
- Validation (URL format, max length)
- Help text for guidance

### Step 5: Live Preview

- **Right pane** shows rendered HTML
- **Updates on blur** (not every keystroke for performance)
- **Zoom controls** (50% - 200%)
- **Responsive** preview

### Step 6: Export

Click **"Export"** button and choose:

1. **Clean HTML** - Production-ready, no data attributes
2. **Annotated HTML** - Includes `data-editable-id` for re-editing

Or use **"Copy HTML"** button for quick clipboard copy.

## Technical Implementation

### Components

```
/app
├── figma-editor/
│   └── page.tsx                      # Entry point (shows Figma input)
├── template-editor/
│   └── page.tsx                      # Alternative entry (manual HTML)
├── components/
│   ├── FigmaUrlInput.tsx            # Stage 1: URL input & validation
│   ├── TemplateEditorClient.tsx     # Stage 2: Form editor coordinator
│   ├── TemplateFormEditor.tsx       # Dynamic form generator
│   └── TemplatePreview.tsx          # Live HTML preview
└── lib/
    ├── figma-utils.ts               # URL parsing & validation
    ├── figma-actions.ts             # Server actions (parse, save, read)
    ├── html-parser.ts               # Element detection
    └── template-editor.ts           # Form schema generation
```

### Server Actions

**File**: `app/lib/figma-actions.ts`

```typescript
// Parse Figma URL
processFigmaUrl(url: string): Promise<FigmaProcessResult>

// Save HTML to html/ directory
saveHtmlToFile(html: string, fileKey: string, nodeId: string)

// Read HTML from html/ directory
readHtmlFile(filename: string)

// Process React code from Figma MCP
processReactCode(reactCode: string, fileKey: string, nodeId: string)

// List all HTML files
listHtmlFiles()
```

### Figma URL Utilities

**File**: `app/lib/figma-utils.ts`

```typescript
// Parse and validate Figma URLs
parseFigmaUrl(url: string): FigmaUrlParseResult

// Validate URL format
validateFigmaUrl(url: string): { valid: boolean; error?: string }

// Generate unique filenames
generateHtmlFilename(fileKey: string, nodeId: string): string

// Convert React JSX to HTML
convertReactToHtml(reactCode: string): string

// Extract image constants from React code
extractImageConstants(reactCode: string): Record<string, string>

// Wrap content in HTML document
wrapInHtmlDocument(bodyContent: string): string
```

## Figma MCP Integration

### Available MCP Tools

The system uses these Figma MCP functions (available via Claude Code):

```typescript
// Get design context (React/HTML code)
mcp__plugin_figma_figma__get_design_context({
  fileKey: string,
  nodeId: string,
  clientLanguages: 'html,css',
  clientFrameworks: 'tailwind'
})

// Get screenshot
mcp__plugin_figma_figma__get_screenshot({
  fileKey: string,
  nodeId: string
})

// Get metadata (structure overview)
mcp__plugin_figma_figma__get_metadata({
  fileKey: string,
  nodeId: string
})
```

### HTML Generation Process

When Claude Code processes a Figma URL:

1. **Extract fileKey and nodeId** from URL
2. **Call MCP** with:
   ```typescript
   {
     fileKey: "uXhPriLGgHXFqLIZw4xx3T",
     nodeId: "3556:11384",
     clientLanguages: "html,css",
     clientFrameworks: "tailwind"
   }
   ```
3. **Receive React code** with Tailwind classes
4. **Convert to clean HTML**:
   - Remove React syntax (`export`, `function`, `return`)
   - Convert `className` to `class`
   - Replace `{variable}` with actual values
   - Extract image URLs from constants
5. **Apply transformations**:
   - Remove absolute positioning
   - Use flexbox/grid for layout
   - Ensure responsiveness
   - Keep all `data-*` attributes
6. **Wrap in HTML document**:
   - Add DOCTYPE
   - Include Tailwind CDN
   - Add IBM Plex Sans font
7. **Save to** `html/figma-{fileKey}-{nodeId}-{timestamp}.html`

### Output Structure

Generated HTML files follow this structure:

```html
<!DOCTYPE html>
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
  <!-- Figma design converted to HTML with Tailwind classes -->
  <div class="..." data-name="..." data-node-id="...">
    <!-- Content with preserved Figma attributes -->
  </div>
</body>
</html>
```

## File Locations

### Generated Files

```
/html/
├── figma-{fileKey}-{nodeId}-{timestamp}.html
└── ... (other generated files)

/screenshots/
└── figma-{fileKey}-{nodeId}-{timestamp}/
    ├── original.png        (from Figma)
    └── rendered.png        (after HTML rendering)
```

### Source Files

```
/app/lib/
├── figma-utils.ts          (URL parsing, React-to-HTML conversion)
├── figma-actions.ts        (Server actions for file I/O)
├── html-parser.ts          (Element detection for form generation)
└── template-editor.ts      (Form schema generation)

/app/components/
├── FigmaUrlInput.tsx       (Stage 1: URL input UI)
├── TemplateEditorClient.tsx (Stage coordinator)
├── TemplateFormEditor.tsx  (Dynamic form)
└── TemplatePreview.tsx     (Live preview iframe)

/app/figma-editor/
└── page.tsx                (Route entry point)
```

## URL Format Reference

### Valid Formats

1. **Standard design URL**:
   ```
   https://www.figma.com/design/{fileKey}/{fileName}?node-id={nodeId}
   ```

2. **Branch design URL**:
   ```
   https://www.figma.com/design/{fileKey}/branch/{branchKey}/{fileName}?node-id={nodeId}
   ```

3. **Legacy file URL**:
   ```
   https://www.figma.com/file/{fileKey}/{fileName}?node-id={nodeId}
   ```

### Node ID Format

Figma URLs use hyphens in node IDs: `node-id=1-2`

The system automatically converts to API format: `nodeId: "1:2"`

### Extracting Node IDs

1. Select element in Figma
2. Browser URL updates with `?node-id=...`
3. Copy entire URL
4. Paste into editor

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "URL must be from figma.com" | Non-Figma URL | Use a valid Figma URL |
| "URL must include node-id" | Missing query parameter | Select a specific element in Figma |
| "Invalid Figma URL format" | Malformed URL | Check URL structure |
| "Failed to process Figma URL" | Server error | Check logs, retry |

### Debugging

1. **Check Console**: Open browser dev tools → Console tab
2. **Verify URL**: Ensure node-id is present
3. **Check Network**: Look for API call failures
4. **Inspect HTML**: Check `html/` directory for output files

## Best Practices

### Selecting Figma Elements

1. **Choose complete frames**: Not individual text layers
2. **Avoid complex nesting**: Simpler structures work better
3. **Use auto-layout**: Converts to flexbox cleanly
4. **Name your layers**: Improves form labels

### Editing Content

1. **Edit on blur**: Changes apply when you leave field
2. **Watch character count**: Respect max length limits
3. **Validate URLs**: Use full https:// URLs for images
4. **Preview frequently**: Check layout integrity

### Exporting

1. **Clean HTML for production**: No data attributes
2. **Annotated HTML for iteration**: Keep data attributes
3. **Test exported HTML**: Verify it works standalone
4. **Save incrementally**: Export after major changes

## Troubleshooting

### HTML Not Generating

1. **Check Figma URL**: Must include `node-id` parameter
2. **Verify permissions**: Ensure file is accessible
3. **Check Claude Code**: Figma MCP must be enabled
4. **Look for errors**: Check console and terminal logs

### Form Not Showing

1. **Check HTML validity**: Must be valid HTML structure
2. **Verify elements**: Need headings/buttons/text to detect
3. **Inspect parser output**: Check console for parsed elements
4. **Review structure**: Ensure no empty or broken elements

### Preview Not Updating

1. **Blur the field**: Changes apply on blur, not keystroke
2. **Check console**: Look for update errors
3. **Verify selector**: Element selector must be valid
4. **Refresh preview**: Use browser refresh if needed

## Integration with Existing Editors

### GrapeJS Editor

- Complements the visual GrapeJS editor
- Provides simpler content-only editing
- Can import Figma designs directly
- Exports compatible HTML

### Template Editor

- Shares same detection and form logic
- Can load demo templates or custom HTML
- Figma editor is specialized entry point
- Both use same preview and export system

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Tab | Move to next field |
| Shift+Tab | Move to previous field |
| Ctrl/Cmd+S | Save (planned feature) |
| Ctrl/Cmd+E | Export |
| Esc | Close modal |

## Future Enhancements

### Planned Features

1. **Auto-save**: Persist changes to database
2. **Version history**: Track and restore changes
3. **Batch import**: Process multiple Figma nodes
4. **AI suggestions**: Improve text content automatically
5. **Template library**: Save and browse converted designs
6. **Collaboration**: Share templates with team
7. **Custom mappings**: Define custom editable elements
8. **Rich text editing**: TinyMCE/Quill integration

### Possible Improvements

- Real-time preview updates (currently onBlur)
- Image upload instead of URLs
- Responsive breakpoint preview
- Accessibility checker
- SEO metadata editor
- A/B testing variants

## API Reference

### POST /api/figma-to-html

**Request:**
```json
{
  "url": "https://www.figma.com/design/..."
}
```

**Response:**
```json
{
  "success": boolean,
  "fileKey": string,
  "nodeId": string,
  "error"?: string
}
```

Note: Currently returns parsed data only. Actual HTML generation happens via Claude Code.

## Examples

### Example 1: Banner Design

**Input URL:**
```
https://www.figma.com/design/uXhPriLGgHXFqLIZw4xx3T/Banners-Exploration?node-id=3556-11384
```

**Generated HTML:**
- Responsive banner with image, title, description, and CTA button
- Editable: Heading, description, button text, image URL
- Output: `html/figma-uXhPriLGgHXFqLIZw4xx3T-3556-11384-{timestamp}.html`

### Example 2: Card Component

**Input URL:**
```
https://www.figma.com/design/abc123/Cards?node-id=10-20
```

**Generated Elements:**
- Card title (h3) → Text input
- Card description (p) → Textarea
- CTA button → Text input
- Card image → URL input

## Support & Resources

### Documentation

- [Template Editor Guide](./TEMPLATE_EDITOR_GUIDE.md) - Form editor documentation
- [Figma MCP Docs](https://github.com/anthropics/anthropic-quickstarts/tree/main/figma-mcp) - Official MCP docs

### Getting Help

1. Check console for errors
2. Review this guide
3. Test with demo template first
4. Report issues on GitHub

---

**Built with**: Next.js 16, TypeScript, Tailwind CSS v4, Figma MCP, Claude Code

**Compatible with**: GrapeJS editor, Manual template editor
