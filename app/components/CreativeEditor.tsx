'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import type { Editor } from 'grapesjs';
import GrapesJsStudio from '@grapesjs/studio-sdk/react';

import '@grapesjs/studio-sdk/style';

export default function CreativeEditor() {
  const [editor, setEditor] = useState<Editor>();
  const [creativeId, setCreativeId] = useState<string | null>(null);
  const [creativeName, setCreativeName] = useState('Untitled Creative');
  const [bannerId, setBannerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const templateDataRef = useRef<{ projectData: unknown; name: string } | null>(null);
  const creativeDataRef = useRef<{ projectData: unknown; name: string; bannerId: string } | null>(null);

  const loadTemplate = useCallback(async (templateId: string, editorInstance?: Editor) => {
    try {
      const response = await fetch(`/api/banners/${templateId}`);
      if (!response.ok) throw new Error('Failed to load template');
      const data = await response.json();

      if (data) {
        setCreativeName(`${data.name} - Creative`);
        templateDataRef.current = data;

        if (editorInstance && data.projectData) {
          setTimeout(() => {
            editorInstance.loadProjectData(data.projectData);
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error loading template:', error);
    }
  }, []);

  const loadCreative = useCallback(async (id: string, editorInstance?: Editor) => {
    try {
      const response = await fetch(`/api/creatives/${id}`);
      if (!response.ok) throw new Error('Failed to load creative');
      const data = await response.json();

      if (data) {
        setCreativeName(data.name);
        setBannerId(data.bannerId);
        creativeDataRef.current = data;

        if (editorInstance && data.projectData) {
          setTimeout(() => {
            editorInstance.loadProjectData(data.projectData);
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error loading creative:', error);
    }
  }, []);

  useEffect(() => {
    const id = params?.id as string | undefined;
    const templateId = searchParams.get('templateId');

    if (id) {
      setCreativeId(id);
    } else if (templateId) {
      setBannerId(templateId);
    }
  }, [params, searchParams]);

  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      if (
        typeof args[0] === 'string' &&
        args[0].includes('Accessing element.ref was removed in React 19')
      ) {
        return;
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  const onReady = async (editor: Editor) => {
    setEditor(editor);

    const id = params?.id as string | undefined;
    const templateId = searchParams.get('templateId');

    if (id) {
      await loadCreative(id, editor);
    } else if (templateId) {
      await loadTemplate(templateId, editor);
    }

    setTimeout(() => {
      const setMobileDevice = () => {
        try {
          const deviceManager = editor.DeviceManager;
          const devices = deviceManager.getAll();

          const mobilePortrait = devices.find((d: { id: string | number; name: string; width?: number }) => {
            const idStr = String(d.id).toLowerCase();
            const nameStr = String(d.name || '').toLowerCase();
            const isMobile = idStr.includes('mobile') || nameStr.includes('mobile');
            const isPortrait = !idStr.includes('landscape') && !nameStr.includes('landscape') && !idStr.includes('tablet');
            const hasPortraitWidth = d.width && d.width < 600;
            return isMobile && isPortrait && (hasPortraitWidth || !d.width);
          });

          if (mobilePortrait) {
            editor.setDevice(String(mobilePortrait.id));
            return true;
          }

          const mobileDevice = devices.find((d: { id: string | number; name: string; width?: number }) => {
            const idStr = String(d.id).toLowerCase();
            const nameStr = String(d.name || '').toLowerCase();
            const isMobile = idStr.includes('mobile') || nameStr.includes('mobile');
            const isNotLandscape = !idStr.includes('landscape') && !nameStr.includes('landscape');
            return isMobile && isNotLandscape;
          });

          if (mobileDevice) {
            editor.setDevice(String(mobileDevice.id));
            return true;
          }
        } catch (error) {
          console.error('Error setting mobile device:', error);
        }
        return false;
      };

      setTimeout(() => {
        if (!setMobileDevice()) {
          setTimeout(() => setMobileDevice(), 500);
        }
      }, 100);
    }, 300);
  };


  const saveCreative = async () => {
    if (!editor || !bannerId) return;

    try {
      setSaving(true);
      const projectData = editor.getProjectData();
      const html = editor.getHtml();
      const css = editor.getCss();

      const creativeData = {
        name: creativeName,
        bannerId,
        projectData,
        html,
        css,
      };

      if (creativeId) {
        const response = await fetch(`/api/creatives/${creativeId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(creativeData),
        });

        if (!response.ok) throw new Error('Failed to update creative');
      } else {
        const response = await fetch('/api/creatives', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(creativeData),
        });

        if (!response.ok) throw new Error('Failed to create creative');
        const data = await response.json();
        if (data) {
          setCreativeId(data.id);
          router.replace(`/creatives/${data.id}`);
        }
      }
    } catch (error) {
      console.error('Error saving creative:', error);
      alert('Failed to save creative');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex h-screen flex-col justify-between p-5 gap-2">
      <div className="p-1 flex gap-5 items-center">
        <button
          onClick={() => router.push('/creatives')}
          className="border rounded px-3 py-1 hover:bg-gray-100"
        >
          ← Back to Creatives
        </button>
        <input
          type="text"
          value={creativeName}
          onChange={(e) => setCreativeName(e.target.value)}
          className="border rounded px-3 py-1 flex-1 max-w-xs"
          placeholder="Creative name"
        />
        <button
          onClick={saveCreative}
          disabled={saving || !bannerId}
          className="bg-blue-600 text-white rounded px-4 py-1 hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Creative'}
        </button>
      </div>
      <div className="flex-1 w-full h-full overflow-hidden">
        <GrapesJsStudio
          onReady={onReady}
          options={{
            licenseKey: process.env.NEXT_PUBLIC_GRAPESJS_LICENSE_KEY || '',
            project: {
              type: 'web',
              default: {
                pages: [
                  {
                    name: 'Creative',
                    component: '',
                  },
                ],
              },
            },
          }}
        />
      </div>
    </main>
  );
}
