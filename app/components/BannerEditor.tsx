'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Editor } from 'grapesjs';
import GrapesJsStudio, {
  StudioCommands,
  ToastVariant,
} from '@grapesjs/studio-sdk/react';

import '@grapesjs/studio-sdk/style';

export default function BannerEditor() {
  const [editor, setEditor] = useState<Editor>();
  const [bannerId, setBannerId] = useState<string | null>(null);
  const [bannerName, setBannerName] = useState('Untitled Banner');
  const [saving, setSaving] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const bannerDataRef = useRef<{ projectData: unknown; name: string } | null>(null);

  const loadBanner = useCallback(async (id: string, editorInstance?: Editor) => {
    try {
      const response = await fetch(`/api/banners/${id}`);
      if (!response.ok) throw new Error('Failed to load banner');
      const data = await response.json();

      if (data) {
        setBannerName(data.name);
        bannerDataRef.current = data;

        if (editorInstance && data.projectData) {
          setTimeout(() => {
            editorInstance.loadProjectData(data.projectData);
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error loading banner:', error);
    }
  }, []);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setBannerId(id);
    }
  }, [searchParams]);

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

    const id = searchParams.get('id');
    if (id) {
      await loadBanner(id, editor);
    }

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
    }, 300);

    const blockManager = editor.BlockManager;

    blockManager.add('custom-button-primary', {
      label: 'Open',
      category: 'Custom Buttons',
      content: `<button class="custom-btn-primary" style="background-color: white; border: none; border-radius: 25px; padding: 4px 12px; cursor: pointer; height: 25px; min-width: 83px; align-self: auto; display: flex; justify-content: center; align-items: center; color: #0072c3; font-size: 10px; font-family: 'IBM Plex Sans', sans-serif; font-weight: 400;">Open App</button>`,
    });

    blockManager.add('custom-button-secondary', {
      label: 'Button Secondary',
      category: 'Custom Buttons',
      content: {
        type: 'button',
        classes: ['custom-btn-secondary'],
        content: 'Secondary',
        style: {
          'background-color': 'white',
          'color': '#0072c3',
          'border': '2px solid #0072c3',
          'border-radius': '25px',
          'padding': '8px 24px',
          'cursor': 'pointer',
          'font-size': '14px',
          'font-weight': '500',
        },
      },
    });

    blockManager.add('custom-button-outline', {
      label: 'Button Outline',
      category: 'Custom Buttons',
      content: {
        type: 'button',
        classes: ['custom-btn-outline'],
        content: 'Outline',
        style: {
          'background-color': 'transparent',
          'color': '#0072c3',
          'border': '1px solid #0072c3',
          'border-radius': '8px',
          'padding': '10px 20px',
          'cursor': 'pointer',
          'font-size': '14px',
        },
      },
    });

    blockManager.add('custom-button-rounded', {
      label: 'Button Rounded',
      category: 'Custom Buttons',
      content: {
        type: 'button',
        classes: ['custom-btn-rounded'],
        content: 'Rounded',
        style: {
          'background-color': '#0072c3',
          'color': 'white',
          'border': 'none',
          'border-radius': '50px',
          'padding': '12px 32px',
          'cursor': 'pointer',
          'font-size': '16px',
          'font-weight': '600',
          'box-shadow': '0 4px 6px rgba(0,0,0,0.1)',
        },
      },
    });
  };

  const showToast = (id: string, content: string) =>
    editor?.runCommand(StudioCommands.toastAdd, {
      id,
      header: 'Notification',
      content,
      variant: ToastVariant.Info,
    });

  const saveBanner = async () => {
    if (!editor) return;

    try {
      setSaving(true);
      const projectData = editor.getProjectData();
      const html = editor.getHtml();
      const css = editor.getCss();

      const bannerData = {
        name: bannerName,
        projectData,
        html,
        css,
      };

      if (bannerId) {
        const response = await fetch(`/api/banners/${bannerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bannerData),
        });

        if (!response.ok) throw new Error('Failed to update banner');
        showToast('banner-saved', 'Banner saved successfully');
      } else {
        const response = await fetch('/api/banners', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bannerData),
        });

        if (!response.ok) throw new Error('Failed to create banner');
        const data = await response.json();
        if (data) {
          setBannerId(data.id);
          router.replace(`/editor?id=${data.id}`);
          showToast('banner-created', 'Banner created successfully');
        }
      }
    } catch (error) {
      console.error('Error saving banner:', error);
      alert('Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex h-screen flex-col justify-between p-5 gap-2">
      <div className="p-1 flex gap-5 items-center">
        <button
          onClick={() => router.push('/')}
          className="border rounded px-3 py-1 hover:bg-gray-100"
        >
          ← Back to List
        </button>
        <input
          type="text"
          value={bannerName}
          onChange={(e) => setBannerName(e.target.value)}
          className="border rounded px-3 py-1 flex-1 max-w-xs"
          placeholder="Banner name"
        />
        <button
          onClick={saveBanner}
          disabled={saving}
          className="bg-blue-600 text-white rounded px-4 py-1 hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Banner'}
        </button>
      </div>
      <div className="flex-1 w-full h-full overflow-hidden">
        <GrapesJsStudio
          onReady={onReady}
          options={{
            licenseKey: 'YOUR_LICENSE_KEY',
            project: {
              type: 'web',
              default: {
                pages: [
                  {
                    name: 'Mobile Notification',
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
