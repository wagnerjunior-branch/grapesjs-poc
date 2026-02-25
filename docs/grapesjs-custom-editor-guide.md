# GrapeJS Custom Editor — Implementation Guide

A practical guide to integrating GrapeJS into a React/Next.js project with a fully custom interface, replacing the default UI with your own components.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Installation](#installation)
3. [File Structure](#file-structure)
4. [Step 1: Theming with CSS Variables](#step-1-theming-with-css-variables)
5. [Step 2: Blocks Plugin](#step-2-blocks-plugin)
6. [Step 3: Sidebar with Drag-and-Drop](#step-3-sidebar-with-drag-and-drop)
7. [Step 4: Toolbar](#step-4-toolbar)
8. [Step 5: Editor Wrapper](#step-5-editor-wrapper)
9. [GrapeJS API — Quick Reference](#grapejs-api--quick-reference)
10. [Branding Customization](#branding-customization)
11. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The strategy is to use **GrapeJS core** (`grapesjs`) + **React wrapper** (`@grapesjs/react`) for full UI control. The approach:

1. **Disable the default GrapeJS UI** (panels, visual block manager)
2. **Render `<Canvas />`** as a child of `<GjsEditor>` — this automatically hides the built-in UI
3. **Build your own React components** for sidebar, toolbar, etc.
4. **Communicate with the editor** via hooks (`useEditor()`) and providers (`BlocksProvider`)

```
┌─────────────────────────────────────────────┐
│  GjsEditor (wrapper — provides context)     │
│  ┌───────────────────────────────────────┐  │
│  │ TopNav (pure React)                   │  │
│  ├───────────────────────────────────────┤  │
│  │ WithEditor > Toolbar (useEditor)      │  │
│  ├──────────┬────────────────────────────┤  │
│  │ WithEditor│                           │  │
│  │ > Sidebar │   Canvas (GrapeJS)        │  │
│  │ (Blocks   │                           │  │
│  │  Provider)│                           │  │
│  └──────────┴────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Why `grapesjs` + `@grapesjs/react` instead of `@grapesjs/studio-sdk`?

| | Core + React | Studio SDK |
|---|---|---|
| License | MIT (free) | Commercial (paid) |
| UI control | Full — you build everything | Limited — pre-built UI |
| Visual customization | Unlimited | Restricted to what the SDK exposes |
| Complexity | Medium — more code, more freedom | Low — less code, less control |

**Recommendation:** Use core when you need a fully custom interface (e.g., adapting to your company's design system).

---

## Installation

```bash
# Required dependencies
pnpm add grapesjs @grapesjs/react

# Versions used in this guide
# grapesjs: ^0.22.14
# @grapesjs/react: ^2.0.0
```

You also need to load the base GrapeJS CSS. This is done via a prop on the wrapper component (see Step 5).

---

## File Structure

```
app/
├── lib/
│   ├── editor-theme.css          # CSS variables for theming
│   └── editor-blocks-plugin.ts   # Plugin with component types and blocks
├── components/
│   └── editor/
│       ├── CustomEditor.tsx       # Main wrapper (GjsEditor + Canvas)
│       ├── Toolbar.tsx            # Toolbar (undo, redo, device toggles)
│       └── Sidebar.tsx            # Side panel with draggable blocks
```

---

## Step 1: Theming with CSS Variables

Create a CSS file with all editor colors as custom properties. This allows you to change the entire branding by modifying a single file.

**`lib/editor-theme.css`**

```css
:root {
  /* Brand — main brand colors */
  --editor-brand-primary: #008294;
  --editor-brand-primary-hover: #006d7a;
  --editor-brand-primary-light: #e6f4f6;
  --editor-brand-primary-text: #008294;

  /* Surfaces — area backgrounds */
  --editor-bg-body: #f5f5f5;
  --editor-bg-canvas: #e8e8e8;
  --editor-bg-toolbar: #ffffff;
  --editor-bg-sidebar: #ffffff;

  /* Borders */
  --editor-border-color: #e5e7eb;
  --editor-border-color-strong: #d1d5db;

  /* Text */
  --editor-text-primary: #1f2937;
  --editor-text-secondary: #6b7280;
  --editor-text-muted: #9ca3af;
  --editor-text-on-brand: #ffffff;

  /* Blocks (sidebar items) */
  --editor-block-bg: #ffffff;
  --editor-block-border: #e5e7eb;
  --editor-block-hover-bg: #f9fafb;
  --editor-block-hover-border: #d1d5db;
  --editor-block-icon-color: #6b7280;

  /* Selection (canvas highlights) */
  --editor-selection-color: #3b97e3;
  --editor-selection-parent: #ffca6f;

  /* Buttons */
  --editor-btn-primary-bg: var(--editor-brand-primary);
  --editor-btn-primary-text: var(--editor-text-on-brand);
  --editor-btn-secondary-border: var(--editor-border-color-strong);
  --editor-btn-secondary-text: var(--editor-text-primary);
}
```

**Usage in components:** apply variables via the `style` prop:

```tsx
<div style={{ backgroundColor: 'var(--editor-bg-toolbar)' }}>
```

---

## Step 2: Blocks Plugin

The plugin registers **component types** (HTML structure + styles) and **blocks** (draggable items in the sidebar).

**`lib/editor-blocks-plugin.ts`**

```ts
import type { Editor, Plugin } from 'grapesjs';

const customBlocksPlugin: Plugin = (editor: Editor) => {
  const bm = editor.BlockManager;
  const cm = editor.Components;

  // 1. Register component types
  cm.addType('my-row', {
    model: {
      defaults: {
        tagName: 'div',
        draggable: true,      // can be dragged
        droppable: true,       // accepts children
        attributes: { class: 'my-row' },
        styles: `.my-row { display: flex; width: 100%; min-height: 50px; }`,
      },
    },
  });

  cm.addType('my-column', {
    model: {
      defaults: {
        tagName: 'div',
        draggable: '.my-row',  // can only be dragged inside .my-row
        droppable: true,
        attributes: { class: 'my-column' },
        styles: `.my-column { flex: 1; padding: 10px; min-height: 50px; }`,
      },
    },
  });

  // Extend built-in GrapeJS types (text, image, link)
  cm.addType('my-title', {
    extend: 'text',            // inherits inline editing behavior
    model: {
      defaults: {
        tagName: 'h2',
        content: 'Title',
        attributes: { class: 'my-title' },
        styles: `.my-title {
          font-size: 24px; font-weight: 700; text-align: center;
          padding: 10px;
        }`,
      },
    },
  });

  cm.addType('my-button', {
    model: {
      defaults: {
        tagName: 'button',
        content: 'Click me',
        attributes: { class: 'my-btn' },
        styles: `.my-btn {
          padding: 15px 25px; background-color: #008294; color: #fff;
          border: none; border-radius: 8px; font-size: 16px;
          cursor: pointer;
        }`,
        // Traits = editable properties in the properties panel
        traits: [
          { type: 'text', name: 'content', label: 'Button Text' },
          { type: 'text', name: 'href', label: 'Link URL' },
        ],
      },
    },
  });

  // For select traits, each option requires id, value, and name
  cm.addType('my-link', {
    extend: 'link',
    model: {
      defaults: {
        attributes: { class: 'my-link' },
        content: 'Link text',
        traits: [
          { type: 'text', name: 'href', label: 'URL' },
          {
            type: 'select', name: 'target', label: 'Open in',
            options: [
              { id: 'same', value: '', name: 'Same window' },
              { id: 'blank', value: '_blank', name: 'New window' },
            ],
          },
        ],
      },
    },
  });

  // Composite component (with children)
  cm.addType('my-form-field', {
    model: {
      defaults: {
        tagName: 'div',
        droppable: false,     // does not accept dragged children
        components: [
          { tagName: 'label', content: 'Email', attributes: { class: 'my-label' } },
          {
            tagName: 'input', void: true,  // void = no closing tag
            attributes: { type: 'email', placeholder: 'email@example.com', class: 'my-input' }
          },
        ],
        styles: `.my-label { display: block; font-weight: 600; margin-bottom: 4px; }
                 .my-input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; }`,
      },
    },
  });

  // 2. Register blocks (sidebar items)
  bm.add('row-1col', {
    label: '1 Column',
    category: 'Layout',       // grouping in the sidebar
    media: '<svg viewBox="0 0 100 50">...</svg>',  // SVG icon
    content: {
      type: 'my-row',
      components: [{ type: 'my-column' }],  // initial content
    },
  });

  bm.add('row-2col', {
    label: '2 Columns',
    category: 'Layout',
    media: '<svg viewBox="0 0 100 50">...</svg>',
    content: {
      type: 'my-row',
      components: [{ type: 'my-column' }, { type: 'my-column' }],
    },
  });

  bm.add('title-block', {
    label: 'Title',
    category: 'Content',
    media: '<svg viewBox="0 0 24 24">...</svg>',
    content: { type: 'my-title' },
  });

  bm.add('button-block', {
    label: 'Button',
    category: 'Content',
    media: '<svg viewBox="0 0 24 24">...</svg>',
    content: { type: 'my-button' },
  });
};

export default customBlocksPlugin;
```

### Component Type Anatomy

```ts
cm.addType('unique-name', {
  extend: 'text',  // optional: inherits from built-in type (text, image, link, video)
  model: {
    defaults: {
      tagName: 'div',           // HTML tag
      draggable: true,          // can be dragged (true | CSS selector string)
      droppable: true,          // accepts children (true | false | CSS selector string)
      editable: true,           // allows inline text editing
      attributes: { class: 'x' }, // HTML attributes
      content: 'Text',         // text content
      components: [],           // children (for composite components)
      styles: `.x { ... }`,     // embedded CSS
      traits: [],               // editable properties
    },
  },
});
```

### Block Anatomy

```ts
bm.add('unique-id', {
  label: 'Visible name',
  category: 'Category',           // grouping in the sidebar
  media: '<svg>...</svg>',         // icon (inline SVG)
  content: { type: 'component-type-name' },  // or raw HTML string
});
```

---

## Step 3: Sidebar with Drag-and-Drop

The `BlocksProvider` from `@grapesjs/react` provides the registered block data and drag-and-drop functions.

**`components/editor/Sidebar.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { BlocksProvider } from '@grapesjs/react';
import type { Block } from 'grapesjs';

// Individual draggable block component
function BlockItem({
  block,
  dragStart,
  dragStop,
}: {
  block: Block;
  dragStart: (block: Block, ev?: Event) => void;
  dragStop: (cancel?: boolean) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => dragStart(block, e.nativeEvent)}
      onDragEnd={() => dragStop(false)}
      className="flex flex-col items-center p-3 rounded-lg border cursor-grab"
      style={{
        backgroundColor: 'var(--editor-block-bg)',
        borderColor: 'var(--editor-block-border)',
      }}
    >
      {/* Block SVG icon (defined in the plugin via `media`) */}
      <div
        className="w-8 h-8 mb-1"
        style={{ color: 'var(--editor-block-icon-color)' }}
        dangerouslySetInnerHTML={{ __html: block.getMedia() || '' }}
      />
      <span className="text-xs" style={{ color: 'var(--editor-text-primary)' }}>
        {block.getLabel()}
      </span>
    </div>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div style={{ backgroundColor: 'var(--editor-bg-sidebar)' }}>
        <button onClick={() => setCollapsed(false)}>{'>'}</button>
      </div>
    );
  }

  return (
    <div className="w-72 border-r overflow-y-auto"
         style={{ backgroundColor: 'var(--editor-bg-sidebar)' }}>
      <button onClick={() => setCollapsed(true)}>{'<'}</button>

      <BlocksProvider>
        {({ mapCategoryBlocks, dragStart, dragStop }) => (
          <div className="px-4 pb-4">
            {Array.from(mapCategoryBlocks).map(([category, blocks]) => (
              <div key={category} className="mb-6">
                <h3 className="text-sm font-semibold mb-2">{category}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {blocks.map((block) => (
                    <BlockItem
                      key={block.getId()}
                      block={block}
                      dragStart={dragStart}
                      dragStop={dragStop}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </BlocksProvider>
    </div>
  );
}
```

### Drag-and-Drop Key Points

| Element | Purpose |
|---|---|
| `draggable` (HTML attribute) | Enables the browser's native drag |
| `onDragStart` -> `dragStart(block, e.nativeEvent)` | Initiates the drag in GrapeJS — **requires `nativeEvent`**, not the React event |
| `onDragEnd` -> `dragStop(false)` | Ends the drag. `false` = do not cancel |
| `mapCategoryBlocks` | `Map<string, Block[]>` — blocks grouped by `category` from the plugin |
| `block.getMedia()` | Returns the SVG defined in the block's `media` |
| `block.getLabel()` | Returns the block's `label` |
| `block.getId()` | Returns the block's unique `id` |

---

## Step 4: Toolbar

The `useEditor()` hook provides direct access to the GrapeJS editor instance.

**`components/editor/Toolbar.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useEditor } from '@grapesjs/react';

export default function Toolbar() {
  const editor = useEditor();
  const [activeDevice, setActiveDevice] = useState<'mobile' | 'desktop'>('mobile');

  // Undo/Redo — via UndoManager
  const handleUndo = () => editor.UndoManager.undo();
  const handleRedo = () => editor.UndoManager.redo();

  // Device toggle — changes the canvas width
  const handleDeviceChange = (device: 'mobile' | 'desktop') => {
    setActiveDevice(device);
    // The device id must match the one registered in deviceManager
    editor.setDevice(device === 'mobile' ? 'Mobile' : 'Desktop');
  };

  return (
    <div style={{ backgroundColor: 'var(--editor-bg-toolbar)' }}>
      <button onClick={handleUndo}>Undo</button>
      <button onClick={handleRedo}>Redo</button>

      <button
        onClick={() => handleDeviceChange('mobile')}
        style={{
          backgroundColor: activeDevice === 'mobile'
            ? 'var(--editor-brand-primary-light)' : 'transparent',
        }}
      >
        Mobile
      </button>
      <button
        onClick={() => handleDeviceChange('desktop')}
        style={{
          backgroundColor: activeDevice === 'desktop'
            ? 'var(--editor-brand-primary-light)' : 'transparent',
        }}
      >
        Desktop
      </button>
    </div>
  );
}
```

### Useful `editor` APIs

```ts
// Undo/Redo
editor.UndoManager.undo();
editor.UndoManager.redo();
editor.UndoManager.hasUndo();  // boolean
editor.UndoManager.hasRedo();  // boolean

// Devices
editor.setDevice('Mobile');    // id registered in deviceManager
editor.getDevice();            // returns the current device

// Get content
editor.getHtml();              // generated HTML
editor.getCss();               // generated CSS
editor.getProjectData();       // full JSON (for save/restore)
editor.loadProjectData(json);  // restore saved state

// Components on canvas
editor.getComponents();        // root component list
editor.getSelected();          // selected component
editor.select(component);      // select programmatically

// Blocks
editor.BlockManager.getAll();  // all blocks
editor.BlockManager.get('id'); // specific block
```

---

## Step 5: Editor Wrapper

The main component that ties everything together.

**`components/editor/CustomEditor.tsx`**

```tsx
'use client';

import grapesjs, { Editor } from 'grapesjs';
import GjsEditor, { Canvas, WithEditor } from '@grapesjs/react';

import Toolbar from './Toolbar';
import Sidebar from './Sidebar';
import customBlocksPlugin from '../../lib/editor-blocks-plugin';
import '../../lib/editor-theme.css';

// Available devices
const DEVICES = [
  { id: 'Desktop', name: 'Desktop', width: '' },           // '' = full width
  { id: 'Mobile', name: 'Mobile', width: '320px', widthMedia: '768px' },
];

export default function CustomEditor() {
  const onReady = (editor: Editor) => {
    // Editor ready — load saved data, register listeners, etc.
    console.log('Editor ready', editor);
  };

  return (
    <GjsEditor
      grapesjs={grapesjs}
      grapesjsCss="https://unpkg.com/grapesjs@0.22.14/dist/css/grapes.min.css"
      options={{
        height: '100%',
        storageManager: false,               // disable built-in storage
        deviceManager: { devices: DEVICES, default: 'Mobile' },
        panels: { defaults: [] },            // remove default panels
        blockManager: { custom: true },      // disable visual block manager
      }}
      plugins={[customBlocksPlugin]}
      onReady={onReady}
    >
      {/* Everything inside GjsEditor has access to the editor context */}
      <div className="flex flex-col h-screen"
           style={{ backgroundColor: 'var(--editor-bg-body)' }}>

        {/* Toolbar — needs WithEditor because it uses useEditor() */}
        <WithEditor>
          <Toolbar />
        </WithEditor>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar — needs WithEditor because it uses BlocksProvider */}
          <WithEditor>
            <Sidebar />
          </WithEditor>

          {/* Canvas — rendered by GrapeJS */}
          <Canvas
            className="flex-1"
            style={{ backgroundColor: 'var(--editor-bg-canvas)' }}
          />
        </div>
      </div>
    </GjsEditor>
  );
}
```

### Critical `GjsEditor` Options

| Option | Value | Why |
|---|---|---|
| `storageManager: false` | Disables auto-save | You control when to save via `getProjectData()` |
| `panels: { defaults: [] }` | Removes built-in panels | You use your own React components |
| `blockManager: { custom: true }` | Disables visual block manager | You use `BlocksProvider` in React |
| `grapesjsCss` | URL with fixed version | Base CSS required for the canvas to work |

### `WithEditor` vs `useEditor()`

- **`WithEditor`**: Wrapper that only renders children when the editor is ready. Use on components that depend on the editor.
- **`useEditor()`**: Hook that returns the editor instance. Only works inside `WithEditor` or `BlocksProvider`.
- **`BlocksProvider`**: Specialized provider that supplies block data + drag-and-drop functions via render props.

```
GjsEditor
├── WithEditor          ← ensures the editor is ready
│   ├── useEditor()     ← access to the editor
│   └── BlocksProvider  ← block data + drag
└── Canvas              ← visual editor iframe
```

---

## GrapeJS API — Quick Reference

### Save and Restore

```ts
// Save full state (JSON)
const projectData = editor.getProjectData();
const html = editor.getHtml();
const css = editor.getCss();

// Send to API
await fetch('/api/save', {
  method: 'POST',
  body: JSON.stringify({ projectData, html, css }),
});

// Restore state
const saved = await fetch('/api/load').then(r => r.json());
editor.loadProjectData(saved.projectData);
```

### Events

```ts
// When a component is selected
editor.on('component:selected', (component) => {
  console.log('Selected:', component.getName());
});

// When content changes
editor.on('update', () => {
  console.log('Content changed');
});

// When a component is added
editor.on('component:add', (component) => {
  console.log('Added:', component.get('type'));
});
```

### Custom Storage

To implement auto-save:

```ts
options: {
  storageManager: {
    type: 'remote',
    stepsBeforeSave: 3,           // save every 3 changes
    options: {
      remote: {
        urlStore: '/api/editor/save',
        urlLoad: '/api/editor/load',
      },
    },
  },
}
```

---

## Branding Customization

To apply your company's visual identity, modify **only** the `editor-theme.css` file:

### Example: Dark Theme

```css
:root {
  --editor-brand-primary: #6366f1;
  --editor-brand-primary-hover: #4f46e5;
  --editor-brand-primary-light: #1e1b4b;
  --editor-brand-primary-text: #818cf8;

  --editor-bg-body: #0f172a;
  --editor-bg-canvas: #1e293b;
  --editor-bg-toolbar: #1e293b;
  --editor-bg-sidebar: #1e293b;

  --editor-border-color: #334155;
  --editor-border-color-strong: #475569;

  --editor-text-primary: #f1f5f9;
  --editor-text-secondary: #94a3b8;
  --editor-text-muted: #64748b;
  --editor-text-on-brand: #ffffff;

  --editor-block-bg: #334155;
  --editor-block-border: #475569;
  --editor-block-hover-bg: #475569;
  --editor-block-hover-border: #64748b;
  --editor-block-icon-color: #94a3b8;

  --editor-btn-primary-bg: var(--editor-brand-primary);
  --editor-btn-primary-text: var(--editor-text-on-brand);
  --editor-btn-secondary-border: var(--editor-border-color-strong);
  --editor-btn-secondary-text: var(--editor-text-primary);
}
```

### Variable Naming Convention

```
--editor-{category}-{property}

Categories:
  brand-*       → brand colors
  bg-*          → backgrounds
  text-*        → text colors
  border-*      → borders
  block-*       → sidebar items
  btn-*         → buttons
  selection-*   → canvas highlights
  tab-*         → navigation tabs
```

---

## Troubleshooting

### `TraitOption` requires `id` property

```ts
// WRONG — type error
options: [
  { value: '', name: 'Same window' },
]

// CORRECT
options: [
  { id: 'same', value: '', name: 'Same window' },
]
```

### Component doesn't render on the canvas

Check:
- The `type` in the block's `content` matches the id registered in `cm.addType()`
- The component has a `tagName` defined
- If using `extend`, the base type exists ('text', 'image', 'link', 'video')

### `useEditor()` returns `undefined`

The component **must** be inside `<WithEditor>` or `<BlocksProvider>`. These wrappers ensure the editor is initialized before rendering children.

```tsx
// WRONG
<GjsEditor>
  <Toolbar />    {/* useEditor() may be undefined */}
</GjsEditor>

// CORRECT
<GjsEditor>
  <WithEditor>
    <Toolbar />  {/* useEditor() always available */}
  </WithEditor>
</GjsEditor>
```

### Drag-and-drop doesn't work

Make sure to use `e.nativeEvent` in `onDragStart`:

```tsx
// WRONG — passes the React SyntheticEvent
onDragStart={(e) => dragStart(block, e)}

// CORRECT — passes the native DOM Event
onDragStart={(e) => dragStart(block, e.nativeEvent)}
```

### GrapeJS CSS doesn't load

The `grapesjsCss` prop must point to the correct version:

```tsx
// Pin the version to avoid breaking changes
grapesjsCss="https://unpkg.com/grapesjs@0.22.14/dist/css/grapes.min.css"
```

### Blocks don't appear in the sidebar

Verify that `blockManager: { custom: true }` is set in the options. Without this, GrapeJS tries to render its own block manager instead of delegating to `BlocksProvider`.

---

## Next Steps

- **Style Manager**: Use `StylesProvider` from `@grapesjs/react` to build a custom style editing panel
- **Traits Panel**: Use `TraitsProvider` to edit properties of selected components
- **Layers Panel**: Use `LayersProvider` to visualize the component tree
- **Storage**: Implement a custom `storageManager` or use `getProjectData()`/`loadProjectData()` with your API
- **Rich Text Editor**: Customize the inline text editor via `config.richTextEditor`

### Useful Links

- [GrapeJS Docs](https://grapesjs.com/docs/)
- [@grapesjs/react](https://github.com/GrapesJS/react)
- [GrapeJS API Reference](https://grapesjs.com/docs/api/editor.html)
