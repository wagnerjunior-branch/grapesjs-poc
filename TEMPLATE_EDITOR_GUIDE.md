# Form-Based Template Editor - Implementation Guide

## Overview

A new form-based HTML template editor has been added to your Next.js project as a simpler alternative to the GrapeJS editor. This editor is designed for non-technical users who want to edit HTML templates using a familiar form interface.

## Architecture

### Route Structure

```
/template-editor
├── page.tsx                          # Server component - loads template data
└── /components
    ├── TemplateEditorClient.tsx      # Main client component with split-pane UI
    ├── TemplateFormEditor.tsx        # Dynamic form generator
    └── TemplatePreview.tsx           # Live HTML preview
```

### Utilities

```
/app/lib
├── html-parser.ts                    # HTML analysis and element detection
└── template-editor.ts                # Form schema generation and validation
```

## Key Features

### 1. Automatic Element Detection

The `html-parser.ts` utility automatically analyzes HTML and identifies user-editable elements:

- **Headings** (h1-h6)
- **Button text**
- **Link text**
- **Short paragraph/span text**
- **Images** (both `src` and `alt` attributes)

Each detected element receives:
- A unique ID (injected as `data-editable-id`)
- A human-readable label
- A CSS selector and XPath for targeting
- Context information (from parent elements or nearby headings)

### 2. Dynamic Form Generation

Based on detected elements, the system generates a form with:

- **Logical grouping** by page sections
- **Appropriate input types**:
  - Text input for short content (< 80 chars)
  - Textarea for longer content
  - URL input for image sources
- **Validation**:
  - Max length checks
  - URL format validation
  - Character counting
- **Help text** for guidance

### 3. Live Preview

- HTML renders in an isolated iframe for security
- Updates on form field blur (not on every keystroke)
- Zoom controls (50% - 200%)
- Includes Tailwind CSS CDN for proper styling
- Highlights editable elements on hover (for debugging)

### 4. Export Options

Two export modes:

1. **Clean HTML**: Production-ready, no `data-editable-id` attributes
2. **Annotated HTML**: Includes `data-editable-id` for re-editing later

Additional features:
- Download as `.html` file
- Copy to clipboard

## How to Use

### Access the Editor

1. **From home page**: Click "Form Editor (Demo)" button in the header
2. **Direct URL**: Navigate to `/template-editor?demo=true`
3. **Custom HTML**: Navigate to `/template-editor?html=<encoded>`

### Using the Demo

The demo loads the Figma banner template you created earlier. You can:

1. Edit the heading text
2. Modify the description
3. Change button text
4. Update image URLs and alt text
5. See changes live in the preview pane
6. Export the modified HTML

### Loading Custom Templates

To load a custom HTML template:

1. Click "Import HTML" in the top bar
2. Paste your HTML code
3. The editor will analyze it and generate a form
4. Start editing!

### URL Parameters

- `?demo=true` - Load the demo banner template
- `?html=<encoded>` - Load encoded HTML from URL

## Technical Implementation

### Element Detection Algorithm

The parser (`html-parser.ts`) uses these strategies:

1. **Query specific elements**: `h1-h6`, `button`, `a[href]`, `p`, `span`, `div`, `img`
2. **Filter by content**: Skip empty elements, elements with nested blocks
3. **Text length heuristics**:
   - Skip very short text (< 3 chars)
   - Skip very long text (> 500 chars)
   - Use textarea for text > 80 chars
4. **Context extraction**:
   - Check for `data-name` attributes (Figma convention)
   - Look for nearby headings
   - Use semantic HTML elements (section, article, nav)
5. **Inject stable IDs**: Add `data-editable-id` attributes for targeting

### Form Schema Generation

The `template-editor.ts` utility:

1. Converts detected elements to form fields
2. Determines appropriate input types
3. Sets validation rules and max lengths
4. Adds helpful placeholder text
5. Groups fields by context/section

### State Management

The `TemplateEditorClient` component maintains:

- `originalHtml`: The unmodified source HTML
- `annotatedHtml`: HTML with `data-editable-id` attributes
- `currentHtml`: The current edited version
- `schema`: Generated form structure
- `fieldValues`: Current form field values

Updates flow:
1. User changes form field
2. `fieldValues` state updates
3. On blur, `currentHtml` updates via `applyChangesToHtml()`
4. Preview iframe re-renders with new content

### Performance Optimizations

- Form updates only apply to preview on blur (not every keystroke)
- Iframe uses `srcdoc` for faster loading
- Validation runs only on blur, not on change
- Sections collapsed by default (can be enhanced with accordion)

## File Structure Summary

```
/app
├── template-editor/
│   └── page.tsx                      # Route entry point (server component)
├── components/
│   ├── BannerList.tsx               # Updated with link to form editor
│   ├── TemplateEditorClient.tsx     # Main editor (client component)
│   ├── TemplateFormEditor.tsx       # Form generator (client component)
│   └── TemplatePreview.tsx          # Preview iframe (client component)
└── lib/
    ├── html-parser.ts               # Element detection utility
    └── template-editor.ts           # Form schema utility

/public
└── banner-standard-right.html       # Demo template
```

## Extension Points

### 1. Add More Element Types

In `html-parser.ts`, add detection logic for:
- Form inputs (`input`, `select`, `textarea`)
- Lists (`ul`, `ol`, `li`)
- Tables (`table`, `th`, `td`)
- Custom components with specific attributes

### 2. Enhance Grouping

Improve section detection in `groupElementsBySection()`:
- Use semantic HTML better (sections, articles)
- Detect common layout patterns (header, main, footer)
- Allow custom grouping rules

### 3. Add Rich Text Editing

Replace textarea with a rich text editor:
- TinyMCE
- Quill
- Slate

### 4. Implement Saving

Add API routes to persist templates:

```typescript
// /app/api/templates/route.ts
export async function POST(request: NextRequest) {
  const { name, html, schema } = await request.json();
  const template = await prisma.template.create({
    data: { name, html, schema },
  });
  return NextResponse.json(template);
}
```

### 5. Add AI Enhancement

Integrate AI for:
- Better label generation
- Content suggestions
- Automatic image alt text generation
- Accessibility improvements

### 6. Template Library

Create a route to browse and select templates:

```
/templates
├── page.tsx                          # Template library
└── [id]/
    └── page.tsx                      # Edit specific template
```

## Benefits Over GrapeJS Editor

1. **Simpler UX**: Form-based editing is familiar to all users
2. **Faster**: No complex editor initialization
3. **Focused**: Only editable content shown, no visual noise
4. **Validation**: Built-in validation prevents errors
5. **Predictable**: Changes apply exactly as expected

## Use Cases

- **Marketing teams**: Edit campaign banners without developer help
- **Content teams**: Update landing page copy
- **Non-technical users**: Modify email templates
- **Quick edits**: Change text/images without full editor overhead
- **Batch updates**: Edit multiple elements at once

## Testing

Try the editor with different HTML inputs:

1. **Simple HTML**: Single heading and paragraph
2. **Complex HTML**: Multi-section layout with images
3. **Tailwind classes**: Verify styling is preserved
4. **Figma exports**: Test with Figma-to-HTML output
5. **Edge cases**: Empty elements, nested structures, special characters

## Next Steps

1. **Add template persistence**: Implement save/load functionality
2. **Create template library**: Browse and select from saved templates
3. **Add image upload**: Instead of URLs, allow file uploads
4. **Enhance validation**: Add more validation rules
5. **Add undo/redo**: Track edit history
6. **Mobile responsive**: Make the editor mobile-friendly
7. **Keyboard shortcuts**: Add power-user features

## Support

For questions or issues:
- Check the code comments in each utility file
- Review the TypeScript interfaces for data structures
- Test with the demo template first
- Inspect the generated `data-editable-id` attributes in the preview

---

**Built with**: Next.js 16, TypeScript, Tailwind CSS v4

**Compatible with**: GrapeJS editor, Figma-to-HTML pipeline
