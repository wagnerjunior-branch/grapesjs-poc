# Braze-Style Custom GrapeJS Editor — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the Studio SDK editor with a fully custom Braze-style UI built on core GrapesJS + @grapesjs/react, with a themeable design system.

**Architecture:** Use `@grapesjs/react`'s `<Canvas/>` component to disable the default GrapesJS UI, then build React components (TopNav, Toolbar, Sidebar) around it. Register custom block types via a GrapesJS plugin. All colors via CSS custom properties for easy branding.

**Tech Stack:** Next.js 16, React 19, grapesjs 0.22.14, @grapesjs/react 2.x, Tailwind CSS 4

---

### Task 1: Migrate Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Uninstall Studio SDK packages**

```bash
npm uninstall @grapesjs/studio-sdk @grapesjs/studio-sdk-plugins
```

**Step 2: Install @grapesjs/react**

```bash
npm install @grapesjs/react@^2.0.0
```

Note: `grapesjs@0.22.14` is already installed.

**Step 3: Verify package.json**

Check that `package.json` contains:
- `grapesjs`: `^0.22.14`
- `@grapesjs/react`: `^2.0.0`
- Does NOT contain `@grapesjs/studio-sdk` or `@grapesjs/studio-sdk-plugins`

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: migrate from Studio SDK to @grapesjs/react"
```

---

### Task 2: Create Editor Theme CSS

**Files:**
- Create: `app/lib/editor-theme.css`

**Step 1: Create the theme file**

```css
/* Editor Theme — Change these values to apply custom branding */

:root {
  /* Brand */
  --editor-brand-primary: #008294;
  --editor-brand-primary-hover: #006d7a;
  --editor-brand-primary-light: #e6f4f6;
  --editor-brand-primary-text: #008294;

  /* Surfaces */
  --editor-bg-body: #f5f5f5;
  --editor-bg-panel: #ffffff;
  --editor-bg-canvas: #e8e8e8;
  --editor-bg-topnav: #ffffff;
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

  /* Blocks */
  --editor-block-bg: #ffffff;
  --editor-block-border: #e5e7eb;
  --editor-block-hover-bg: #f9fafb;
  --editor-block-hover-border: #d1d5db;
  --editor-block-icon-color: #6b7280;

  /* Selection (canvas) */
  --editor-selection-color: #3b97e3;
  --editor-selection-parent: #ffca6f;

  /* Tabs */
  --editor-tab-active-border: #1f2937;
  --editor-tab-active-text: #1f2937;
  --editor-tab-inactive-text: #6b7280;

  /* Status */
  --editor-success: #10b981;
  --editor-error: #ef4444;
  --editor-warning: #f59e0b;

  /* Buttons */
  --editor-btn-primary-bg: var(--editor-brand-primary);
  --editor-btn-primary-hover: var(--editor-brand-primary-hover);
  --editor-btn-primary-text: var(--editor-text-on-brand);
  --editor-btn-secondary-bg: transparent;
  --editor-btn-secondary-border: var(--editor-border-color-strong);
  --editor-btn-secondary-text: var(--editor-text-primary);
}
```

**Step 2: Commit**

```bash
git add app/lib/editor-theme.css
git commit -m "feat: add editor theme CSS with custom properties"
```

---

### Task 3: Create Custom Blocks Plugin

**Files:**
- Create: `app/lib/editor-blocks-plugin.ts`

This GrapesJS plugin registers all custom component types and blocks (Rows + Content blocks).

**Step 1: Create the plugin file**

```typescript
import type { Editor, Plugin } from 'grapesjs';

const brazeBlocksPlugin: Plugin = (editor: Editor) => {
  const bm = editor.BlockManager;
  const cm = editor.Components;

  // --- Component Types ---

  cm.addType('bz-row', {
    model: {
      defaults: {
        tagName: 'div',
        draggable: true,
        droppable: true,
        attributes: { class: 'bz-row' },
        styles: `
          .bz-row { display: flex; width: 100%; min-height: 50px; }
        `,
      },
    },
  });

  cm.addType('bz-column', {
    model: {
      defaults: {
        tagName: 'div',
        draggable: '.bz-row',
        droppable: true,
        attributes: { class: 'bz-column' },
        styles: `
          .bz-column { flex: 1; padding: 10px; min-height: 50px; }
        `,
      },
    },
  });

  cm.addType('bz-title', {
    extend: 'text',
    model: {
      defaults: {
        tagName: 'h2',
        attributes: { class: 'bz-title', role: 'heading', 'aria-level': '2' },
        content: 'Title',
        styles: `
          .bz-title {
            font-size: 24px;
            font-weight: 700;
            text-align: center;
            padding: 10px;
            font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }
        `,
      },
    },
  });

  cm.addType('bz-text', {
    extend: 'text',
    model: {
      defaults: {
        tagName: 'p',
        attributes: { class: 'bz-text', role: 'paragraph' },
        content: 'Insert your text here',
        styles: `
          .bz-text {
            font-size: 14px;
            font-weight: 400;
            text-align: center;
            padding: 10px;
            line-height: 1.5;
            font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }
        `,
      },
    },
  });

  cm.addType('bz-button', {
    model: {
      defaults: {
        tagName: 'button',
        attributes: { class: 'bz-btn' },
        content: 'Click me',
        styles: `
          .bz-btn {
            display: inline-block;
            padding: 15px 25px;
            background-color: #008294;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            text-align: center;
            transition: opacity 0.2s ease;
            font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }
          .bz-btn:hover { opacity: 0.8; }
        `,
        traits: [
          { type: 'text', name: 'content', label: 'Button Text' },
          { type: 'text', name: 'href', label: 'Link URL' },
        ],
      },
    },
  });

  cm.addType('bz-image', {
    extend: 'image',
    model: {
      defaults: {
        attributes: { class: 'bz-img', alt: 'Image' },
        styles: `
          .bz-img { max-width: 100%; height: auto; display: block; }
        `,
      },
    },
  });

  cm.addType('bz-link', {
    extend: 'link',
    model: {
      defaults: {
        attributes: { class: 'bz-link' },
        content: 'Link text',
        styles: `
          .bz-link { color: #008294; text-decoration: underline; cursor: pointer; }
        `,
        traits: [
          { type: 'text', name: 'href', label: 'URL' },
          {
            type: 'select', name: 'target', label: 'Open in',
            options: [
              { value: '', name: 'Same window' },
              { value: '_blank', name: 'New window' },
            ],
          },
        ],
      },
    },
  });

  cm.addType('bz-spacer', {
    model: {
      defaults: {
        tagName: 'div',
        attributes: { class: 'bz-spacer' },
        styles: `
          .bz-spacer { height: 20px; width: 100%; }
        `,
        traits: [
          { type: 'number', name: 'height', label: 'Height (px)', default: 20 },
        ],
      },
    },
  });

  cm.addType('bz-html', {
    model: {
      defaults: {
        tagName: 'div',
        attributes: { class: 'bz-html-block' },
        content: '<p>Custom HTML here</p>',
        editable: false,
      },
    },
  });

  cm.addType('bz-phone', {
    model: {
      defaults: {
        tagName: 'div',
        attributes: { class: 'bz-phone-capture' },
        droppable: false,
        components: [
          {
            tagName: 'label',
            content: 'Phone Number',
            attributes: { class: 'bz-input-label' },
          },
          {
            tagName: 'input',
            void: true,
            attributes: {
              type: 'tel',
              placeholder: 'Enter phone number',
              class: 'bz-input-field',
            },
          },
        ],
        styles: `
          .bz-phone-capture { padding: 10px; }
          .bz-input-label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px; }
          .bz-input-field {
            width: 100%; padding: 10px; border: 1px solid #A8B3B8;
            border-radius: 4px; font-size: 14px; min-height: 40px;
          }
          .bz-input-field:focus { border-color: #008294; border-width: 2px; outline: none; }
        `,
      },
    },
  });

  cm.addType('bz-email', {
    model: {
      defaults: {
        tagName: 'div',
        attributes: { class: 'bz-email-capture' },
        droppable: false,
        components: [
          {
            tagName: 'label',
            content: 'Email Address',
            attributes: { class: 'bz-input-label' },
          },
          {
            tagName: 'input',
            void: true,
            attributes: {
              type: 'email',
              placeholder: 'Enter email address',
              class: 'bz-input-field',
            },
          },
        ],
        styles: `
          .bz-email-capture { padding: 10px; }
        `,
      },
    },
  });

  // --- Row Blocks ---

  bm.add('row-1col', {
    label: '1 Column',
    category: 'Rows',
    media: `<svg viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="96" height="46" rx="3" stroke="currentColor" stroke-width="2" fill="none"/>
    </svg>`,
    content: {
      type: 'bz-row',
      components: [{ type: 'bz-column' }],
    },
  });

  bm.add('row-2col', {
    label: '2 Columns',
    category: 'Rows',
    media: `<svg viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="46" height="46" rx="3" stroke="currentColor" stroke-width="2" fill="none"/>
      <rect x="52" y="2" width="46" height="46" rx="3" stroke="currentColor" stroke-width="2" fill="none"/>
    </svg>`,
    content: {
      type: 'bz-row',
      components: [{ type: 'bz-column' }, { type: 'bz-column' }],
    },
  });

  bm.add('row-3col', {
    label: '3 Columns',
    category: 'Rows',
    media: `<svg viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="29" height="46" rx="3" stroke="currentColor" stroke-width="2" fill="none"/>
      <rect x="35" y="2" width="29" height="46" rx="3" stroke="currentColor" stroke-width="2" fill="none"/>
      <rect x="68" y="2" width="29" height="46" rx="3" stroke="currentColor" stroke-width="2" fill="none"/>
    </svg>`,
    content: {
      type: 'bz-row',
      components: [
        { type: 'bz-column' },
        { type: 'bz-column' },
        { type: 'bz-column' },
      ],
    },
  });

  // --- Content Blocks ---

  bm.add('title-block', {
    label: 'Title',
    category: 'Blocks',
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M4 6h16M4 12h10"/>
    </svg>`,
    content: { type: 'bz-title' },
  });

  bm.add('text-block', {
    label: 'Paragraph',
    category: 'Blocks',
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M4 6h16M4 10h16M4 14h16M4 18h10"/>
    </svg>`,
    content: { type: 'bz-text' },
  });

  bm.add('button-block', {
    label: 'Button',
    category: 'Blocks',
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="2" y="7" width="20" height="10" rx="3"/>
      <path d="M7 12h10"/>
    </svg>`,
    content: { type: 'bz-button' },
  });

  bm.add('image-block', {
    label: 'Image',
    category: 'Blocks',
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/>
    </svg>`,
    content: { type: 'bz-image' },
  });

  bm.add('link-block', {
    label: 'Link',
    category: 'Blocks',
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>`,
    content: { type: 'bz-link' },
  });

  bm.add('spacer-block', {
    label: 'Spacer',
    category: 'Blocks',
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M12 5v14M5 12h14" stroke-dasharray="2 2"/>
    </svg>`,
    content: { type: 'bz-spacer' },
  });

  bm.add('html-block', {
    label: 'Custom Code',
    category: 'Blocks',
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>`,
    content: { type: 'bz-html' },
  });

  bm.add('phone-block', {
    label: 'Phone Capture',
    category: 'Blocks',
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="5" y="2" width="14" height="20" rx="2"/>
      <line x1="12" y1="18" x2="12" y2="18"/>
    </svg>`,
    content: { type: 'bz-phone' },
  });

  bm.add('email-block', {
    label: 'Email Capture',
    category: 'Blocks',
    media: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <polyline points="22 4 12 13 2 4"/>
    </svg>`,
    content: { type: 'bz-email' },
  });
};

export default brazeBlocksPlugin;
```

**Step 2: Commit**

```bash
git add app/lib/editor-blocks-plugin.ts
git commit -m "feat: add custom blocks plugin with Braze-style components"
```

---

### Task 4: Create TopNav Component

**Files:**
- Create: `app/components/editor/TopNav.tsx`

**Step 1: Create the component**

```tsx
'use client';

interface TopNavProps {
  campaignName: string;
  onCampaignNameChange: (name: string) => void;
  onCancel: () => void;
  onDone: () => void;
  saving?: boolean;
}

export default function TopNav({
  campaignName,
  onCampaignNameChange,
  onCancel,
  onDone,
  saving,
}: TopNavProps) {
  return (
    <div
      className="flex items-center justify-between px-6 h-14 border-b"
      style={{
        backgroundColor: 'var(--editor-bg-topnav)',
        borderColor: 'var(--editor-border-color)',
      }}
    >
      {/* Left: Tabs */}
      <div className="flex gap-6">
        {['Compose', 'Settings', 'Preview'].map((tab, i) => (
          <button
            key={tab}
            className="pb-1 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderColor: i === 0 ? 'var(--editor-tab-active-border)' : 'transparent',
              color: i === 0
                ? 'var(--editor-tab-active-text)'
                : 'var(--editor-tab-inactive-text)',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Center: Campaign name */}
      <input
        type="text"
        value={campaignName}
        onChange={(e) => onCampaignNameChange(e.target.value)}
        className="text-sm font-medium text-center bg-transparent border-none outline-none max-w-xs"
        style={{ color: 'var(--editor-text-primary)' }}
        placeholder="Campaign name"
      />

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-1.5 text-sm font-medium rounded-md border transition-colors hover:bg-gray-50"
          style={{
            borderColor: 'var(--editor-btn-secondary-border)',
            color: 'var(--editor-btn-secondary-text)',
          }}
        >
          Cancel
        </button>
        <button
          onClick={onDone}
          disabled={saving}
          className="px-4 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          style={{
            backgroundColor: 'var(--editor-btn-primary-bg)',
            color: 'var(--editor-btn-primary-text)',
          }}
        >
          {saving ? 'Saving...' : 'Done'}
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/components/editor/TopNav.tsx
git commit -m "feat: add TopNav component with tabs and campaign name"
```

---

### Task 5: Create Toolbar Component

**Files:**
- Create: `app/components/editor/Toolbar.tsx`

**Step 1: Create the component**

This uses `useEditor()` from `@grapesjs/react` for functional buttons (undo/redo, device toggle).

```tsx
'use client';

import { useState } from 'react';
import { useEditor } from '@grapesjs/react';

export default function Toolbar() {
  const editor = useEditor();
  const [activeDevice, setActiveDevice] = useState<'mobile' | 'desktop'>('mobile');

  const handleUndo = () => editor.UndoManager.undo();
  const handleRedo = () => editor.UndoManager.redo();

  const handleDeviceChange = (device: 'mobile' | 'desktop') => {
    setActiveDevice(device);
    editor.setDevice(device === 'mobile' ? 'Mobile' : 'Desktop');
  };

  const btnBase = 'px-3 py-1.5 text-sm rounded transition-colors';
  const iconBtn = 'p-1.5 rounded transition-colors hover:bg-gray-100';

  return (
    <div
      className="flex items-center gap-2 px-4 h-11 border-b"
      style={{
        backgroundColor: 'var(--editor-bg-toolbar)',
        borderColor: 'var(--editor-border-color)',
      }}
    >
      {/* Style button (visual) */}
      <button
        className={`${btnBase} flex items-center gap-1.5`}
        style={{
          backgroundColor: 'var(--editor-brand-primary)',
          color: 'var(--editor-text-on-brand)',
        }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        Style
      </button>

      {/* Separator */}
      <div className="w-px h-6 mx-1" style={{ backgroundColor: 'var(--editor-border-color)' }} />

      {/* Undo / Redo (functional) */}
      <button onClick={handleUndo} className={iconBtn} title="Undo">
        <svg className="w-4 h-4" style={{ color: 'var(--editor-text-secondary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
      </button>
      <button onClick={handleRedo} className={iconBtn} title="Redo">
        <svg className="w-4 h-4" style={{ color: 'var(--editor-text-secondary)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/>
        </svg>
      </button>

      {/* Separator */}
      <div className="w-px h-6 mx-1" style={{ backgroundColor: 'var(--editor-border-color)' }} />

      {/* Device toggles (functional) */}
      <button
        onClick={() => handleDeviceChange('mobile')}
        className={iconBtn}
        style={{
          backgroundColor: activeDevice === 'mobile' ? 'var(--editor-brand-primary-light)' : 'transparent',
          color: activeDevice === 'mobile' ? 'var(--editor-brand-primary)' : 'var(--editor-text-secondary)',
        }}
        title="Mobile"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="7" y="2" width="10" height="20" rx="2"/>
          <line x1="12" y1="18" x2="12" y2="18"/>
        </svg>
      </button>
      <button
        onClick={() => handleDeviceChange('desktop')}
        className={iconBtn}
        style={{
          backgroundColor: activeDevice === 'desktop' ? 'var(--editor-brand-primary-light)' : 'transparent',
          color: activeDevice === 'desktop' ? 'var(--editor-brand-primary)' : 'var(--editor-text-secondary)',
        }}
        title="Desktop"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      </button>

      {/* Separator */}
      <div className="w-px h-6 mx-1" style={{ backgroundColor: 'var(--editor-border-color)' }} />

      {/* Edit canvas size (visual) */}
      <button className={`${btnBase} flex items-center gap-1.5 border`} style={{ borderColor: 'var(--editor-border-color)', color: 'var(--editor-text-primary)' }}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
        </svg>
        Edit canvas size
      </button>

      {/* Hide outlines (visual) */}
      <button className={`${btnBase} flex items-center gap-1.5 border`} style={{ borderColor: 'var(--editor-border-color)', color: 'var(--editor-text-primary)' }}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2"/>
        </svg>
        Hide outlines
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side visual buttons */}
      <button className="text-sm flex items-center gap-1" style={{ color: 'var(--editor-brand-primary-text)' }}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16" stroke="white" strokeWidth="2"/><line x1="8" y1="12" x2="16" y2="12" stroke="white" strokeWidth="2"/></svg>
        Personalization
      </button>
      <button className="text-sm flex items-center gap-1 ml-4" style={{ color: 'var(--editor-brand-primary-text)' }}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
        Manage languages
      </button>
      <button className="text-sm flex items-center gap-1 ml-4" style={{ color: 'var(--editor-brand-primary-text)' }}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        Copywriter
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/components/editor/Toolbar.tsx
git commit -m "feat: add Toolbar component with undo/redo and device toggles"
```

---

### Task 6: Create Sidebar Component

**Files:**
- Create: `app/components/editor/Sidebar.tsx`

**Step 1: Create the component**

Uses `BlocksProvider` from `@grapesjs/react` for drag-and-drop support.

```tsx
'use client';

import { useState } from 'react';
import { BlocksProvider } from '@grapesjs/react';
import type { Block } from 'grapesjs';

interface BlockItemProps {
  block: Block;
  dragStart: (block: Block, ev?: Event) => void;
  dragStop: (cancel?: boolean) => void;
}

function BlockItem({ block, dragStart, dragStop }: BlockItemProps) {
  return (
    <div
      draggable
      onDragStart={(e) => dragStart(block, e.nativeEvent)}
      onDragEnd={() => dragStop(false)}
      className="flex flex-col items-center justify-center p-3 rounded-lg border cursor-grab transition-colors"
      style={{
        backgroundColor: 'var(--editor-block-bg)',
        borderColor: 'var(--editor-block-border)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--editor-block-hover-bg)';
        e.currentTarget.style.borderColor = 'var(--editor-block-hover-border)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--editor-block-bg)';
        e.currentTarget.style.borderColor = 'var(--editor-block-border)';
      }}
    >
      <div
        className="w-8 h-8 mb-1 flex items-center justify-center"
        style={{ color: 'var(--editor-block-icon-color)' }}
        dangerouslySetInnerHTML={{ __html: block.getMedia() || '' }}
      />
      <span className="text-xs text-center" style={{ color: 'var(--editor-text-primary)' }}>
        {block.getLabel()}
      </span>
    </div>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div
        className="flex items-start pt-4 border-r"
        style={{ backgroundColor: 'var(--editor-bg-sidebar)', borderColor: 'var(--editor-border-color)' }}
      >
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 hover:bg-gray-100 rounded"
          style={{ color: 'var(--editor-text-secondary)' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-72 border-r flex flex-col overflow-y-auto"
      style={{ backgroundColor: 'var(--editor-bg-sidebar)', borderColor: 'var(--editor-border-color)' }}
    >
      {/* Collapse button */}
      <div className="flex justify-end p-2">
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 hover:bg-gray-100 rounded"
          style={{ color: 'var(--editor-text-secondary)' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>

      <BlocksProvider>
        {({ mapCategoryBlocks, dragStart, dragStop }) => (
          <div className="px-4 pb-4">
            {Array.from(mapCategoryBlocks).map(([category, blocks]) => (
              <div key={category} className="mb-6">
                <h3
                  className="text-sm font-semibold mb-1"
                  style={{ color: 'var(--editor-text-primary)' }}
                >
                  {category}
                </h3>
                <p className="text-xs mb-3" style={{ color: 'var(--editor-text-muted)' }}>
                  {category === 'Rows'
                    ? 'Drag a row into your message'
                    : 'Drag and drop a block into a row'}
                </p>
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
                {/* Separator */}
                <div className="mt-4 border-b" style={{ borderColor: 'var(--editor-border-color)' }} />
              </div>
            ))}
          </div>
        )}
      </BlocksProvider>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/components/editor/Sidebar.tsx
git commit -m "feat: add Sidebar component with draggable blocks"
```

---

### Task 7: Create CustomEditor Wrapper

**Files:**
- Create: `app/components/editor/CustomEditor.tsx`

This is the main editor component that brings everything together.

**Step 1: Create the component**

```tsx
'use client';

import { useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import grapesjs, { Editor } from 'grapesjs';
import GjsEditor, { Canvas, WithEditor } from '@grapesjs/react';

import TopNav from './TopNav';
import Toolbar from './Toolbar';
import Sidebar from './Sidebar';
import brazeBlocksPlugin from '../../lib/editor-blocks-plugin';
import '../../lib/editor-theme.css';

const DEFAULT_BANNER_NAME = 'New Campaign';

const DEVICES = [
  { id: 'Desktop', name: 'Desktop', width: '' },
  { id: 'Mobile', name: 'Mobile', width: '320px', widthMedia: '768px' },
];

interface CustomEditorProps {
  mode?: 'banner' | 'creative';
}

export default function CustomEditor({ mode = 'banner' }: CustomEditorProps) {
  const [editor, setEditor] = useState<Editor>();
  const [itemId, setItemId] = useState<string | null>(null);
  const [itemName, setItemName] = useState(DEFAULT_BANNER_NAME);
  const [saving, setSaving] = useState(false);
  const [bannerId, setBannerId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const dataRef = useRef<{ projectData: unknown; name: string } | null>(null);

  const loadItem = useCallback(async (id: string, editorInstance: Editor) => {
    try {
      const endpoint = mode === 'creative' ? `/api/creatives/${id}` : `/api/banners/${id}`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();

      if (data) {
        setItemName(data.name);
        dataRef.current = data;
        if (mode === 'creative') {
          setBannerId(data.bannerId);
        }
        if (data.projectData) {
          editorInstance.loadProjectData(data.projectData);
        }
      }
    } catch (error) {
      console.error('Error loading:', error);
    }
  }, [mode]);

  const loadTemplate = useCallback(async (templateId: string, editorInstance: Editor) => {
    try {
      const response = await fetch(`/api/banners/${templateId}`);
      if (!response.ok) throw new Error('Failed to load template');
      const data = await response.json();

      if (data) {
        setItemName(`${data.name} - Creative`);
        setBannerId(templateId);
        if (data.projectData) {
          editorInstance.loadProjectData(data.projectData);
        }
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  }, []);

  const onReady = useCallback(async (editorInstance: Editor) => {
    setEditor(editorInstance);

    const id = searchParams.get('id');
    const templateId = searchParams.get('templateId');

    if (id) {
      setItemId(id);
      await loadItem(id, editorInstance);
    } else if (mode === 'creative' && templateId) {
      await loadTemplate(templateId, editorInstance);
    }
  }, [searchParams, mode, loadItem, loadTemplate]);

  const saveItem = async () => {
    if (!editor) return;

    try {
      setSaving(true);
      const projectData = editor.getProjectData();
      const html = editor.getHtml();
      const css = editor.getCss();

      if (mode === 'creative') {
        const creativeData = {
          name: itemName,
          bannerId: bannerId || '',
          projectData,
          html,
          css,
        };

        if (itemId) {
          const response = await fetch(`/api/creatives/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creativeData),
          });
          if (!response.ok) throw new Error('Failed to update');
        } else {
          const response = await fetch('/api/creatives', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creativeData),
          });
          if (!response.ok) throw new Error('Failed to create');
          const data = await response.json();
          if (data) {
            setItemId(data.id);
            router.replace(`/creatives/${data.id}`);
          }
        }
      } else {
        const bannerData = {
          name: itemName,
          projectData,
          html,
          css,
          editorType: 'grapesjs',
        };

        if (itemId) {
          const response = await fetch(`/api/banners/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bannerData),
          });
          if (!response.ok) throw new Error('Failed to update');
        } else {
          const response = await fetch('/api/banners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bannerData),
          });
          if (!response.ok) throw new Error('Failed to create');
          const data = await response.json();
          if (data) {
            setItemId(data.id);
            router.replace(`/editor?id=${data.id}`);
          }
        }
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(mode === 'creative' ? '/creatives' : '/');
  };

  return (
    <GjsEditor
      grapesjs={grapesjs}
      grapesjsCss="https://unpkg.com/grapesjs/dist/css/grapes.min.css"
      options={{
        height: '100%',
        storageManager: false,
        deviceManager: { devices: DEVICES, default: 'Mobile' },
        panels: { defaults: [] },
        blockManager: { custom: true },
      }}
      plugins={[brazeBlocksPlugin]}
      onReady={onReady}
    >
      <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--editor-bg-body)' }}>
        <TopNav
          campaignName={itemName}
          onCampaignNameChange={setItemName}
          onCancel={handleCancel}
          onDone={saveItem}
          saving={saving}
        />
        <WithEditor>
          <Toolbar />
        </WithEditor>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <Canvas className="flex-1" style={{ backgroundColor: 'var(--editor-bg-canvas)' }} />
        </div>
      </div>
    </GjsEditor>
  );
}
```

**Step 2: Commit**

```bash
git add app/components/editor/CustomEditor.tsx
git commit -m "feat: add CustomEditor wrapper with GjsEditor + Canvas"
```

---

### Task 8: Replace BannerEditor with CustomEditor

**Files:**
- Modify: `app/components/BannerEditor.tsx` (replace entirely)
- Modify: `app/editor/EditorClient.tsx`
- Modify: `app/editor/page.tsx`
- Delete: `app/components/EditorSettings.tsx` (Studio SDK specific, no longer needed)

**Step 1: Replace BannerEditor.tsx**

Replace the entire file with a thin wrapper:

```tsx
'use client';

import CustomEditor from './editor/CustomEditor';

export default function BannerEditor() {
  return <CustomEditor mode="banner" />;
}
```

**Step 2: Simplify EditorClient.tsx**

```tsx
'use client';

import BannerEditor from '../components/BannerEditor';

export default function EditorClient() {
  return <BannerEditor />;
}
```

**Step 3: Simplify editor/page.tsx**

```tsx
import { Suspense } from 'react';
import EditorClient from './EditorClient';

export default function EditorPage() {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <EditorClient />
    </Suspense>
  );
}
```

**Step 4: Delete EditorSettings.tsx** (was Studio SDK specific)

```bash
rm app/components/EditorSettings.tsx
```

**Step 5: Commit**

```bash
git add app/components/BannerEditor.tsx app/editor/EditorClient.tsx app/editor/page.tsx
git add app/components/EditorSettings.tsx
git commit -m "refactor: replace Studio SDK editor with CustomEditor"
```

---

### Task 9: Update CreativeEditor

**Files:**
- Modify: `app/components/CreativeEditor.tsx`

**Step 1: Replace with CustomEditor wrapper**

```tsx
'use client';

import CustomEditor from './editor/CustomEditor';

export default function CreativeEditor() {
  return <CustomEditor mode="creative" />;
}
```

**Step 2: Commit**

```bash
git add app/components/CreativeEditor.tsx
git commit -m "refactor: replace Creative editor with CustomEditor"
```

---

### Task 10: Clean Up Unused References

**Files:**
- Modify: `app/api/editor-settings/route.ts` (may reference EditorSettings)
- Modify: `app/components/ui/switch.tsx` (check if still used)
- Modify: `prisma/schema.prisma` (check EditorSettings model — keep or remove)
- Modify: `.env.local` (remove NEXT_PUBLIC_GRAPESJS_LICENSE_KEY if no longer needed)

**Step 1: Check for broken imports**

Search the codebase for imports of deleted files:
- `EditorSettings`
- `@grapesjs/studio-sdk`
- `@grapesjs/studio-sdk-plugins`
- `canvasAbsoluteMode`
- `StudioCommands`
- `ToastVariant`
- `StudioEditor`

Remove or fix any remaining references.

**Step 2: Decide on EditorSettings**

The `EditorSettings` component and API route were specific to the Studio SDK's style manager sectors. Since the new editor doesn't use them, they can be removed or kept as a placeholder. For the POC, remove the component but keep the API route and Prisma model (no migration needed).

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: clean up Studio SDK references"
```

---

### Task 11: Verify Build and Smoke Test

**Step 1: Run build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 2: Fix any issues**

If build fails, check error messages and fix broken imports or type errors.

**Step 3: Start dev server**

```bash
npm run dev
```

**Step 4: Smoke test**

1. Visit homepage `/` — should show banner list
2. Click "Create New Template" — should open the new Braze-style editor with:
   - TopNav with tabs (Compose/Settings/Preview)
   - Toolbar with undo/redo and device toggles
   - Sidebar with Rows and Blocks sections
   - Canvas in the center
3. Drag a "1 Column" row into the canvas
4. Drag a "Title" block into the row
5. Edit the title text
6. Click "Done" to save
7. Verify it appears in the banner list on homepage

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address build and runtime issues"
```

---

### Task 12: Final Commit

**Step 1: Stage and commit all remaining changes**

```bash
git add -A
git commit -m "feat: Braze-style custom GrapeJS editor with themeable UI

Replace @grapesjs/studio-sdk with core grapesjs + @grapesjs/react.
Build fully custom UI with TopNav, Toolbar, and Sidebar components.

Features:
- Custom blocks: Title, Paragraph, Button, Image, Link, Spacer, Custom Code, Phone/Email Capture
- Row layouts: 1, 2, 3 column templates
- Functional: Undo/Redo, Device toggles (mobile/desktop), Block drag-and-drop
- Visual: Compose/Settings/Preview tabs, Style, Canvas size, Outlines, Personalization buttons
- Themeable: All colors via CSS custom properties (editor-theme.css)
- Works for both Banner and Creative editing modes"
```
