'use client';

import React, { useRef } from 'react';
import type { Editor } from 'grapesjs';
import GrapesJsStudio from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';
import { defaultPlugins } from '../plugins/defaultPlugins';
import { applyPolicy } from '../policy/applyPolicy';
import type { PolicyOptions, StudioEditorInitOptions } from '../types';

const defaultPolicy: PolicyOptions = {
  allowedStyleProps: [
    'color',
    'background-color',
    'font-size',
    'padding',
    'margin',
    'border-radius',
    'border',
    'width',
    'height',
    'display',
    'justify-content',
    'align-items',
    'cursor',
    'font-family',
    'font-weight',
    'min-width',
    'align-self',
  ],
  allowedClasses: ['custom-btn-primary', 'se-btn', 'se-text', 'se-card'],
  disallowTags: ['script', 'iframe'],
  disallowAttributes: ['onload', 'onclick', 'onerror'],
};

export type StudioEditorProps = Omit<StudioEditorInitOptions, 'container'> & {
  className?: string;
  style?: React.CSSProperties;
};

export function StudioEditor(props: StudioEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const { policy, onReady, options, className, style, ...rest } = props;

  const handleReady = (editor: Editor) => {
    // Apply default plugins
    const plugins = defaultPlugins();
    plugins.forEach((plugin) => {
      try {
        plugin(editor);
      } catch (error) {
        console.error('Error applying plugin:', error);
      }
    });

    // Apply security policy
    const finalPolicy = { ...defaultPolicy, ...(policy || {}) };
    applyPolicy(editor, finalPolicy);

    // Call user callback
    onReady?.(editor);
  };

  // Type assertion needed because the exact GrapesJsStudio type is not available
  const editorOptions = options as any;

  return (
    <div
      ref={hostRef}
      className={`se-root ${className ?? ''}`}
      style={style}
      {...rest}
    >
      <GrapesJsStudio onReady={handleReady} options={editorOptions} />
    </div>
  );
}
