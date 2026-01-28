# GrapeJS POC - Figma to HTML Editor

A Next.js application that converts Figma designs to editable HTML templates using a form-based editor interface. Features integration with Figma MCP (Model Context Protocol) via Claude Code for automated design-to-HTML conversion.

## Features

- **Figma Integration**: Convert Figma designs to HTML using Figma MCP
- **Form-Based Editor**: Simple form interface for editing HTML content
- **GrapeJS Editor**: Visual drag-and-drop editor for advanced users
- **Live Preview**: Real-time preview of HTML changes
- **Export Options**: Clean HTML (production) or annotated HTML (re-editable)
- **Template Loading**: Load existing HTML templates from `/public` directory

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Try the Demo

Visit the demo banner (already processed from Figma):
```
http://localhost:3000/template-editor?demo=figma-banner
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Home page with navigation |
| `/figma-editor` | Figma URL input and template loading |
| `/template-editor` | Form-based HTML editor |
| `/editor` | GrapeJS visual editor |

## Figma Workflow

### Processing Figma Designs

**Step 1:** Get your Figma URL (must include `node-id` parameter)
```
https://www.figma.com/design/{fileKey}/{fileName}?node-id={nodeId}
```

**Step 2:** Go to `/figma-editor` and click "Process with Claude Code"

**Step 3:** Claude Code automatically:
- Invokes the `/html-renderer` skill
- Calls Figma MCP `get_design_context`
- Converts React code to clean HTML
- Saves to `html/` directory
- Provides a link to the form editor

**Step 4:** Edit content via the form editor and export

### Loading Existing Templates

Visit `/figma-editor` and click **"Load Banner from /public/banner-standard-right.html"** to load a pre-existing template into the form editor.

## Form Editor Features

The form editor automatically detects and creates form fields for:

- **Headings** (h1-h6) → Text input
- **Paragraphs** → Textarea
- **Buttons** → Text input with character limits
- **Links** → Text input
- **Images** → URL input with alt text field

### Editing

- Changes apply on blur (when you leave a field)
- Character counters show remaining space
- Live preview updates automatically
- Zoom controls (50% - 200%)

### Exporting

- **Clean HTML**: Production-ready, no data attributes
- **Annotated HTML**: Includes `data-editable-id` for re-editing
- **Copy to Clipboard**: Quick copy functionality

## Project Structure

```
/app
├── figma-editor/          # Figma workflow entry point
├── template-editor/       # Form-based editor
├── editor/                # GrapeJS editor
├── components/            # React components
│   ├── FigmaProcessor.tsx
│   ├── TemplateEditorClient.tsx
│   ├── TemplateFormEditor.tsx
│   └── TemplatePreview.tsx
├── lib/                   # Utilities
│   ├── figma-utils.ts     # URL parsing, React-to-HTML conversion
│   ├── html-parser.ts     # Element detection
│   └── template-editor.ts # Form schema generation
└── api/                   # API routes

/html                      # Generated HTML files
/public                    # Static assets and templates
/.claude/skills/           # Claude Code skills
  └── html-renderer/       # Figma MCP integration skill
```

## Technical Details

### Figma MCP Integration

The project uses Claude Code's Figma MCP integration to:
1. Fetch design context from Figma
2. Receive React/JSX code with Tailwind CSS
3. Convert to clean HTML
4. Remove absolute positioning (use flexbox)
5. Make responsive with Tailwind classes

### HTML Processing

The `html-parser.ts` utility:
- Detects editable elements using heuristics
- Injects `data-editable-id` attributes
- Groups elements by page sections
- Generates form schemas with validation

### State Management

- `originalHtml`: Unmodified source
- `annotatedHtml`: With `data-editable-id` attributes
- `currentHtml`: Current edited version
- Updates flow through React state to iframe preview

## Documentation

- **[TEMPLATE_EDITOR_GUIDE.md](./TEMPLATE_EDITOR_GUIDE.md)** - Detailed technical guide for the form editor

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Editor**: GrapeJS
- **Integration**: Figma MCP via Claude Code
- **Database**: Prisma (configured, not yet used)

## Development

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

## Notes

- The Figma MCP integration requires Claude Code to be running
- Generated HTML files are saved to the `/html` directory
- Image URLs from Figma CDN have a 7-day expiry
- The form editor preserves all Tailwind classes and styling

## License

This is a proof-of-concept project.
