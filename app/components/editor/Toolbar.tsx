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
