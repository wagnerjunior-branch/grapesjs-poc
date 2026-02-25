# Design: Braze-Style Custom GrapeJS Editor

**Date:** 2026-02-25
**Goal:** Replace the current Studio SDK editor with a fully custom UI built on core GrapesJS + @grapesjs/react, replicating Braze's editor interface with high fidelity.

## Approach

Migrate from `@grapesjs/studio-sdk` to core `grapesjs` + `@grapesjs/react`. Use the `<Canvas/>` component to disable the default GrapeJS UI entirely, then build custom React components for every panel (sidebar, toolbar, top nav).

## Migration: Dependencies

**Remove:**
- `@grapesjs/studio-sdk`
- `@grapesjs/studio-sdk-plugins`

**Install:**
- `@grapesjs/react` (React wrapper for core grapesjs)

**Keep:**
- `grapesjs` (already installed)

## UI Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Compose │ Settings │ Preview    Campaign Name    Cancel Done│  ← TopNav (visual only)
├─────────────────────────────────────────────────────────────┤
│ Style│Undo Redo│📱💻│Canvas Size│Outlines│ Personalization… │  ← Toolbar
├──────────┬──────────────────────────────────────────────────┤
│ Rows     │                                                  │
│ [1][2][3]│                                                  │
│──────────│              Canvas (GrapeJS)                    │
│ Blocks   │                                                  │
│ Title    │          (banner being edited)                   │
│ Paragraph│                                                  │
│ Button   │                                                  │
│ Image    │                                                  │
│ Link     │                                                  │
│ Spacer   │                                                  │
│ Custom   │                                                  │
│ Phone    │                                                  │
│ Email    │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

## React Components

1. **`CustomEditor`** — Main wrapper: `<GjsEditor>` + `<Canvas/>` + custom panels
2. **`TopNav`** — Tabs (Compose/Settings/Preview) + campaign name + Cancel/Done (visual only)
3. **`Toolbar`** — Functional: Undo/Redo, Device toggles (mobile/desktop). Visual: Style, Canvas size, Outlines, Personalization, Languages, Copywriter
4. **`Sidebar`** — Left panel, collapsible (arrow toggle like Braze)
   - **`RowBlocks`** — "Rows" section with 3 layout templates (1, 2, 3 columns)
   - **`ContentBlocks`** — "Blocks" section with draggable block grid

## Custom Blocks (GrapeJS Component Types)

### Rows (layout)
| Block | Type | Description |
|-------|------|-------------|
| 1 Column | `bz-row-1col` | Single column (100%) |
| 2 Columns | `bz-row-2col` | Two columns (50/50) |
| 3 Columns | `bz-row-3col` | Three columns (33/33/33) |

### Content Blocks
| Block | Type | Description |
|-------|------|-------------|
| Title | `bz-title` | Editable heading (h2, contenteditable) |
| Paragraph | `bz-text` | Editable body text |
| Button | `bz-button` | Styled CTA button |
| Image | `bz-image` | Image with upload support |
| Link | `bz-link` | Inline hyperlink |
| Spacer | `bz-spacer` | Configurable vertical spacing |
| Custom Code | `bz-html` | Custom HTML block |
| Phone Capture | `bz-phone` | Phone number input form |
| Email Capture | `bz-email` | Email input form |

## Theming System (CSS Custom Properties)

All colors defined as CSS variables — zero hardcoded colors. Change branding by updating one file (`app/lib/editor-theme.css`):

```css
:root {
  /* Brand */
  --editor-brand-primary: #008294;
  --editor-brand-primary-hover: #006d7a;
  --editor-brand-primary-light: #e6f4f6;

  /* Surfaces */
  --editor-bg-body: #f5f5f5;
  --editor-bg-panel: #ffffff;
  --editor-bg-canvas: #e8e8e8;

  /* Borders */
  --editor-border-color: #e5e7eb;
  --editor-border-color-strong: #d1d5db;

  /* Text */
  --editor-text-primary: #1f2937;
  --editor-text-secondary: #6b7280;
  --editor-text-on-brand: #ffffff;

  /* Blocks */
  --editor-block-bg: #ffffff;
  --editor-block-border: #e5e7eb;
  --editor-block-hover: #f9fafb;

  /* Selection (canvas) */
  --editor-selection-color: #3b97e3;
  --editor-selection-parent: #ffca6f;

  /* Status */
  --editor-success: #10b981;
  --editor-error: #ef4444;
  --editor-warning: #f59e0b;
}
```

## Integration with Existing Flow

- `BannerEditor.tsx` replaced by new `CustomEditor`
- `CreativeEditor.tsx` updated to use new editor
- API routes (banners, creatives) unchanged — same projectData/html/css format
- Homepage and listings unchanged
- `EditorSettings.tsx` adapted for new editor options

## Functional vs Visual Features

### Functional (working)
- Undo/Redo
- Device toggles (mobile/desktop canvas sizes)
- Block drag-and-drop into canvas
- Row layouts
- Component editing (text, images, buttons)
- Save/load projects via existing API

### Visual only (UI present, no logic)
- Compose/Settings/Preview tabs
- Cancel/Done buttons
- Style toggle
- Edit canvas size button
- Hide outlines button
- Personalization, Manage languages, Copywriter buttons
- Send feedback button
