/**
 * puck-html-document.ts
 *
 * Full HTML document import/export for Puck editor.
 * Handles complete HTML documents with <html>, <head>, <style>, <script> tags.
 * Resolves class-based CSS into inline styles for import, and reconstructs
 * the original document structure with updated CSS on export.
 *
 * Server-safe: no React imports, no 'use client' directive.
 */

import type { Data } from '@measured/puck';
import { htmlToComponents } from './puck-components';
import type { ClaudeComponent } from './puck-components';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ElementMeta {
  tag: string;                              // original HTML tag: "h1", "div", "main"
  classes: string[];                        // ["branch-banner-description"]
  id?: string;                              // element id
  dataId?: string;                          // data-id attribute
  attrs: Record<string, string>;            // all other attributes (role, tabindex, aria-*)
  cssSelector: string;                      // best matching CSS selector
  originalStyles: Record<string, string>;   // snapshot of resolved CSS for diffing
}

export interface ParsedCSSRule {
  selector: string;                         // "" for @media etc.
  properties: Record<string, string>;       // kebab-case CSS properties
  rawText: string;                          // original rule text
}

export interface DocumentMeta {
  headContent: string;         // everything in <head> except <style>
  styleContent: string;        // raw <style> text content
  styleTagAttributes: string;  // e.g. 'type="text/css" id="branch-css"'
  cssRules: ParsedCSSRule[];   // structured CSS rules
  bodyScripts: string;         // all <script>, <meta>, etc. from body
  htmlAttributes: string;      // attributes on <html> tag
  bodyAttributes: string;      // attributes on <body> tag
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Puck prop name -> CSS property (kebab-case) mapping for diffing. */
const PUCK_TO_CSS: Record<string, string> = {
  color: 'color',
  fontSize: 'font-size',
  fontWeight: 'font-weight',
  textAlign: 'text-align',
  backgroundColor: 'background-color',
  paddingTop: 'padding-top',
  paddingRight: 'padding-right',
  paddingBottom: 'padding-bottom',
  paddingLeft: 'padding-left',
  gap: 'gap',
  borderRadius: 'border-radius',
  maxWidth: 'max-width',
  backgroundImage: 'background-image',
  backgroundSize: 'background-size',
  backgroundPosition: 'background-position',
};

/** Tags that are non-visual and should be stripped from body during import. */
const NON_VISUAL_TAGS = new Set(['SCRIPT', 'META', 'LINK', 'NOSCRIPT', 'STYLE']);

/** Container component types that have DropZone children zones. */
const CONTAINER_TYPES = new Set(['Flex', 'Grid']);

/** Expected mapping from DOM tag to Puck component type for sanity checking. */
const TAG_TO_PUCK_TYPE: Record<string, string[]> = {
  h1: ['Heading'], h2: ['Heading'], h3: ['Heading'], h4: ['Heading'], h5: ['Heading'], h6: ['Heading'],
  p: ['Text'], span: ['Text'], strong: ['Text'], em: ['Text'], b: ['Text'], i: ['Text'], small: ['Text'], label: ['Text'],
  img: ['Image'],
  a: ['Button', 'Text'],
  button: ['Button'],
  hr: ['Divider'],
  br: ['Space'],
  div: ['Flex', 'Grid', 'Space', 'Text'],
  section: ['Flex', 'Grid'], article: ['Flex', 'Grid'], header: ['Flex', 'Grid'], footer: ['Flex', 'Grid'],
  nav: ['Flex', 'Grid'], main: ['Flex', 'Grid'], aside: ['Flex', 'Grid'],
  ul: ['Flex', 'Grid'], ol: ['Flex', 'Grid'], li: ['Flex', 'Grid'],
  table: ['Flex', 'Grid'], form: ['Flex', 'Grid'], fieldset: ['Flex', 'Grid'],
  figure: ['Flex', 'Grid'], blockquote: ['Flex', 'Grid'],
  thead: ['Flex', 'Grid'], tbody: ['Flex', 'Grid'], tr: ['Flex', 'Grid'], td: ['Flex', 'Grid'], th: ['Flex', 'Grid'],
};

// ---------------------------------------------------------------------------
// Import-side functions
// ---------------------------------------------------------------------------

/**
 * Returns true if the HTML string appears to be a full HTML document
 * (contains <html, <!doctype, or <head tags).
 * A fragment with only a <style> tag does NOT qualify as a full document.
 */
export function isFullHtmlDocument(html: string): boolean {
  const lower = html.trim().toLowerCase();
  return lower.includes('<html') || lower.includes('<!doctype') || lower.includes('<head');
}

/**
 * Parse a CSS text string into structured ParsedCSSRule[].
 * Uses the browser CSSStyleSheet API for reliable parsing.
 * Non-style rules (@media, @keyframes) get empty selector and only rawText.
 */
export function parseCSSRules(cssText: string): ParsedCSSRule[] {
  if (typeof document === 'undefined') return parseCSSRulesFallback(cssText);

  const rules: ParsedCSSRule[] = [];

  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(cssText);

    for (let i = 0; i < sheet.cssRules.length; i++) {
      const rule = sheet.cssRules[i];

      if (rule instanceof CSSStyleRule) {
        const properties: Record<string, string> = {};
        const style = rule.style;
        for (let j = 0; j < style.length; j++) {
          const prop = style[j];
          properties[prop] = style.getPropertyValue(prop).trim();
        }
        rules.push({
          selector: rule.selectorText,
          properties,
          rawText: rule.cssText,
        });
      } else {
        // @media, @keyframes, @font-face, etc.
        rules.push({
          selector: '',
          properties: {},
          rawText: rule.cssText,
        });
      }
    }
  } catch {
    // If CSSStyleSheet API fails, use fallback regex parser
    return parseCSSRulesFallback(cssText);
  }

  return rules;
}

/**
 * Fallback CSS parser using regex for environments where CSSStyleSheet is unavailable.
 */
function parseCSSRulesFallback(cssText: string): ParsedCSSRule[] {
  const rules: ParsedCSSRule[] = [];
  // Remove comments
  const cleaned = cssText.replace(/\/\*[\s\S]*?\*\//g, '');

  // Match top-level rule blocks: selector { properties }
  // This handles simple rules but not nested @media well
  const ruleRegex = /([^{}]+)\{([^{}]*)\}/g;
  let match;

  while ((match = ruleRegex.exec(cleaned)) !== null) {
    const selector = match[1].trim();
    const body = match[2].trim();

    // Check if it's an at-rule
    if (selector.startsWith('@')) {
      rules.push({
        selector: '',
        properties: {},
        rawText: `${selector} { ${body} }`,
      });
    } else {
      const properties: Record<string, string> = {};
      for (const decl of body.split(';')) {
        const colonIdx = decl.indexOf(':');
        if (colonIdx < 0) continue;
        const prop = decl.slice(0, colonIdx).trim();
        const val = decl.slice(colonIdx + 1).trim();
        if (prop && val) {
          properties[prop] = val;
        }
      }
      rules.push({
        selector,
        properties,
        rawText: `${selector} { ${body} }`,
      });
    }
  }

  return rules;
}

/**
 * Resolve all CSS styles that apply to a given element by testing
 * each rule's selector against the element. Later rules override earlier ones.
 * Inline styles on the element always win.
 */
export function resolveStylesForElement(
  el: Element,
  rules: ParsedCSSRule[],
): Record<string, string> {
  const resolved: Record<string, string> = {};

  // Apply matching CSS rules in order (later rules override)
  for (const rule of rules) {
    if (!rule.selector) continue; // skip @media etc.
    try {
      if (el.matches(rule.selector)) {
        Object.assign(resolved, rule.properties);
      }
    } catch {
      // Invalid selector — skip
    }
  }

  // Merge inline styles (inline wins over CSS rules)
  const inlineStyle = el.getAttribute('style');
  if (inlineStyle) {
    for (const decl of inlineStyle.split(';')) {
      const colonIdx = decl.indexOf(':');
      if (colonIdx < 0) continue;
      const prop = decl.slice(0, colonIdx).trim().toLowerCase();
      const val = decl.slice(colonIdx + 1).trim();
      if (prop && val) {
        resolved[prop] = val;
      }
    }
  }

  return resolved;
}

/**
 * Convert a record of CSS properties (kebab-case) to an inline style string.
 * e.g. {"font-size": "28px", "color": "red"} -> "font-size: 28px; color: red"
 */
export function cssPropertiesToInlineStyle(props: Record<string, string>): string {
  return Object.entries(props)
    .map(([prop, val]) => `${prop}: ${val}`)
    .join('; ');
}

/**
 * Extract metadata from a DOM element for later round-trip export.
 */
export function extractElementMeta(
  el: Element,
  rules: ParsedCSSRule[],
  resolvedStyles: Record<string, string>,
): ElementMeta {
  const tag = el.tagName.toLowerCase();
  const classes = Array.from(el.classList);
  const id = el.id || undefined;
  const dataId = el.getAttribute('data-id') || undefined;

  // Collect all other attributes (exclude class, id, style, data-id)
  const attrs: Record<string, string> = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    if (['class', 'id', 'style', 'data-id'].includes(attr.name)) continue;
    attrs[attr.name] = attr.value;
  }

  // Find the best (most specific) matching CSS selector
  const cssSelector = findBestSelector(el, rules);

  return {
    tag,
    classes,
    id,
    dataId,
    attrs,
    cssSelector,
    originalStyles: { ...resolvedStyles },
  };
}

/**
 * Find the most specific CSS selector that matches this element.
 * Heuristic: longer selectors are more specific.
 */
function findBestSelector(el: Element, rules: ParsedCSSRule[]): string {
  let best = '';
  let bestSpecificity = -1;

  for (const rule of rules) {
    if (!rule.selector) continue;
    try {
      if (el.matches(rule.selector)) {
        // Simple heuristic: more specific selectors tend to be longer
        // and have more parts (ids, classes, etc.)
        const specificity = computeSimpleSpecificity(rule.selector);
        if (specificity > bestSpecificity) {
          bestSpecificity = specificity;
          best = rule.selector;
        }
      }
    } catch {
      // Invalid selector
    }
  }

  return best;
}

/**
 * Simple specificity scoring:
 * - Each #id adds 100
 * - Each .class adds 10
 * - Each tag name adds 1
 * - Each attribute selector adds 10
 */
function computeSimpleSpecificity(selector: string): number {
  let score = 0;
  // Count id selectors
  const ids = (selector.match(/#[a-zA-Z_-][\w-]*/g) || []).length;
  score += ids * 100;
  // Count class selectors
  const classes = (selector.match(/\.[a-zA-Z_-][\w-]*/g) || []).length;
  score += classes * 10;
  // Count attribute selectors
  const attrs = (selector.match(/\[/g) || []).length;
  score += attrs * 10;
  // Count tag names (rough: letters at start or after space/combinator)
  const tags = (selector.match(/(?:^|[\s>+~])([a-zA-Z][\w-]*)/g) || []).length;
  score += tags;
  return score;
}

/**
 * Extract attributes from an HTML tag string.
 * e.g. '<html lang="en" dir="ltr">' -> 'lang="en" dir="ltr"'
 */
function extractTagAttributes(html: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}\\s+([^>]*)>`, 'i');
  const match = html.match(regex);
  if (!match) return '';
  // Remove trailing slash if any
  return match[1].replace(/\/\s*$/, '').trim();
}

/**
 * Parse a full HTML document and extract its structural components.
 * Returns the document metadata, the body element (with non-visual elements removed),
 * and the parsed CSS rules.
 */
export function parseFullDocument(
  html: string,
): { documentMeta: DocumentMeta; bodyElement: Element; cssRules: ParsedCSSRule[] } | null {
  if (typeof window === 'undefined') return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // --- Extract <style> content and attributes ---
  const styleElements = doc.querySelectorAll('style');
  let styleContent = '';
  let styleTagAttributes = '';
  styleElements.forEach((styleEl) => {
    styleContent += styleEl.textContent || '';
    // Capture attributes from the first style tag
    if (!styleTagAttributes) {
      const attrs: string[] = [];
      for (let i = 0; i < styleEl.attributes.length; i++) {
        const attr = styleEl.attributes[i];
        attrs.push(`${attr.name}="${attr.value}"`);
      }
      styleTagAttributes = attrs.join(' ');
    }
  });

  // Parse CSS rules
  const cssRules = parseCSSRules(styleContent);

  // --- Extract head content (excluding <style>) ---
  const headEl = doc.head;
  let headContent = '';
  if (headEl) {
    // Clone head, remove style tags, get innerHTML
    const headClone = headEl.cloneNode(true) as HTMLHeadElement;
    headClone.querySelectorAll('style').forEach((s) => s.remove());
    headContent = headClone.innerHTML.trim();
  }

  // --- Extract html and body attributes from raw HTML ---
  const htmlAttributes = extractTagAttributes(html, 'html');
  const bodyAttributes = extractTagAttributes(html, 'body');

  // --- Extract non-visual elements from body (scripts, meta, link, noscript) ---
  const bodyEl = doc.body;
  if (!bodyEl) return null;

  let bodyScripts = '';
  const nonVisualElements = bodyEl.querySelectorAll('script, meta, link, noscript, style');
  nonVisualElements.forEach((el) => {
    bodyScripts += el.outerHTML + '\n';
    el.remove();
  });
  bodyScripts = bodyScripts.trim();

  const documentMeta: DocumentMeta = {
    headContent,
    styleContent,
    styleTagAttributes,
    cssRules,
    bodyScripts,
    htmlAttributes,
    bodyAttributes,
  };

  return { documentMeta, bodyElement: bodyEl, cssRules };
}

/**
 * Recursively apply resolved CSS as inline styles on each element in the DOM tree.
 * This prepares the body for htmlToComponents() which reads inline styles.
 */
function applyResolvedStylesRecursive(el: Element, rules: ParsedCSSRule[]): void {
  // Skip non-visual elements
  if (NON_VISUAL_TAGS.has(el.tagName)) return;

  const resolved = resolveStylesForElement(el, rules);
  if (Object.keys(resolved).length > 0) {
    el.setAttribute('style', cssPropertiesToInlineStyle(resolved));
  }

  // Recurse into children
  for (let i = 0; i < el.children.length; i++) {
    applyResolvedStylesRecursive(el.children[i], rules);
  }
}

/**
 * Walk both the DOM tree and the component tree in parallel,
 * attaching _meta to each component's props.
 *
 * The DOM tree and component tree should mirror each other structurally
 * since components were generated from the DOM.
 */
function attachMetaToComponents(
  domChildren: HTMLCollection,
  components: ClaudeComponent[],
  rules: ParsedCSSRule[],
): void {
  let compIdx = 0;

  for (let domIdx = 0; domIdx < domChildren.length && compIdx < components.length; domIdx++) {
    const el = domChildren[domIdx];

    // Skip non-visual DOM elements
    if (NON_VISUAL_TAGS.has(el.tagName)) continue;

    // Skip elements with display:none (they produce null components)
    const styleAttr = el.getAttribute('style') || '';
    if (styleAttr.includes('display: none') || styleAttr.includes('display:none')) continue;

    const comp = components[compIdx];
    if (!comp) break;

    // Sanity check: verify DOM tag matches expected Puck component type
    const expectedTypes = TAG_TO_PUCK_TYPE[el.tagName.toLowerCase()];
    if (expectedTypes && !expectedTypes.includes(comp.type)) {
      // Trees are out of sync — skip this assignment
      console.warn(`[puck-html-document] Tree sync mismatch: DOM <${el.tagName.toLowerCase()}> vs Puck ${comp.type}, skipping _meta`);
      continue;
    }

    // Resolve styles for _meta (use original resolved styles, not the inline ones)
    const resolvedStyles = resolveStylesForElement(el, rules);
    const meta = extractElementMeta(el, rules, resolvedStyles);

    // Attach _meta to component props
    comp.props._meta = meta;

    // If this component is a container with children, recurse
    if (CONTAINER_TYPES.has(comp.type) && comp.children && comp.children.length > 0) {
      attachMetaToComponents(el.children, comp.children, rules);
    }

    compIdx++;
  }
}

/**
 * Main import function: parse a full HTML document into ClaudeComponent[] with _meta.
 *
 * 1. Parses the full document structure
 * 2. Applies resolved CSS as inline styles on each element
 * 3. Converts body HTML to ClaudeComponent[] via htmlToComponents()
 * 4. Walks both trees in parallel to attach _meta to each component
 *
 * Returns components + documentMeta, or null if parsing fails.
 */
export function fullDocumentToComponents(
  html: string,
): { components: ClaudeComponent[]; documentMeta: DocumentMeta } | null {
  if (typeof window === 'undefined') return null;

  const parsed = parseFullDocument(html);
  if (!parsed) return null;

  const { documentMeta, bodyElement, cssRules } = parsed;

  // Save a clone of body before applying inline styles (for _meta extraction)
  const bodyClone = bodyElement.cloneNode(true) as Element;

  // Apply resolved CSS as inline styles so htmlToComponents() can read them
  for (let i = 0; i < bodyElement.children.length; i++) {
    applyResolvedStylesRecursive(bodyElement.children[i], cssRules);
  }

  // Convert to ClaudeComponent[] using the existing parser
  const components = htmlToComponents(bodyElement.innerHTML);

  // Walk both trees in parallel to attach _meta
  attachMetaToComponents(bodyClone.children, components, cssRules);

  return { components, documentMeta };
}

// ---------------------------------------------------------------------------
// Export-side functions
// ---------------------------------------------------------------------------

/**
 * Compare current Puck props with the original styles stored in _meta.
 * Returns only the CSS properties (kebab-case) that have changed.
 * Number props get "px" suffix.
 */
export function diffComponentStyles(
  props: Record<string, any>,
  meta: ElementMeta,
): Record<string, string> {
  const changes: Record<string, string> = {};

  for (const [puckProp, cssProp] of Object.entries(PUCK_TO_CSS)) {
    if (!(puckProp in props)) continue;

    let currentValue = props[puckProp];
    if (currentValue == null || currentValue === '') continue;

    // Number props get "px" suffix
    if (typeof currentValue === 'number') {
      currentValue = `${currentValue}px`;
    }

    const originalValue = meta.originalStyles[cssProp] || '';

    // Normalize comparison: trim whitespace, lowercase
    const normalizedCurrent = String(currentValue).trim().toLowerCase();
    const normalizedOriginal = originalValue.trim().toLowerCase();

    if (normalizedCurrent !== normalizedOriginal) {
      changes[cssProp] = String(currentValue);
    }
  }

  return changes;
}

/**
 * Apply CSS property diffs to the parsed CSS rules array (mutates in place).
 * For each diff, finds the matching rule by selector and updates its properties + rawText.
 */
export function applyCSSdiffs(
  rules: ParsedCSSRule[],
  diffs: Array<{ selector: string; changes: Record<string, string> }>,
): void {
  for (const diff of diffs) {
    if (!diff.selector) continue;

    // Find the rule with this selector
    const rule = rules.find((r) => r.selector === diff.selector);
    if (!rule) continue;

    // Update properties
    for (const [prop, val] of Object.entries(diff.changes)) {
      rule.properties[prop] = val;
    }

    // Rebuild rawText from properties
    const propsStr = Object.entries(rule.properties)
      .map(([p, v]) => `  ${p}: ${v};`)
      .join('\n');
    rule.rawText = `${rule.selector} {\n${propsStr}\n}`;
  }
}

/**
 * Rebuild a CSS text string from structured rules.
 */
function rebuildCSSText(rules: ParsedCSSRule[]): string {
  return rules.map((r) => r.rawText).join('\n\n');
}

/**
 * Escape HTML special characters in text content.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Escape a string for safe use inside an HTML attribute value (double-quoted).
 */
function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Build an opening tag from ElementMeta.
 * e.g. <div class="banner-title" id="main" data-id="abc" role="banner">
 */
function buildOpeningTag(meta: ElementMeta): string {
  const parts: string[] = [meta.tag];

  if (meta.id) {
    parts.push(`id="${escapeAttr(meta.id)}"`);
  }

  if (meta.classes.length > 0) {
    parts.push(`class="${escapeAttr(meta.classes.join(' '))}"`);
  }

  if (meta.dataId) {
    parts.push(`data-id="${escapeAttr(meta.dataId)}"`);
  }

  for (const [name, value] of Object.entries(meta.attrs)) {
    parts.push(`${name}="${escapeAttr(value)}"`);
  }

  return `<${parts.join(' ')}>`;
}

/**
 * Render a single component to HTML using its _meta for structure,
 * falling back to inline-styled HTML if no _meta is present.
 */
function componentToOriginalHtml(
  comp: { type: string; props: Record<string, any> },
  zones: Record<string, Array<{ type: string; props: Record<string, any> }>> | undefined,
): string {
  const props = comp.props;
  const meta: ElementMeta | undefined = props._meta;

  if (meta) {
    return renderWithMeta(comp, meta, zones);
  }

  // No _meta: fallback to inline-styled HTML
  return renderFallbackHtml(comp, zones);
}

/**
 * Render a component to HTML using its original _meta tags/classes/attributes.
 */
function renderWithMeta(
  comp: { type: string; props: Record<string, any> },
  meta: ElementMeta,
  zones: Record<string, Array<{ type: string; props: Record<string, any> }>> | undefined,
): string {
  const props = comp.props;
  const openTag = buildOpeningTag(meta);
  const closeTag = `</${meta.tag}>`;

  // Self-closing tags
  if (['img', 'hr', 'br', 'input'].includes(meta.tag)) {
    // For img, update src/alt from props
    if (meta.tag === 'img') {
      const parts = [meta.tag];
      if (meta.id) parts.push(`id="${escapeAttr(meta.id)}"`);
      if (meta.classes.length > 0) parts.push(`class="${escapeAttr(meta.classes.join(' '))}"`);
      if (props.src) parts.push(`src="${escapeAttr(props.src)}"`);
      if (props.alt) parts.push(`alt="${escapeAttr(props.alt)}"`);
      for (const [name, value] of Object.entries(meta.attrs)) {
        if (name !== 'src' && name !== 'alt') {
          parts.push(`${name}="${escapeAttr(value)}"`);
        }
      }
      return `<${parts.join(' ')} />`;
    }
    return openTag.replace(/>$/, ' />');
  }

  // Container components: render children from zones
  if (CONTAINER_TYPES.has(comp.type)) {
    const zoneKey = `${props.id}:children`;
    const children = zones?.[zoneKey] || [];
    const childrenHtml = children
      .map((child) => componentToOriginalHtml(child, zones))
      .join('\n');
    return `${openTag}\n${childrenHtml}\n${closeTag}`;
  }

  // Leaf components: use text from props
  const text = props.text || props.html || '';
  if (comp.type === 'Button') {
    // For buttons/links, update href
    const parts = [meta.tag];
    if (meta.id) parts.push(`id="${escapeAttr(meta.id)}"`);
    if (meta.classes.length > 0) parts.push(`class="${escapeAttr(meta.classes.join(' '))}"`);
    if (props.href && meta.attrs.href !== undefined) {
      parts.push(`href="${escapeAttr(props.href)}"`);
    } else if (props.href) {
      parts.push(`href="${escapeAttr(props.href)}"`);
    }
    for (const [name, value] of Object.entries(meta.attrs)) {
      if (name !== 'href') {
        parts.push(`${name}="${escapeAttr(value)}"`);
      }
    }
    return `<${parts.join(' ')}>${escapeHtml(text)}</${meta.tag}>`;
  }

  return `${openTag}${escapeHtml(text)}${closeTag}`;
}

/**
 * Fallback renderer: generates inline-styled HTML for components without _meta.
 */
function renderFallbackHtml(
  comp: { type: string; props: Record<string, any> },
  zones: Record<string, Array<{ type: string; props: Record<string, any> }>> | undefined,
): string {
  const p = comp.props;

  switch (comp.type) {
    case 'Flex': {
      const style = [
        'display: flex',
        `flex-direction: ${p.direction || 'column'}`,
        p.wrap ? `flex-wrap: ${p.wrap}` : '',
        `align-items: ${p.alignItems || 'stretch'}`,
        `justify-content: ${p.justifyContent || 'flex-start'}`,
        `gap: ${p.gap != null ? `${p.gap}px` : '0px'}`,
        `padding: ${p.paddingTop || '0px'} ${p.paddingRight || '0px'} ${p.paddingBottom || '0px'} ${p.paddingLeft || '0px'}`,
        p.backgroundColor ? `background-color: ${p.backgroundColor}` : '',
        `max-width: ${p.maxWidth || '100%'}`,
        `border-radius: ${p.borderRadius || '0px'}`,
        'width: 100%',
        'box-sizing: border-box',
      ]
        .filter(Boolean)
        .join('; ');

      const zoneKey = `${p.id}:children`;
      const children = zones?.[zoneKey] || [];
      const childrenHtml = children
        .map((child) => componentToOriginalHtml(child, zones))
        .join('\n');

      return `<div style="${style}">\n${childrenHtml}\n</div>`;
    }

    case 'Grid': {
      const cols = p.numColumns || 2;
      const style = [
        'display: grid',
        `grid-template-columns: repeat(${cols}, 1fr)`,
        `gap: ${p.gap != null ? `${p.gap}px` : '16px'}`,
        `align-items: ${p.alignItems || 'stretch'}`,
        `padding: ${p.paddingTop || '0px'} ${p.paddingRight || '0px'} ${p.paddingBottom || '0px'} ${p.paddingLeft || '0px'}`,
        p.backgroundColor ? `background-color: ${p.backgroundColor}` : '',
        `max-width: ${p.maxWidth || '100%'}`,
        `border-radius: ${p.borderRadius || '0px'}`,
        'width: 100%',
        'box-sizing: border-box',
      ]
        .filter(Boolean)
        .join('; ');

      const zoneKey = `${p.id}:children`;
      const children = zones?.[zoneKey] || [];
      const childrenHtml = children
        .map((child) => componentToOriginalHtml(child, zones))
        .join('\n');

      return `<div style="${style}">\n${childrenHtml}\n</div>`;
    }

    case 'Space': {
      const dir = p.direction || 'vertical';
      const size = p.size || '24px';
      if (dir === 'horizontal') {
        return `<div style="width: ${size}; height: 0px"></div>`;
      }
      return `<div style="height: ${size}"></div>`;
    }

    case 'Heading': {
      const tag = p.level || 'h2';
      const style = `color: ${p.color || '#000'}; font-size: ${p.fontSize || '24px'}; font-weight: ${p.fontWeight || '700'}; text-align: ${p.textAlign || 'left'}; margin: 0`;
      return `<${tag} style="${style}">${escapeHtml(p.text || '')}</${tag}>`;
    }

    case 'Text': {
      const style = `color: ${p.color || '#333'}; font-size: ${p.fontSize || '16px'}; font-weight: ${p.fontWeight || '400'}; text-align: ${p.textAlign || 'left'}; margin: 0`;
      return `<p style="${style}">${escapeHtml(p.text || '')}</p>`;
    }

    case 'Image': {
      const style = `width: ${p.width || '100%'}; height: ${p.height || 'auto'}; object-fit: ${p.objectFit || 'cover'}; border-radius: ${p.borderRadius || '0px'}; display: block`;
      return `<img src="${p.src || ''}" alt="${p.alt || ''}" style="${style}" />`;
    }

    case 'Button': {
      const style = [
        `display: ${p.fullWidth ? 'block' : 'inline-block'}`,
        `background-color: ${p.backgroundColor || '#2563eb'}`,
        `color: ${p.color || '#fff'}`,
        `font-size: ${p.fontSize || '16px'}`,
        `font-weight: ${p.fontWeight || '600'}`,
        `padding: ${p.paddingY || '12px'} ${p.paddingX || '24px'}`,
        `border-radius: ${p.borderRadius || '8px'}`,
        'text-decoration: none',
        'text-align: center',
        'cursor: pointer',
        p.fullWidth ? 'width: 100%' : '',
        'box-sizing: border-box',
        'border: none',
      ]
        .filter(Boolean)
        .join('; ');
      return `<a href="${p.href || '#'}" style="${style}">${escapeHtml(p.text || '')}</a>`;
    }

    case 'Divider':
      return `<hr style="border: none; border-top: ${p.thickness || '1px'} solid ${p.color || '#e5e7eb'}; margin: 0; width: 100%" />`;

    default:
      return '';
  }
}

/**
 * Collect CSS diffs from all components in a Puck Data object.
 * Walks both top-level content[] and nested zones{}.
 */
function collectAllDiffs(
  data: Data,
): Array<{ selector: string; changes: Record<string, string> }> {
  const diffs: Array<{ selector: string; changes: Record<string, string> }> = [];

  function processItem(item: { type: string; props: Record<string, any> }) {
    const meta: ElementMeta | undefined = item.props._meta;
    if (!meta || !meta.cssSelector) return;

    const changes = diffComponentStyles(item.props, meta);
    if (Object.keys(changes).length > 0) {
      diffs.push({ selector: meta.cssSelector, changes });
    }
  }

  // Walk top-level content
  for (const item of data.content) {
    processItem(item);
  }

  // Walk all zones
  if (data.zones) {
    for (const zoneKey of Object.keys(data.zones)) {
      for (const item of data.zones[zoneKey]) {
        processItem(item);
      }
    }
  }

  return diffs;
}

/**
 * Main export function: reconstruct a full HTML document from Puck Data.
 *
 * 1. Reads _documentMeta from data.root.props
 * 2. Deep clones CSS rules and applies diffs from all components
 * 3. Rebuilds <style> block
 * 4. Rebuilds body HTML from component tree (using _meta for original structure)
 * 5. Assembles full document
 *
 * Returns the full HTML string, or null if _documentMeta is missing.
 */
export function rebuildFullDocument(data: Data): string | null {
  const rootProps = data.root?.props as Record<string, any> | undefined;
  const documentMeta: DocumentMeta | undefined = rootProps?._documentMeta;

  if (!documentMeta) return null;

  // Deep clone CSS rules so we don't mutate the original
  const clonedRules: ParsedCSSRule[] = documentMeta.cssRules.map((r) => ({
    selector: r.selector,
    properties: { ...r.properties },
    rawText: r.rawText,
  }));

  // Collect and apply CSS diffs from all components
  const diffs = collectAllDiffs(data);
  applyCSSdiffs(clonedRules, diffs);

  // Rebuild <style> block
  const updatedCSS = rebuildCSSText(clonedRules);
  const styleTag = documentMeta.styleTagAttributes
    ? `<style ${documentMeta.styleTagAttributes}>`
    : '<style>';

  // Rebuild body HTML from component tree
  const bodyHtml = rebuildBodyFromPuckData(data);

  // Assemble full document
  const htmlAttrs = documentMeta.htmlAttributes
    ? ` ${documentMeta.htmlAttributes}`
    : '';
  const bodyAttrs = documentMeta.bodyAttributes
    ? ` ${documentMeta.bodyAttributes}`
    : '';

  const parts = [
    `<html${htmlAttrs}>`,
    '  <head>',
  ];

  if (documentMeta.headContent) {
    // Indent head content
    const indentedHead = documentMeta.headContent
      .split('\n')
      .map((line) => `    ${line}`)
      .join('\n');
    parts.push(indentedHead);
  }

  parts.push(`    ${styleTag}`);
  parts.push(updatedCSS);
  parts.push('    </style>');
  parts.push('  </head>');
  parts.push(`  <body${bodyAttrs}>`);
  parts.push(bodyHtml);

  if (documentMeta.bodyScripts) {
    parts.push(`    ${documentMeta.bodyScripts}`);
  }

  parts.push('  </body>');
  parts.push('</html>');

  return parts.join('\n');
}

/**
 * Rebuild the body HTML from Puck data content and zones.
 */
function rebuildBodyFromPuckData(data: Data): string {
  const zones = data.zones as
    | Record<string, Array<{ type: string; props: Record<string, any> }>>
    | undefined;

  const bodyParts: string[] = [];

  for (const item of data.content) {
    bodyParts.push(componentToOriginalHtml(item, zones));
  }

  return bodyParts.join('\n');
}
