import type { Data } from '@measured/puck';

// ---------------------------------------------------------------------------
// Claude component type (shared between server and client)
// ---------------------------------------------------------------------------

export interface ClaudeComponent {
  type: 'Flex' | 'Grid' | 'Space' | 'Heading' | 'Text' | 'Image' | 'Button' | 'Divider';
  props: Record<string, any>;
  children?: ClaudeComponent[];
}

// ---------------------------------------------------------------------------
// Convert Claude JSON component array → Puck Data
// ---------------------------------------------------------------------------

let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `comp-${idCounter}`;
}

/** Container types that support DropZone children */
const CONTAINER_TYPES = new Set(['Flex', 'Grid']);

export function jsonToPuckData(components: ClaudeComponent[]): Data {
  idCounter = 0;

  const content: Data['content'] = [];
  const zones: Record<string, Data['content']> = {};

  function processComponent(comp: ClaudeComponent, parentZone?: string) {
    const id = nextId();
    const { children, ...rest } = comp;
    const item = {
      type: comp.type as string,
      props: { ...rest.props, id },
    };

    if (parentZone) {
      if (!zones[parentZone]) zones[parentZone] = [];
      zones[parentZone].push(item);
    } else {
      content.push(item);
    }

    // If this is a container with children, populate its zone
    if (CONTAINER_TYPES.has(comp.type) && children && children.length > 0) {
      const zoneName = `${id}:children`;
      zones[zoneName] = [];
      for (const child of children) {
        processComponent(child, zoneName);
      }
    }
  }

  for (const comp of components) {
    processComponent(comp);
  }

  return {
    content,
    root: { props: {} },
    zones: Object.keys(zones).length > 0 ? zones : undefined,
  } as Data;
}

// ---------------------------------------------------------------------------
// Convert Claude component tree → flat HTML string
// ---------------------------------------------------------------------------

export function componentsToHtml(components: ClaudeComponent[]): string {
  return components.map(componentToHtml).join('\n');
}

function componentToHtml(comp: ClaudeComponent): string {
  const p = comp.props;

  switch (comp.type) {
    case 'Flex': {
      const style = [
        'display:flex',
        `flex-direction:${p.direction || 'column'}`,
        p.wrap ? `flex-wrap:${p.wrap}` : '',
        `align-items:${p.alignItems || 'stretch'}`,
        `justify-content:${p.justifyContent || 'flex-start'}`,
        `gap:${p.gap != null ? `${p.gap}px` : '0px'}`,
        `padding:${p.paddingTop || '0px'} ${p.paddingRight || '0px'} ${p.paddingBottom || '0px'} ${p.paddingLeft || '0px'}`,
        p.backgroundColor ? `background-color:${p.backgroundColor}` : '',
        `max-width:${p.maxWidth || '100%'}`,
        `border-radius:${p.borderRadius || '0px'}`,
        'width:100%',
        'box-sizing:border-box',
      ]
        .filter(Boolean)
        .join(';');

      const childrenHtml = comp.children
        ? comp.children.map(componentToHtml).join('\n')
        : '';

      return `<div style="${style}">\n${childrenHtml}\n</div>`;
    }

    case 'Grid': {
      const cols = p.numColumns || 2;
      const style = [
        'display:grid',
        `grid-template-columns:repeat(${cols}, 1fr)`,
        `gap:${p.gap != null ? `${p.gap}px` : '16px'}`,
        `align-items:${p.alignItems || 'stretch'}`,
        `padding:${p.paddingTop || '0px'} ${p.paddingRight || '0px'} ${p.paddingBottom || '0px'} ${p.paddingLeft || '0px'}`,
        p.backgroundColor ? `background-color:${p.backgroundColor}` : '',
        `max-width:${p.maxWidth || '100%'}`,
        `border-radius:${p.borderRadius || '0px'}`,
        'width:100%',
        'box-sizing:border-box',
      ]
        .filter(Boolean)
        .join(';');

      const childrenHtml = comp.children
        ? comp.children.map(componentToHtml).join('\n')
        : '';

      return `<div style="${style}">\n${childrenHtml}\n</div>`;
    }

    case 'Space': {
      const dir = p.direction || 'vertical';
      const size = p.size || '24px';
      if (dir === 'horizontal') {
        return `<div style="width:${size};height:0px"></div>`;
      }
      return `<div style="height:${size}"></div>`;
    }

    case 'Heading': {
      const tag = p.level || 'h2';
      const style = [
        `color:${p.color || '#000'}`,
        `font-size:${p.fontSize || '24px'}`,
        `font-weight:${p.fontWeight || '700'}`,
        `text-align:${p.textAlign || 'left'}`,
        'margin:0',
      ].join(';');
      return `<${tag} style="${style}">${p.text || ''}</${tag}>`;
    }

    case 'Text': {
      const style = [
        `color:${p.color || '#333'}`,
        `font-size:${p.fontSize || '16px'}`,
        `font-weight:${p.fontWeight || '400'}`,
        `text-align:${p.textAlign || 'left'}`,
        'margin:0',
      ].join(';');
      return `<p style="${style}">${p.text || ''}</p>`;
    }

    case 'Image': {
      const style = [
        `width:${p.width || '100%'}`,
        `height:${p.height || 'auto'}`,
        `object-fit:${p.objectFit || 'cover'}`,
        `border-radius:${p.borderRadius || '0px'}`,
        'display:block',
      ].join(';');
      return `<img src="${p.src || ''}" alt="${p.alt || ''}" style="${style}" />`;
    }

    case 'Button': {
      const style = [
        `display:${p.fullWidth ? 'block' : 'inline-block'}`,
        `background-color:${p.backgroundColor || '#2563eb'}`,
        `color:${p.color || '#fff'}`,
        `font-size:${p.fontSize || '16px'}`,
        `font-weight:${p.fontWeight || '600'}`,
        `padding:${p.paddingY || '12px'} ${p.paddingX || '24px'}`,
        `border-radius:${p.borderRadius || '8px'}`,
        'text-decoration:none',
        'text-align:center',
        'cursor:pointer',
        p.fullWidth ? 'width:100%' : '',
        'box-sizing:border-box',
        'border:none',
      ]
        .filter(Boolean)
        .join(';');
      return `<a href="${p.href || '#'}" style="${style}">${p.text || ''}</a>`;
    }

    case 'Divider':
      return `<hr style="border:none;border-top:${p.thickness || '1px'} solid ${p.color || '#e5e7eb'};margin:0;width:100%" />`;

    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Build Puck data from imported HTML (backward compat)
// ---------------------------------------------------------------------------

export function htmlToPuckData(html: string) {
  return {
    content: [
      {
        type: 'HtmlBlock' as const,
        props: {
          html,
          id: 'html-block-1',
        },
      },
    ],
    root: { props: {} },
  };
}

// ---------------------------------------------------------------------------
// Parse HTML → ClaudeComponent[] (client-only, uses DOMParser)
// ---------------------------------------------------------------------------

type Styles = Record<string, string>;

/**
 * Parse the raw `style` attribute into a camelCase property map.
 * More reliable than `el.style.*` which can be inconsistent in
 * DOMParser-created documents.
 */
function parseInlineStyles(el: Element): Styles {
  const result: Styles = {};
  const raw = el.getAttribute('style') || '';

  for (const decl of raw.split(';')) {
    const idx = decl.indexOf(':');
    if (idx < 0) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const val = decl.slice(idx + 1).trim();
    if (!prop || !val) continue;

    if (prop === 'padding') {
      expandShorthand(result, val, 'padding');
      continue;
    }

    result[kebabToCamel(prop)] = val;
  }

  return result;
}

function kebabToCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Expand a CSS box shorthand (padding/margin) into Top/Right/Bottom/Left longhands. */
function expandShorthand(out: Styles, val: string, prefix: string): void {
  const p = val.split(/\s+/);
  const [t, r = t, b = t, l = r] = p;
  out[`${prefix}Top`] = t;
  out[`${prefix}Right`] = r;
  out[`${prefix}Bottom`] = b;
  out[`${prefix}Left`] = l;
}

function parsePx(value: string | undefined, fallback: number = 0): number {
  if (!value) return fallback;
  const n = parseFloat(value);
  return isNaN(n) ? fallback : n;
}

function ensurePx(value: string | undefined, fallback: string = '0px'): string {
  if (!value) return fallback;
  if (/[a-z%]$/i.test(value)) return value;
  return `${value}px`;
}

const HEADING_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
const TEXT_TAGS = new Set(['P', 'SPAN', 'LABEL', 'STRONG', 'EM', 'B', 'I', 'SMALL']);
const BOLD_TAGS = new Set(['STRONG', 'B']);

/** Tags that map to dedicated Puck components — prevents parent from collapsing to Text. */
const COMPONENT_MAPPED_TAGS = new Set([
  'DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'NAV', 'MAIN', 'ASIDE',
  'UL', 'OL', 'LI', 'TABLE', 'FORM', 'FIELDSET', 'FIGURE', 'FIGCAPTION',
  'BLOCKQUOTE', 'PRE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'HR',
  'BUTTON', 'A', 'IMG',
  'THEAD', 'TBODY', 'TR', 'TD', 'TH',
]);

/** Tags treated as layout containers (→ Flex/Grid/Space). */
const CONTAINER_TAGS = new Set([
  'DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'NAV', 'MAIN', 'ASIDE',
  'UL', 'OL', 'LI', 'FORM', 'FIELDSET', 'FIGURE', 'BLOCKQUOTE', 'TABLE',
  'THEAD', 'TBODY', 'TR', 'TD', 'TH',
]);

// -- Reusable prop builders (DRY) ------------------------------------------

function textProps(el: Element, s: Styles, defaultWeight = '400'): ClaudeComponent {
  return {
    type: 'Text',
    props: {
      text: el.textContent?.trim() ?? '',
      color: s.color || '#333333',
      fontSize: ensurePx(s.fontSize, '16px'),
      fontWeight: s.fontWeight || defaultWeight,
      textAlign: s.textAlign || 'left',
    },
  };
}

function buttonProps(el: Element, s: Styles, href: string): ClaudeComponent {
  return {
    type: 'Button',
    props: {
      text: el.textContent?.trim() ?? '',
      href,
      backgroundColor: s.backgroundColor || '#2563eb',
      color: s.color || '#ffffff',
      fontSize: ensurePx(s.fontSize, '16px'),
      fontWeight: s.fontWeight || '600',
      paddingX: ensurePx(s.paddingLeft || s.paddingRight, '24px'),
      paddingY: ensurePx(s.paddingTop || s.paddingBottom, '12px'),
      borderRadius: ensurePx(s.borderRadius, '8px'),
      fullWidth: s.display === 'block' && s.width === '100%',
    },
  };
}

function containerProps(s: Styles) {
  return {
    paddingTop: ensurePx(s.paddingTop, '0px'),
    paddingRight: ensurePx(s.paddingRight, '0px'),
    paddingBottom: ensurePx(s.paddingBottom, '0px'),
    paddingLeft: ensurePx(s.paddingLeft, '0px'),
    backgroundColor: s.backgroundColor || '',
    borderRadius: ensurePx(s.borderRadius, '0px'),
    maxWidth: s.maxWidth || '100%',
  };
}

function parseGridColumns(value: string | undefined): number {
  if (!value) return 2;
  const m = value.match(/repeat\(\s*(\d+)/);
  if (m) return parseInt(m[1], 10);
  return value.trim().split(/\s+/).length || 2;
}

/** Returns true when all children are plain inline elements (no component-mapped tags). */
function hasOnlyInlineChildren(el: Element): boolean {
  for (let i = 0; i < el.children.length; i++) {
    if (COMPONENT_MAPPED_TAGS.has(el.children[i].tagName)) return false;
  }
  return true;
}

// -- Recursive DOM → Component conversion -----------------------------------

function elementToComponent(el: Element): ClaudeComponent | null {
  const s = parseInlineStyles(el);
  const tag = el.tagName;

  if (s.display === 'none') return null;

  // <img>
  if (tag === 'IMG') {
    return {
      type: 'Image',
      props: {
        src: el.getAttribute('src') || '',
        alt: el.getAttribute('alt') || '',
        width: ensurePx(s.width, '100%'),
        height: ensurePx(s.height, 'auto'),
        objectFit: s.objectFit || 'cover',
        borderRadius: ensurePx(s.borderRadius, '0px'),
      },
    };
  }

  // <hr>
  if (tag === 'HR') {
    let thickness = '1px';
    let color = '#e5e7eb';
    if (s.borderTop) {
      const parts = s.borderTop.split(/\s+/);
      if (parts[0]) thickness = ensurePx(parts[0], '1px');
      if (parts[2]) color = parts[2];
    }
    if (s.borderTopColor) color = s.borderTopColor;
    if (s.borderTopWidth) thickness = ensurePx(s.borderTopWidth, '1px');
    return { type: 'Divider', props: { color, thickness } };
  }

  // <br>
  if (tag === 'BR') {
    return { type: 'Space', props: { size: '16px', direction: 'vertical' } };
  }

  // <h1>–<h6>
  if (HEADING_TAGS.has(tag)) {
    return {
      type: 'Heading',
      props: {
        text: el.textContent?.trim() ?? '',
        level: tag.toLowerCase() as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
        color: s.color || '#000000',
        fontSize: ensurePx(s.fontSize, '24px'),
        fontWeight: s.fontWeight || '700',
        textAlign: s.textAlign || 'left',
      },
    };
  }

  // <button>
  if (tag === 'BUTTON') return buttonProps(el, s, '#');

  // <a> → Button (if has background) or Text
  if (tag === 'A') {
    const bg = s.backgroundColor;
    if (bg && bg !== 'transparent' && bg !== 'none') {
      return buttonProps(el, s, el.getAttribute('href') || '#');
    }
    return textProps(el, s);
  }

  // <p>, <span>, <strong>, etc.
  if (TEXT_TAGS.has(tag)) {
    return textProps(el, s, BOLD_TAGS.has(tag) ? '700' : '400');
  }

  // Container elements (<div>, <section>, etc.)
  if (CONTAINER_TAGS.has(tag)) {
    const text = el.textContent?.trim() ?? '';

    // Empty spacer (no children, no text, has explicit size)
    if (el.children.length === 0 && !text && (s.height || s.width)) {
      return {
        type: 'Space',
        props: {
          size: ensurePx(s.height || s.width, '24px'),
          direction: s.height ? 'vertical' : 'horizontal',
        },
      };
    }

    // Text-only container or inline-only wrapper → Text
    if (el.children.length === 0 && text) return textProps(el, s);
    if (hasOnlyInlineChildren(el) && text && el.children.length <= 2) {
      return textProps(el, s);
    }

    const children = processChildren(el);
    const shared = containerProps(s);

    if (s.display === 'grid') {
      return {
        type: 'Grid',
        props: {
          numColumns: parseGridColumns(s.gridTemplateColumns),
          gap: parsePx(s.gap),
          alignItems: s.alignItems || 'stretch',
          ...shared,
        },
        children,
      };
    }

    return {
      type: 'Flex',
      props: {
        direction: s.flexDirection || 'column',
        justifyContent: s.justifyContent || 'flex-start',
        alignItems: s.alignItems || 'stretch',
        wrap: s.flexWrap || 'nowrap',
        gap: parsePx(s.gap),
        ...shared,
      },
      children,
    };
  }

  // Fallback: unknown tag with text
  const text = el.textContent?.trim();
  if (text) return textProps(el, s);

  return null;
}

function processChildren(parent: Element): ClaudeComponent[] {
  const results: ClaudeComponent[] = [];
  for (let i = 0; i < parent.children.length; i++) {
    const comp = elementToComponent(parent.children[i]);
    if (comp) results.push(comp);
  }
  return results;
}

/**
 * Parse an HTML string into native ClaudeComponent[].
 * Uses DOMParser (browser-only). Returns empty array on server.
 */
export function htmlToComponents(html: string): ClaudeComponent[] {
  if (typeof window === 'undefined' || !html.trim()) return [];

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const { body } = doc;

  if (!body?.children.length) {
    const text = body?.textContent?.trim();
    return text
      ? [{ type: 'Text', props: { text, color: '#333333', fontSize: '16px', fontWeight: '400', textAlign: 'left' } }]
      : [];
  }

  return processChildren(body);
}
