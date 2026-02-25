# GrapeJS-Only Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove all non-GrapeJS code (Puck editor, Figma pipeline, Claude Vision, Template Editor) leaving a clean GrapeJS-only application.

**Architecture:** Bulk deletion of ~30 files across pages, components, API routes, and libraries. Update navigation, clean Prisma schema, remove unused NPM packages. Final app: homepage lists banners → create/edit in GrapeJS editor.

**Tech Stack:** Next.js 16, GrapeJS (studio-sdk), Prisma, PostgreSQL

---

### Task 1: Delete Non-GrapeJS Page Directories

**Files:**
- Delete: `app/puck-editor/` (entire directory)
- Delete: `app/figma-editor/` (entire directory)
- Delete: `app/template-editor/` (entire directory)

**Step 1: Delete page directories**

```bash
rm -rf app/puck-editor app/figma-editor app/template-editor
```

**Step 2: Verify deletion**

```bash
ls app/puck-editor app/figma-editor app/template-editor 2>&1
```
Expected: "No such file or directory" for all three.

---

### Task 2: Delete Non-GrapeJS Components

**Files:**
- Delete: `app/components/PuckEditorClient.tsx`
- Delete: `app/components/FigmaInstructions.tsx`
- Delete: `app/components/FigmaProcessor.tsx`
- Delete: `app/components/FigmaUrlInput.tsx`
- Delete: `app/components/TemplateEditorClient.tsx`
- Delete: `app/components/TemplateFormEditor.tsx`
- Delete: `app/components/TemplatePreview.tsx`
- Delete: `app/components/TemplateSelector.tsx`

**Step 1: Delete component files**

```bash
rm app/components/PuckEditorClient.tsx \
   app/components/FigmaInstructions.tsx \
   app/components/FigmaProcessor.tsx \
   app/components/FigmaUrlInput.tsx \
   app/components/TemplateEditorClient.tsx \
   app/components/TemplateFormEditor.tsx \
   app/components/TemplatePreview.tsx \
   app/components/TemplateSelector.tsx
```

**Step 2: Verify remaining components**

```bash
ls app/components/
```
Expected: `BannerEditor.tsx`, `BannerList.tsx`, `CreativeEditor.tsx`, `CreativeList.tsx`, `EditorSettings.tsx`, `ui/`

---

### Task 3: Delete Non-GrapeJS API Routes

**Files:**
- Delete: `app/api/puck-projects/` (entire directory)
- Delete: `app/api/figma-to-puck/` (entire directory)
- Delete: `app/api/figma-to-html/` (entire directory)
- Delete: `app/api/figma-process/` (entire directory)

**Step 1: Delete API route directories**

```bash
rm -rf app/api/puck-projects app/api/figma-to-puck app/api/figma-to-html app/api/figma-process
```

**Step 2: Verify remaining API routes**

```bash
ls app/api/
```
Expected: `banners/`, `creatives/`, `editor-settings/`

---

### Task 4: Delete Non-GrapeJS Library Files

**Files:**
- Delete: `app/lib/puck-config.tsx`
- Delete: `app/lib/puck-components.ts`
- Delete: `app/lib/puck-html-document.ts`
- Delete: `app/lib/puck-template.ts`
- Delete: `app/lib/anthropic.ts`
- Delete: `app/lib/figma-api.ts`
- Delete: `app/lib/figma-mcp.ts`
- Delete: `app/lib/figma-utils.ts`
- Delete: `app/lib/figma-actions.ts`
- Delete: `app/lib/html-parser.ts`
- Delete: `app/lib/template-editor.ts`
- Delete: `app/lib/process-figma-request.ts`
- Delete: `app/lib/image-hosting/` (entire directory)

**Step 1: Delete lib files and directory**

```bash
rm app/lib/puck-config.tsx \
   app/lib/puck-components.ts \
   app/lib/puck-html-document.ts \
   app/lib/puck-template.ts \
   app/lib/anthropic.ts \
   app/lib/figma-api.ts \
   app/lib/figma-mcp.ts \
   app/lib/figma-utils.ts \
   app/lib/figma-actions.ts \
   app/lib/html-parser.ts \
   app/lib/template-editor.ts \
   app/lib/process-figma-request.ts
rm -rf app/lib/image-hosting
```

**Step 2: Verify remaining lib files**

```bash
ls app/lib/
```
Expected: `cache.ts`, `utils.ts`

---

### Task 5: Delete Scripts

**Files:**
- Delete: `scripts/` (entire directory)

**Step 1: Delete scripts directory**

```bash
rm -rf scripts
```

**Step 2: Remove script references from package.json**

In `package.json`, remove these three script entries:
```json
"screenshot": "node scripts/screenshot-mobile.js",
"compare": "node scripts/compare-screenshots.js",
"fetch-figma": "node scripts/fetch-figma-screenshot.js"
```

Keep all other scripts (`dev`, `build`, `start`, `lint`, `format`, `format:check`, `db:*`).

---

### Task 6: Update BannerList Navigation

**Files:**
- Modify: `app/components/BannerList.tsx:167-184`

**Step 1: Remove navigation buttons for deleted pages**

Remove lines 167-184 from `BannerList.tsx` — the three buttons for "Figma to Editor", "Form Editor (Demo)", and "Puck Editor".

After edit, the button area should contain only:
```tsx
<div className="flex gap-3">
  <button
    onClick={() => router.push('/creatives')}
    className="border rounded px-4 py-2 hover:bg-gray-100"
  >
    View Creatives
  </button>
  <button
    onClick={() => router.push('/editor')}
    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
  >
    Create New Template
  </button>
</div>
```

---

### Task 7: Remove PuckProject from Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma:49-61`

**Step 1: Remove PuckProject model**

Delete the entire `PuckProject` model block (lines 49-61) from `prisma/schema.prisma`.

**Step 2: Generate Prisma migration**

```bash
npx dotenv -e .env.local -- prisma migrate dev --name remove-puck-projects-table
```

Expected: Migration created and applied successfully, `puck_projects` table dropped.

**Step 3: Regenerate Prisma client**

```bash
npx dotenv -e .env.local -- prisma generate
```

---

### Task 8: Uninstall Unused NPM Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Uninstall packages**

```bash
npm uninstall @anthropic-ai/sdk @measured/puck @modelcontextprotocol/sdk
```

**Step 2: Verify package.json**

Check that `package.json` no longer contains:
- `@anthropic-ai/sdk`
- `@measured/puck`
- `@modelcontextprotocol/sdk`

And still contains:
- `@grapesjs/studio-sdk`
- `@grapesjs/studio-sdk-plugins`
- `grapesjs`

---

### Task 9: Clean Environment Variables

**Files:**
- Modify: `.env.local`

**Step 1: Remove unused environment variables**

Remove these lines from `.env.local`:
- `FIGMA_API_KEY=...`
- `IMGBB_API_KEY=...`
- `ANTHROPIC_API_KEY=...`
- `FIGMA_MCP_URL=...` (and any related comment block)

Keep:
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_GRAPESJS_LICENSE_KEY`

---

### Task 10: Verify Build

**Step 1: Run build to check for broken imports**

```bash
npm run build
```

Expected: Build succeeds with no import errors.

**Step 2: Fix any broken references**

If build fails, check error messages for:
- Import statements referencing deleted files
- Missing module references
- Prisma client type errors

Fix each broken reference by removing the import or the code that depends on it.

**Step 3: Run dev server smoke test**

```bash
npm run dev
```

Visit homepage — should show banner list with only "View Creatives" and "Create New Template" buttons. Click "Create New Template" — should open GrapeJS editor.

---

### Task 11: Commit All Changes

**Step 1: Stage and commit**

```bash
git add -A
git commit -m "refactor: remove all non-GrapeJS code (Puck, Figma pipeline, Template Editor)

Remove Puck editor, Figma-to-code pipeline, Claude Vision integration,
and Template Editor. Keep only GrapeJS as the sole editor.

Removed:
- Puck editor pages, components, API routes, and config
- Figma API integration, MCP client, and processing pipeline
- Anthropic/Claude Vision API integration
- Template editor with variable system
- Image hosting (ImgBB) integration
- PuckProject database table
- Unused NPM dependencies (@measured/puck, @anthropic-ai/sdk, @modelcontextprotocol/sdk)
- Utility scripts (screenshots, Figma export)"
```

---

### Task 12: Update Project Memory

**Step 1: Update MEMORY.md**

Update `/Users/wagner.junior.ext/.claude/projects/-Users-wagner-junior-ext-Workdir-grapejs-poc/memory/MEMORY.md` to reflect the simplified architecture — remove references to Puck, Figma pipeline, Claude Vision, template variables, and vector detection.
