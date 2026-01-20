import type { Editor } from 'grapesjs';

export type StudioPlugin = (editor: Editor) => void;

export type PolicyOptions = {
  allowedStyleProps: string[];
  allowedClasses: string[];
  disallowTags: string[];
  disallowAttributes: string[];
};

export type StudioEditorInitOptions = {
  policy?: Partial<PolicyOptions>;
  onReady?: (editor: Editor) => void;
  options?: Record<string, unknown>;
};
