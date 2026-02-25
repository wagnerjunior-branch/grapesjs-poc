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
        styles: `.bz-row { display: flex; width: 100%; min-height: 50px; }`,
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
        styles: `.bz-column { flex: 1; padding: 10px; min-height: 50px; }`,
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
        styles: `.bz-title { font-size: 24px; font-weight: 700; text-align: center; padding: 10px; font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }`,
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
        styles: `.bz-text { font-size: 14px; font-weight: 400; text-align: center; padding: 10px; line-height: 1.5; font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }`,
      },
    },
  });

  cm.addType('bz-button', {
    model: {
      defaults: {
        tagName: 'button',
        attributes: { class: 'bz-btn' },
        content: 'Click me',
        styles: `.bz-btn { display: inline-block; padding: 15px 25px; background-color: #008294; color: #ffffff; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; text-align: center; transition: opacity 0.2s ease; font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; } .bz-btn:hover { opacity: 0.8; }`,
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
        styles: `.bz-img { max-width: 100%; height: auto; display: block; }`,
      },
    },
  });

  cm.addType('bz-link', {
    extend: 'link',
    model: {
      defaults: {
        attributes: { class: 'bz-link' },
        content: 'Link text',
        styles: `.bz-link { color: #008294; text-decoration: underline; cursor: pointer; }`,
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
        styles: `.bz-spacer { height: 20px; width: 100%; }`,
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
          { tagName: 'label', content: 'Phone Number', attributes: { class: 'bz-input-label' } },
          { tagName: 'input', void: true, attributes: { type: 'tel', placeholder: 'Enter phone number', class: 'bz-input-field' } },
        ],
        styles: `.bz-phone-capture { padding: 10px; } .bz-input-label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 4px; } .bz-input-field { width: 100%; padding: 10px; border: 1px solid #A8B3B8; border-radius: 4px; font-size: 14px; min-height: 40px; } .bz-input-field:focus { border-color: #008294; border-width: 2px; outline: none; }`,
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
          { tagName: 'label', content: 'Email Address', attributes: { class: 'bz-input-label' } },
          { tagName: 'input', void: true, attributes: { type: 'email', placeholder: 'Enter email address', class: 'bz-input-field' } },
        ],
        styles: `.bz-email-capture { padding: 10px; }`,
      },
    },
  });

  // --- Row Blocks ---

  bm.add('row-1col', {
    label: '1 Column',
    category: 'Rows',
    media: '<svg viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="96" height="46" rx="3" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    content: { type: 'bz-row', components: [{ type: 'bz-column' }] },
  });

  bm.add('row-2col', {
    label: '2 Columns',
    category: 'Rows',
    media: '<svg viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="46" height="46" rx="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="52" y="2" width="46" height="46" rx="3" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    content: { type: 'bz-row', components: [{ type: 'bz-column' }, { type: 'bz-column' }] },
  });

  bm.add('row-3col', {
    label: '3 Columns',
    category: 'Rows',
    media: '<svg viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="29" height="46" rx="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="35" y="2" width="29" height="46" rx="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="68" y="2" width="29" height="46" rx="3" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
    content: { type: 'bz-row', components: [{ type: 'bz-column' }, { type: 'bz-column' }, { type: 'bz-column' }] },
  });

  // --- Content Blocks ---

  bm.add('title-block', {
    label: 'Title', category: 'Blocks',
    media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 6h16M4 12h10"/></svg>',
    content: { type: 'bz-title' },
  });

  bm.add('text-block', {
    label: 'Paragraph', category: 'Blocks',
    media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 6h16M4 10h16M4 14h16M4 18h10"/></svg>',
    content: { type: 'bz-text' },
  });

  bm.add('button-block', {
    label: 'Button', category: 'Blocks',
    media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="20" height="10" rx="3"/><path d="M7 12h10"/></svg>',
    content: { type: 'bz-button' },
  });

  bm.add('image-block', {
    label: 'Image', category: 'Blocks',
    media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    content: { type: 'bz-image' },
  });

  bm.add('link-block', {
    label: 'Link', category: 'Blocks',
    media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>',
    content: { type: 'bz-link' },
  });

  bm.add('spacer-block', {
    label: 'Spacer', category: 'Blocks',
    media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14" stroke-dasharray="2 2"/></svg>',
    content: { type: 'bz-spacer' },
  });

  bm.add('html-block', {
    label: 'Custom Code', category: 'Blocks',
    media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    content: { type: 'bz-html' },
  });

  bm.add('phone-block', {
    label: 'Phone Capture', category: 'Blocks',
    media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>',
    content: { type: 'bz-phone' },
  });

  bm.add('email-block', {
    label: 'Email Capture', category: 'Blocks',
    media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 4 12 13 2 4"/></svg>',
    content: { type: 'bz-email' },
  });
};

export default brazeBlocksPlugin;
