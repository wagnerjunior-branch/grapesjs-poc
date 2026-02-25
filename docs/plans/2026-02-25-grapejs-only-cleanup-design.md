# Design: Remove All Non-GrapeJS Code

**Date:** 2026-02-25
**Goal:** Strip the application down to GrapeJS editor only, removing Puck, Figma pipeline, Claude Vision, and Template Editor.

## Approach

Bulk removal: delete all non-GrapeJS files at once, then fix broken references and clean up.

## What Gets Removed

### Pages (3 directories)
- `app/puck-editor/`
- `app/figma-editor/`
- `app/template-editor/`

### Components (8 files)
- `PuckEditorClient.tsx`
- `FigmaInstructions.tsx`
- `FigmaProcessor.tsx`
- `FigmaUrlInput.tsx`
- `TemplateEditorClient.tsx`
- `TemplateFormEditor.tsx`
- `TemplatePreview.tsx`
- `TemplateSelector.tsx`

### API Routes (5 routes)
- `api/puck-projects/` (route.ts + [id]/route.ts)
- `api/figma-to-puck/route.ts`
- `api/figma-to-html/route.ts`
- `api/figma-process/route.ts`

### Library Files (13+ files)
- `puck-config.tsx`, `puck-components.ts`, `puck-html-document.ts`, `puck-template.ts`
- `anthropic.ts`, `figma-api.ts`, `figma-mcp.ts`, `figma-utils.ts`, `figma-actions.ts`
- `html-parser.ts`, `template-editor.ts`, `process-figma-request.ts`
- `image-hosting/` (entire directory)

### Scripts
- `scripts/` directory (screenshot and Figma-related)

### Prisma
- Remove `PuckProject` model from schema
- Generate migration

### NPM Dependencies
- `@anthropic-ai/sdk`
- `@measured/puck`
- `@modelcontextprotocol/sdk`

## What Gets Kept

### Pages
- `app/page.tsx` (homepage with banner list)
- `app/editor/` (GrapeJS editor page)
- `app/creatives/` (creative management pages)

### Components
- `BannerEditor.tsx` (GrapeJS editor)
- `BannerList.tsx` (homepage listing)
- `CreativeEditor.tsx` (GrapeJS creative editor)
- `CreativeList.tsx` (creatives listing)
- `EditorSettings.tsx` (style manager toggle)
- `ui/switch.tsx` (Radix UI switch)

### API Routes
- `api/banners/` (CRUD)
- `api/creatives/` (CRUD)
- `api/editor-settings/` (GET/POST)

### Libraries
- `cache.ts`, `utils.ts`, `lib/prisma.ts`

### Prisma Models
- `Banner`, `Creative`, `EditorSettings`

## Navigation Update

Remove from `BannerList.tsx`:
- "Figma to Editor" button
- "Form Editor (Demo)" button
- "Puck Editor" button

Keep:
- "Create New Template" -> `/editor`
- "View Creatives" -> `/creatives`

## Final Application Flow

```
Homepage (banner list) -> Create/Edit -> GrapeJS Editor
                       -> View Creatives -> Create/Edit Creative
```
