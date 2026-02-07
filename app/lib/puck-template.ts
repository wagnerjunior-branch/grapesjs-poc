import type { Data } from '@measured/puck';

export interface TemplateVariable {
  name: string;
  defaultValue: string;
}

/**
 * Extract {{variableName}} placeholders from HTML.
 * Returns unique variable names with their first occurrence as default value.
 */
export function extractVariables(html: string): TemplateVariable[] {
  const regex = /\{\{(\w+)\}\}/g;
  const seen = new Set<string>();
  const variables: TemplateVariable[] = [];

  let match;
  while ((match = regex.exec(html)) !== null) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      variables.push({ name, defaultValue: '' });
    }
  }

  return variables;
}

/**
 * Replace all {{variableName}} placeholders with provided values.
 * Variables not in the values map are left as-is.
 */
export function resolveVariables(
  html: string,
  values: Record<string, string>
): string {
  return html.replace(/\{\{(\w+)\}\}/g, (fullMatch, name) => {
    return name in values ? values[name] : fullMatch;
  });
}

/**
 * Extract {{variableName}} placeholders from all string props in Puck Data
 * (walks content[] and zones{}).
 */
export function extractVariablesFromPuckData(data: Data): TemplateVariable[] {
  const regex = /\{\{(\w+)\}\}/g;
  const seen = new Set<string>();
  const variables: TemplateVariable[] = [];

  function scanProps(props: Record<string, any>) {
    for (const value of Object.values(props)) {
      if (typeof value !== 'string') continue;
      let match;
      regex.lastIndex = 0;
      while ((match = regex.exec(value)) !== null) {
        const name = match[1];
        if (!seen.has(name)) {
          seen.add(name);
          variables.push({ name, defaultValue: '' });
        }
      }
    }
  }

  for (const item of data.content) {
    if (item.props) scanProps(item.props);
  }

  if (data.zones) {
    for (const zoneItems of Object.values(data.zones)) {
      for (const item of zoneItems) {
        if (item.props) scanProps(item.props);
      }
    }
  }

  return variables;
}

/**
 * Resolve {{variableName}} placeholders in all string props of Puck Data.
 * Returns a new Data object (does not mutate the original).
 */
export function resolveVariablesInPuckData(
  data: Data,
  values: Record<string, string>
): Data {
  function resolveProps(props: Record<string, any>): Record<string, any> {
    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'string') {
        resolved[key] = value.replace(/\{\{(\w+)\}\}/g, (full, name) =>
          name in values ? values[name] : full
        );
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }

  const newContent = data.content.map((item) => ({
    ...item,
    props: item.props ? resolveProps(item.props) : item.props,
  }));

  let newZones: Data['zones'];
  if (data.zones) {
    newZones = {} as Record<string, Data['content']>;
    for (const [zoneName, zoneItems] of Object.entries(data.zones)) {
      (newZones as any)[zoneName] = zoneItems.map((item) => ({
        ...item,
        props: item.props ? resolveProps(item.props) : item.props,
      }));
    }
  }

  return {
    ...data,
    content: newContent,
    zones: newZones,
  } as Data;
}
