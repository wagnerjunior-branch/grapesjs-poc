'use client';

import { useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import grapesjs, { Editor } from 'grapesjs';
import GjsEditor, { Canvas, WithEditor } from '@grapesjs/react';

import TopNav from './TopNav';
import Toolbar from './Toolbar';
import Sidebar from './Sidebar';
import brazeBlocksPlugin from '../../lib/editor-blocks-plugin';
import '../../lib/editor-theme.css';

const DEFAULT_BANNER_NAME = 'New Campaign';

const DEVICES = [
  { id: 'Desktop', name: 'Desktop', width: '' },
  { id: 'Mobile', name: 'Mobile', width: '320px', widthMedia: '768px' },
];

interface CustomEditorProps {
  mode?: 'banner' | 'creative';
}

export default function CustomEditor({ mode = 'banner' }: CustomEditorProps) {
  const [editor, setEditor] = useState<Editor>();
  const [itemId, setItemId] = useState<string | null>(null);
  const [itemName, setItemName] = useState(DEFAULT_BANNER_NAME);
  const [saving, setSaving] = useState(false);
  const [bannerId, setBannerId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const dataRef = useRef<{ projectData: unknown; name: string } | null>(null);

  const loadItem = useCallback(async (id: string, editorInstance: Editor) => {
    try {
      const endpoint = mode === 'creative' ? `/api/creatives/${id}` : `/api/banners/${id}`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();

      if (data) {
        setItemName(data.name);
        dataRef.current = data;
        if (mode === 'creative') {
          setBannerId(data.bannerId);
        }
        if (data.projectData) {
          editorInstance.loadProjectData(data.projectData);
        }
      }
    } catch (error) {
      console.error('Error loading:', error);
    }
  }, [mode]);

  const loadTemplate = useCallback(async (templateId: string, editorInstance: Editor) => {
    try {
      const response = await fetch(`/api/banners/${templateId}`);
      if (!response.ok) throw new Error('Failed to load template');
      const data = await response.json();

      if (data) {
        setItemName(`${data.name} - Creative`);
        setBannerId(templateId);
        if (data.projectData) {
          editorInstance.loadProjectData(data.projectData);
        }
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  }, []);

  const onReady = useCallback(async (editorInstance: Editor) => {
    setEditor(editorInstance);

    const id = searchParams.get('id');
    const templateId = searchParams.get('templateId');

    if (id) {
      setItemId(id);
      await loadItem(id, editorInstance);
    } else if (mode === 'creative' && templateId) {
      await loadTemplate(templateId, editorInstance);
    }
  }, [searchParams, mode, loadItem, loadTemplate]);

  const saveItem = async () => {
    if (!editor) return;

    try {
      setSaving(true);
      const projectData = editor.getProjectData();
      const html = editor.getHtml();
      const css = editor.getCss();

      if (mode === 'creative') {
        const creativeData = {
          name: itemName,
          bannerId: bannerId || '',
          projectData,
          html,
          css,
        };

        if (itemId) {
          const response = await fetch(`/api/creatives/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creativeData),
          });
          if (!response.ok) throw new Error('Failed to update');
        } else {
          const response = await fetch('/api/creatives', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creativeData),
          });
          if (!response.ok) throw new Error('Failed to create');
          const data = await response.json();
          if (data) {
            setItemId(data.id);
            router.replace(`/creatives/${data.id}`);
          }
        }
      } else {
        const bannerData = {
          name: itemName,
          projectData,
          html,
          css,
          editorType: 'grapesjs',
        };

        if (itemId) {
          const response = await fetch(`/api/banners/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bannerData),
          });
          if (!response.ok) throw new Error('Failed to update');
        } else {
          const response = await fetch('/api/banners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bannerData),
          });
          if (!response.ok) throw new Error('Failed to create');
          const data = await response.json();
          if (data) {
            setItemId(data.id);
            router.replace(`/editor?id=${data.id}`);
          }
        }
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(mode === 'creative' ? '/creatives' : '/');
  };

  return (
    <GjsEditor
      grapesjs={grapesjs}
      grapesjsCss="https://unpkg.com/grapesjs@0.22.14/dist/css/grapes.min.css"
      options={{
        height: '100%',
        storageManager: false,
        deviceManager: { devices: DEVICES, default: 'Mobile' },
        panels: { defaults: [] },
        blockManager: { custom: true },
      }}
      plugins={[brazeBlocksPlugin]}
      onReady={onReady}
    >
      <div className="flex flex-col h-screen bg-(--editor-bg-body)">
        <TopNav
          campaignName={itemName}
          onCampaignNameChange={setItemName}
          onCancel={handleCancel}
          onDone={saveItem}
          saving={saving}
        />
        <WithEditor>
          <Toolbar />
        </WithEditor>
        <div className="flex flex-1 overflow-hidden">
          <WithEditor>
            <Sidebar />
          </WithEditor>
          <Canvas className="flex-1 bg-(--editor-bg-canvas)" />
        </div>
      </div>
    </GjsEditor>
  );
}
