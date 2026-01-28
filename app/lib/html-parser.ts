/**
 * HTML Parser Utility for Form-Based Template Editor
 *
 * This utility analyzes HTML and identifies user-editable elements,
 * injecting stable identifiers and generating a schema for form generation.
 */

export interface EditableElement {
  id: string; // Unique identifier (will be injected as data-editable-id)
  type: 'heading' | 'button' | 'link' | 'text' | 'image';
  selector: string; // CSS selector for targeting
  xpath: string; // XPath for more precise targeting
  label: string; // Human-readable label for form field
  value: string; // Current text content or attribute value
  attributeName?: string; // For images: 'src' or 'alt'
  context?: string; // Parent or surrounding context for better labeling
  characterCount?: number; // For choosing input type (text vs textarea)
}

export interface EditableElementsSchema {
  elements: EditableElement[];
  groups: Record<string, EditableElement[]>; // Grouped by section
  annotatedHtml: string; // HTML with data-editable-id attributes injected
}

/**
 * Main function to parse HTML and detect editable elements
 */
export function parseHtmlForEditableElements(html: string): EditableElementsSchema {
  // Parse HTML string into DOM
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const elements: EditableElement[] = [];
  let idCounter = 0;

  // 1. Detect headings (h1-h6)
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach((heading) => {
    const element = heading as HTMLElement;
    const id = `editable-${++idCounter}`;
    const textContent = element.textContent?.trim() || '';

    if (textContent) {
      element.setAttribute('data-editable-id', id);

      elements.push({
        id,
        type: 'heading',
        selector: buildCssSelector(element),
        xpath: buildXPath(element),
        label: `Heading: ${truncate(textContent, 30)}`,
        value: textContent,
        context: getContextLabel(element),
        characterCount: textContent.length,
      });
    }
  });

  // 2. Detect buttons
  const buttons = doc.querySelectorAll('button, input[type="button"], input[type="submit"]');
  buttons.forEach((button) => {
    const element = button as HTMLElement;
    const id = `editable-${++idCounter}`;
    const textContent = element.textContent?.trim() ||
                       (element as HTMLInputElement).value?.trim() || '';

    if (textContent) {
      element.setAttribute('data-editable-id', id);

      elements.push({
        id,
        type: 'button',
        selector: buildCssSelector(element),
        xpath: buildXPath(element),
        label: `Button: ${truncate(textContent, 30)}`,
        value: textContent,
        context: getContextLabel(element),
        characterCount: textContent.length,
      });
    }
  });

  // 3. Detect links
  const links = doc.querySelectorAll('a[href]');
  links.forEach((link) => {
    const element = link as HTMLElement;
    const id = `editable-${++idCounter}`;
    const textContent = element.textContent?.trim() || '';

    // Only include links with meaningful text (not just images or icons)
    if (textContent && textContent.length > 0) {
      element.setAttribute('data-editable-id', id);

      elements.push({
        id,
        type: 'link',
        selector: buildCssSelector(element),
        xpath: buildXPath(element),
        label: `Link: ${truncate(textContent, 30)}`,
        value: textContent,
        context: getContextLabel(element),
        characterCount: textContent.length,
      });
    }
  });

  // 4. Detect short text content (p, span, div with concise text)
  const textElements = doc.querySelectorAll('p, span, div');
  textElements.forEach((textEl) => {
    const element = textEl as HTMLElement;

    // Skip if already processed or contains block elements
    if (element.hasAttribute('data-editable-id') ||
        element.querySelector('h1, h2, h3, h4, h5, h6, button, a, p, div')) {
      return;
    }

    const textContent = element.textContent?.trim() || '';

    // Only include elements with meaningful text (not too short, not too long)
    if (textContent && textContent.length > 3 && textContent.length < 500) {
      const id = `editable-${++idCounter}`;
      element.setAttribute('data-editable-id', id);

      elements.push({
        id,
        type: 'text',
        selector: buildCssSelector(element),
        xpath: buildXPath(element),
        label: `Text: ${truncate(textContent, 30)}`,
        value: textContent,
        context: getContextLabel(element),
        characterCount: textContent.length,
      });
    }
  });

  // 5. Detect images
  const images = doc.querySelectorAll('img');
  images.forEach((img) => {
    const element = img as HTMLImageElement;
    const src = element.getAttribute('src') || '';
    const alt = element.getAttribute('alt') || '';

    // Add editable fields for both src and alt
    if (src) {
      const id = `editable-${++idCounter}`;
      element.setAttribute('data-editable-id', id);

      elements.push({
        id,
        type: 'image',
        selector: buildCssSelector(element),
        xpath: buildXPath(element),
        label: `Image Source: ${truncate(alt || 'Unnamed image', 30)}`,
        value: src,
        attributeName: 'src',
        context: getContextLabel(element),
      });
    }

    // Alt text as separate editable field
    const altId = `editable-${++idCounter}`;
    elements.push({
      id: altId,
      type: 'image',
      selector: buildCssSelector(element),
      xpath: buildXPath(element),
      label: `Image Alt Text: ${truncate(alt || 'Unnamed image', 30)}`,
      value: alt,
      attributeName: 'alt',
      context: getContextLabel(element),
      characterCount: alt.length,
    });
  });

  // Get annotated HTML
  const annotatedHtml = doc.documentElement.outerHTML;

  // Group elements by section (basic grouping by common ancestors)
  const groups = groupElementsBySection(elements, doc);

  return {
    elements,
    groups,
    annotatedHtml,
  };
}

/**
 * Build a CSS selector for an element
 */
function buildCssSelector(element: Element): string {
  const path: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.tagName.toLowerCase();

    // Add ID if present
    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break; // ID is unique, we can stop here
    }

    // Add classes if present
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(Boolean);
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }

    // Add data-editable-id if present
    if (current.hasAttribute('data-editable-id')) {
      selector += `[data-editable-id="${current.getAttribute('data-editable-id')}"]`;
    }

    // Add nth-child if needed for disambiguation
    if (current.parentElement) {
      const siblings = Array.from(current.parentElement.children);
      const sameTagSiblings = siblings.filter(s => s.tagName === current!.tagName);
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;

    // Limit depth to keep selectors manageable
    if (path.length >= 5) break;
  }

  return path.join(' > ');
}

/**
 * Build an XPath for an element
 */
function buildXPath(element: Element): string {
  const path: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let sibling = current.previousElementSibling;

    while (sibling) {
      if (sibling.tagName === current.tagName) {
        index++;
      }
      sibling = sibling.previousElementSibling;
    }

    const tagName = current.tagName.toLowerCase();
    const position = index > 0 ? `[${index + 1}]` : '';
    path.unshift(`${tagName}${position}`);

    current = current.parentElement;

    // Limit depth
    if (path.length >= 10) break;
  }

  return '//' + path.join('/');
}

/**
 * Get a context label from parent elements or nearby headings
 */
function getContextLabel(element: Element): string {
  // Look for nearest heading sibling or parent section
  let current: Element | null = element;

  while (current) {
    // Check for data-name attribute (Figma convention)
    const dataName = current.getAttribute('data-name');
    if (dataName) {
      return dataName;
    }

    // Check for nearby heading
    const previousHeading = current.previousElementSibling?.querySelector('h1, h2, h3, h4, h5, h6') ||
                           current.parentElement?.querySelector('h1, h2, h3, h4, h5, h6');
    if (previousHeading && previousHeading.textContent) {
      return truncate(previousHeading.textContent.trim(), 30);
    }

    // Check for section/article/nav with id or class
    if (current.tagName.match(/SECTION|ARTICLE|NAV|HEADER|FOOTER/)) {
      const id = current.id || current.className.split(/\s+/)[0];
      if (id) {
        return id;
      }
    }

    current = current.parentElement;
  }

  return 'Main content';
}

/**
 * Group elements by their sections
 */
function groupElementsBySection(
  elements: EditableElement[],
  doc: Document
): Record<string, EditableElement[]> {
  const groups: Record<string, EditableElement[]> = {};

  elements.forEach((element) => {
    const groupName = element.context || 'Ungrouped';

    if (!groups[groupName]) {
      groups[groupName] = [];
    }

    groups[groupName].push(element);
  });

  return groups;
}

/**
 * Truncate text to a maximum length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
}

/**
 * Apply changes from form data back to HTML
 */
export function applyChangesToHtml(
  annotatedHtml: string,
  changes: Record<string, string>
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(annotatedHtml, 'text/html');

  Object.entries(changes).forEach(([id, newValue]) => {
    const element = doc.querySelector(`[data-editable-id="${id}"]`);

    if (!element) return;

    // Determine if this is an attribute change (image) or text content
    const isImageSrc = element.tagName === 'IMG' && id.includes('src');
    const isImageAlt = element.tagName === 'IMG' && id.includes('alt');

    if (isImageSrc) {
      (element as HTMLImageElement).src = newValue;
    } else if (isImageAlt) {
      (element as HTMLImageElement).alt = newValue;
    } else if (element.tagName === 'INPUT') {
      (element as HTMLInputElement).value = newValue;
    } else {
      // Text content change
      element.textContent = newValue;
    }
  });

  return doc.documentElement.outerHTML;
}

/**
 * Remove data-editable-id attributes for clean export
 */
export function cleanHtmlForExport(annotatedHtml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(annotatedHtml, 'text/html');

  const editableElements = doc.querySelectorAll('[data-editable-id]');
  editableElements.forEach((element) => {
    element.removeAttribute('data-editable-id');
  });

  return doc.documentElement.outerHTML;
}
