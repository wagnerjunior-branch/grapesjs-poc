'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Editor } from 'grapesjs';
import StudioEditor, {
  StudioCommands,
  ToastVariant,
} from '@grapesjs/studio-sdk/react';
import '@grapesjs/studio-sdk/style';

import EditorSettings from './EditorSettings';
import { canvasAbsoluteMode } from '@grapesjs/studio-sdk-plugins';

interface EditorSettingsType {
  showTypographySection: boolean;
  showLayoutSection: boolean;
  showSizeSection: boolean;
  showSpaceSection: boolean;
  showPositionSection: boolean;
  showEffectsSection: boolean;
  showBackgroundSection: boolean;
  showBordersSection: boolean;
}

interface BannerEditorProps {
  initialSettings: EditorSettingsType & { id: string };
}

interface BannerData {
  projectData: unknown;
  name: string;
}

const DEFAULT_BANNER_NAME = 'Untitled Banner';
const EDITOR_LOAD_DELAY = 100;
const DEFAULT_TEMPLATE_DELAY = 500;
const SECTOR_HIDE_DELAY = 300;
const STYLE_MANAGER_DELAY = 100;

const DEFAULT_COMPONENT = `<div style="position: relative; width: 800px; height: 500px; margin: 70px auto 0; background: linear-gradient(135deg, #f5f7fa, #c3cfe2); color: #1a1a1a; border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); overflow: hidden;">
  <div style="position: absolute; top: 0; left: 550px; width: 300px; height: 100%; background-color: #baccec; transform: skewX(-12deg)"></div>
  <h1 style="position: absolute; top: 40px; left: 40px; font-size: 50px; margin: 0; font-weight: 700;">Absolute Mode</h1>
  <p style="position: absolute; top: 135px; left: 40px; font-size: 22px; max-width: 450px; line-height: 1.5; color: #333;">Enable free positioning for your elements — perfect for fixed layouts like presentations, business cards, or print-ready designs.</p>
  <ul data-gjs-type="text" style="position: absolute; top: 290px; left: 40px; font-size: 18px; line-height: 2; list-style: none; padding: 0;">
    <li>🎯 Drag & place elements anywhere</li>
    <li>🧲 Smart snapping & axis locking</li>
    <li>⚙️ You custom logic</li>
  </ul>
  <div style="position: absolute; left: 540px; top: 100px; width: 200px; height: 200px; background: rgba(255, 255, 255, 0.3); border-radius: 20px; backdrop-filter: blur(10px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; font-size: 80px;">📐</div>
  <div style="position: absolute; top: 405px; left: 590px; font-size: 14px; color: #555;">Studio SDK · GrapesJS</div>
</div>`;

const DEFAULT_STYLES = `body {
  position: relative;
  font-family: system-ui;
  overflow: hidden;
}`;

const DEFAULT_PAGE_CONFIG = {
  name: 'Presentation',
  head: `<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>`,
  component: `
    <div style="position: relative; width: 800px; height: 500px; margin: 70px auto 0; background: linear-gradient(135deg, #f5f7fa, #c3cfe2); color: #1a1a1a; border-radius: 12px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1); overflow: hidden;">
      <div style="position: absolute; top: 0; left: 550px; width: 300px; height: 100%; background-color: #baccec; transform: skewX(-12deg)"></div>
      <h1 style="position: absolute; top: 40px; left: 40px; font-size: 50px; margin: 0; font-weight: 700;">Absolute Mode</h1>
      <p style="position: absolute; top: 135px; left: 40px; font-size: 22px; max-width: 450px; line-height: 1.5; color: #333;">Enable free positioning for your elements — perfect for fixed layouts like presentations, business cards, or print-ready designs.</p>
      <ul data-gjs-type="text" style="position: absolute; top: 290px; left: 40px; font-size: 18px; line-height: 2; list-style: none; padding: 0;">
        <li>🎯 Drag & place elements anywhere</li>
        <li>🧲 Smart snapping & axis locking</li>
        <li>⚙️ You custom logic</li>
      </ul>
      <div style="position: absolute; left: 540px; top: 100px; width: 200px; height: 200px; background: rgba(255, 255, 255, 0.3); border-radius: 20px; backdrop-filter: blur(10px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; font-size: 80px;">📐</div>
      <div style="position: absolute; top: 405px; left: 590px; font-size: 14px; color: #555;">Studio SDK · GrapesJS</div>
    </div>
    <style>
      body {
        position: relative;
        background: linear-gradient(135deg, #f5f7fa, #c3cfe2);
        font-family: system-ui;
        overflow: hidden;
      }
    </style>
  `,
};

const DEVICES_CONFIG = {
  default: [
    {
      id: 'desktop',
      name: 'Desktop',
      width: '',
    },
    {
      id: 'tablet',
      name: 'Tablet',
      width: '770px',
      widthMedia: '992px',
    },
    {
      id: 'mobile',
      name: 'Mobile',
      width: '320px',
      widthMedia: '768px',
    },
  ],
  selected: 'mobile' as const,
};

export default function BannerEditor({ initialSettings }: BannerEditorProps) {
  const [editor, setEditor] = useState<Editor>();
  const [bannerId, setBannerId] = useState<string | null>(null);
  const [bannerName, setBannerName] = useState(DEFAULT_BANNER_NAME);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editorSettings, setEditorSettings] = useState<EditorSettingsType>(initialSettings);
  const searchParams = useSearchParams();
  const router = useRouter();
  const bannerDataRef = useRef<BannerData | null>(null);

  const injectTailwind = useCallback((editor: Editor) => {
    // Add Tailwind script to canvas iframe (for live editing)
    const canvasDoc = editor.Canvas.getDocument();
    if (canvasDoc && !canvasDoc.querySelector('script[src*="tailwindcss"]')) {
      const script = canvasDoc.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4';
      canvasDoc.head.appendChild(script);
    }

    // Add Tailwind script to page head (for export)
    const tailwindScript = '<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>';
    const page = editor.Pages.getSelected();
    if (page) {
      const currentHead = (page.get('head') as string) || '';
      if (!currentHead.includes('@tailwindcss/browser')) {
        page.set('head', currentHead + tailwindScript);
      }
    }
  }, []);

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
            // Re-inject Tailwind after loading project data
            setTimeout(() => {
              injectTailwind(editorInstance);
            }, EDITOR_LOAD_DELAY);
          }, EDITOR_LOAD_DELAY);
        }
      }
    } catch (error) {
      console.error('Error loading banner:', error);
    }
  }, [injectTailwind]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setBannerId(id);
    } else {
      setBannerId(null);
      setBannerName(DEFAULT_BANNER_NAME);
      bannerDataRef.current = null;
    }
  }, [searchParams]);

  const hideSectorViaDOM = useCallback((sectorId: string) => {
    const sectorName = sectorId.replace('gs-', '').toLowerCase();
    const sectorNameCapitalized = sectorName.charAt(0).toUpperCase() + sectorName.slice(1);

    const selectors = [
      `[data-sector-id="${sectorId}"]`,
      `[data-sector="${sectorId}"]`,
      `[id*="${sectorId}"]`,
      `[id*="${sectorName}"]`,
      `[class*="${sectorId}"]`,
      `[class*="${sectorName}"]`,
    ];

    let sectorEl: HTMLElement | null = null;
    for (const selector of selectors) {
      sectorEl = document.querySelector(selector) as HTMLElement;
      if (sectorEl) break;
    }

    if (!sectorEl) {
      const allSectors = Array.from(
        document.querySelectorAll('[class*="sector"], [data-sector], [id*="sector"]')
      );
      sectorEl = allSectors.find((el) => {
        const text = el.textContent?.toLowerCase() || '';
        const id = el.id?.toLowerCase() || '';
        const className = el.className?.toLowerCase() || '';
        return (
          text.includes(sectorName) ||
          text.includes(sectorNameCapitalized) ||
          id.includes(sectorId) ||
          id.includes(sectorName) ||
          className.includes(sectorId) ||
          className.includes(sectorName)
        );
      }) as HTMLElement;
    }

    if (sectorEl) {
      sectorEl.style.display = 'none';
      sectorEl.parentElement?.style.setProperty('display', 'none');
    }
  }, []);

  const applyStyleManagerSettings = useCallback(
    (editor: Editor, settings: EditorSettingsType) => {
      const styleManager = editor.StyleManager;
      if (!styleManager) return;

      const sectors = styleManager.getSectors();
      if (!sectors || sectors.length === 0) return;

      const sectorMap: Record<string, boolean> = {
        'gs-typography': settings.showTypographySection,
        'gs-layout': settings.showLayoutSection,
        'gs-size': settings.showSizeSection,
        'gs-space': settings.showSpaceSection,
        'gs-position': settings.showPositionSection,
        'gs-effects': settings.showEffectsSection,
        'gs-background': settings.showBackgroundSection,
        'gs-borders': settings.showBordersSection,
      };

      sectors.forEach((sector: Record<string, unknown>) => {
        const sectorId =
          (sector.id as string) || ((sector.getId as () => string)?.()) || '';
        const shouldBeVisible = sectorMap[sectorId];

        if (sectorId && shouldBeVisible !== undefined && !shouldBeVisible) {
          try {
            const sectorObj = sector as Record<string, unknown>;

            if (sectorObj.set && typeof sectorObj.set === 'function') {
              (sectorObj.set as (prop: string, value: boolean) => void)(
                'visible',
                false
              );
            } else if (
              sectorObj.setVisible &&
              typeof sectorObj.setVisible === 'function'
            ) {
              (sectorObj.setVisible as (visible: boolean) => void)(false);
            } else if ('visible' in sectorObj) {
              sectorObj.visible = false;
            }

            setTimeout(() => {
              const updatedSectors = styleManager.getSectors();
              const stillVisible = updatedSectors.find(
                (s: Record<string, unknown>) => {
                  const sId =
                    (s.id as string) || ((s.getId as () => string)?.()) || '';
                  return sId === sectorId;
                }
              );

              if (stillVisible) {
                const styleManagerApi = styleManager as unknown as Record<
                  string,
                  unknown
                >;
                if (
                  styleManagerApi.removeSector &&
                  typeof styleManagerApi.removeSector === 'function'
                ) {
                  (styleManagerApi.removeSector as (id: string) => void)(
                    sectorId
                  );
                } else if (
                  sectorObj.remove &&
                  typeof sectorObj.remove === 'function'
                ) {
                  (sectorObj.remove as () => void)();
                } else {
                  hideSectorViaDOM(sectorId);
                }
              }
            }, SECTOR_HIDE_DELAY);
          } catch (error) {
            console.error(`Error hiding sector ${sectorId}:`, error);
            hideSectorViaDOM(sectorId);
          }
        }
      });
    },
    [hideSectorViaDOM]
  );

  useEffect(() => {
    if (editor && editorSettings) {
      const styleManager = editor.StyleManager;
      if (styleManager) {
        setTimeout(() => {
          applyStyleManagerSettings(editor, editorSettings);
        }, STYLE_MANAGER_DELAY);
      }
    }
  }, [editor, editorSettings, applyStyleManagerSettings]);

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

  const applyDefaultTemplate = useCallback((editor: Editor) => {
    setTimeout(() => {
      editor.setComponents(DEFAULT_COMPONENT);
      editor.setStyle(DEFAULT_STYLES);
    }, DEFAULT_TEMPLATE_DELAY);
  }, []);

  const onReady = async (editor: Editor) => {
    setEditor(editor);

    injectTailwind(editor);

    if (editorSettings) {
      const styleManager = editor.StyleManager;
      if (styleManager) {
        setTimeout(() => {
          applyStyleManagerSettings(editor, editorSettings);
        }, STYLE_MANAGER_DELAY);
      }
    }

    const id = searchParams.get('id');
    if (id) {
      await loadBanner(id, editor);
    } else {
      applyDefaultTemplate(editor);
    }
  };

  const showToast = useCallback(
    (id: string, content: string) =>
      editor?.runCommand(StudioCommands.toastAdd, {
        id,
        header: 'Notification',
        content,
        variant: ToastVariant.Info,
      }),
    [editor]
  );

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
        editorType: 'grapesjs',
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
    <main className="flex h-screen flex-col justify-between p-5 gap-2 relative">
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
          onClick={() => setShowSettings(!showSettings)}
          className="border rounded px-3 py-1 hover:bg-gray-100"
        >
          ⚙️ Settings
        </button>
        <button
          onClick={saveBanner}
          disabled={saving}
          className="bg-blue-600 text-white rounded px-4 py-1 hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Banner'}
        </button>
      </div>
      <div className="flex-1 w-full h-full overflow-hidden">
        <StudioEditor
          onReady={onReady}
          options={{
            licenseKey: process.env.NEXT_PUBLIC_GRAPESJS_LICENSE_KEY || '',
            pages: false,
            plugins: [canvasAbsoluteMode],
            project: {
              default: {
                pages: [DEFAULT_PAGE_CONFIG],
              },
            },
            devices: DEVICES_CONFIG,
          }}
          style={{ height: '100%', width: '100%' }}
        />
      </div>
      {showSettings && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg max-h-[90vh] overflow-y-auto w-full max-w-3xl m-4">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-bold">Editor Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <EditorSettings
                initialSettings={editorSettings as EditorSettingsType & { id: string }}
                onSave={async (savedSettings) => {
                  setEditorSettings(savedSettings);
                  setShowSettings(false);

                  if (editor) {
                    window.location.reload();
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
