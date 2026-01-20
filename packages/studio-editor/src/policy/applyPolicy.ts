import type { Editor } from 'grapesjs';
import type { PolicyOptions } from '../types';

function sanitize(component: any, options: PolicyOptions) {
  const tag = (component.get?.('tagName') || '').toLowerCase();
  if (options.disallowTags.includes(tag)) {
    component.remove();
    return;
  }

  const attrs = component.getAttributes?.() || {};
  for (const key of Object.keys(attrs)) {
    if (options.disallowAttributes.includes(key.toLowerCase())) {
      component.removeAttributes?.(key);
    }
  }

  const style = component.getStyle?.() || {};
  for (const key of Object.keys(style)) {
    if (!options.allowedStyleProps.includes(key)) {
      component.addStyle?.({ [key]: '' });
    }
  }
}

export function applyPolicy(editor: Editor, options: PolicyOptions) {
  // Sanitize components when adding
  editor.on('component:add', (model) => sanitize(model, options));

  // Sanitize components when updating
  editor.on('component:update', (model) => sanitize(model, options));

  // Restrict allowed selectors/classes
  editor.on('selector:add', (selector) => {
    const name = selector.getName?.() || '';
    if (!options.allowedClasses.includes(name)) {
      try {
        editor.SelectorManager.remove(selector);
      } catch {
        // Ignore errors if selector doesn't exist
      }
    }
  });

  // Intercept HTML paste
  editor.on('component:paste', (model) => {
    sanitize(model, options);
  });

  // Intercept component import
  editor.on('component:import', (model) => {
    sanitize(model, options);
  });
}
