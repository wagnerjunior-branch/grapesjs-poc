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
