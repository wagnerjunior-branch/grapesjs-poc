'use client';

import { useState, useEffect, useCallback } from 'react';
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

  const loadBanner = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/banners/${id}`);
      if (!response.ok) throw new Error('Failed to load banner');
      const data = await response.json();
      if (data) {
        setBannerName(data.name);
      }
    } catch (error) {
      console.error('Error loading banner:', error);
    }
  }, []);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setBannerId(id);
      loadBanner(id);
    }
  }, [searchParams, loadBanner]);

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

    if (bannerId) {
      try {
        const response = await fetch(`/api/banners/${bannerId}`);
        if (!response.ok) throw new Error('Failed to load banner');
        const data = await response.json();
        if (data && data.projectData) {
          editor.loadProjectData(data.projectData);
        }
      } catch (error) {
        console.error('Error loading banner data:', error);
      }
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

      const styleManager = editor.StyleManager;
      const allSectors = styleManager.getSectors();

      interface Sector {
        getId: () => string;
        getName?: () => string;
        getLabel?: () => string;
        get: (key: string) => string;
        set: (key: string, value: unknown) => void;
      }

      // console.log('All sectors:', allSectors.map((s: Sector) => ({
      //   id: s.getId(),
      //   name: s.getName ? s.getName() : s.get('name'),
      //   label: s.getLabel ? s.getLabel() : s.get('label'),
      // })));

      // allSectors.forEach((sector: Sector) => {
      //   if (!sector || typeof sector.getId !== 'function') {
      //     return;
      //   }
      //   
      //   const sectorId = sector.getId();
      //   const sectorName = sector.getName ? sector.getName() : sector.get('name');
      //   const sectorLabel = sector.getLabel ? sector.getLabel() : sector.get('label');

      //   const isTypography =
      //     sectorId?.toLowerCase().includes('typography') ||
      //     sectorName?.toLowerCase().includes('typography') ||
      //     sectorLabel?.toLowerCase().includes('typography') ||
      //     sectorId === 'typography' ||
      //     sectorName === 'Typography' ||
      //     sectorLabel === 'Typography';

      //   if (isTypography) {
      //     try {
      //       sector.set('visible', false);
      //       styleManager.removeSector(sectorId);
      //       console.log('Typography sector hidden:', sectorId);
      //     } catch (e) {
      //       console.log('Error hiding typography sector:', e);
      //     }
      //   }
      // });

      // const typographyElements = document.querySelectorAll('.gjs-sm-sector[data-name*="typography" i], .gjs-sm-sector-title');
      // typographyElements.forEach((element) => {
      //   const textContent = element.textContent?.toLowerCase() || '';
      //   if (textContent.includes('typography')) {
      //     (element as HTMLElement).style.display = 'none';
      //     (element as HTMLElement).parentElement?.setAttribute('style', 'display: none !important');
      //   }
      // });
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

    const pages = editor.Pages.getAll();
    if (pages.length > 0) {
      const currentPage = pages[0];
      const currentComponent = currentPage.getMainComponent();
      const currentHtml = editor.getHtml();

      if (!currentHtml.includes('Mobile Notification') && !currentHtml.includes('YOUR APP')) {
        editor.setComponents(`
          <div style="background-color: #0072c3; border-radius: 8px; padding: 13px 14px; position: relative; width: 100%; max-width: 400px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
              <div style="position: relative; flex-shrink: 0;">
                <button style="background: none; border: none; padding: 0; cursor: pointer; opacity: 0.7; width: 16px; height: 16px; position: absolute; left: 0; top: 0;">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4L4 12M4 4L12 12" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
                <div style="width: 50px; height: 50px; background-color: white; border-radius: 7.353px; box-shadow: 0px 2.941px 7.353px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; margin-left: 32px;">
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 3L5 8L13 13L21 8L13 3Z" fill="#303654"/>
                    <path d="M5 10L13 15L21 10" stroke="#009BDE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M5 13L13 18L21 13" stroke="#009BDE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="8" cy="8" r="1.5" fill="#009BDE"/>
                    <circle cx="13" cy="10" r="1.5" fill="#009BDE"/>
                    <circle cx="18" cy="8" r="1.5" fill="#009BDE"/>
                    <circle cx="10" cy="13" r="1.5" fill="#009BDE"/>
                    <circle cx="16" cy="13" r="1.5" fill="#009BDE"/>
                  </svg>
                </div>
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                  <h2 style="margin: 0; font-family: 'IBM Plex Sans', sans-serif; font-weight: 500; font-size: 14px; line-height: 24px; color: white; letter-spacing: 0px; text-transform: uppercase;">YOUR APP</h2>
                  <button style="background-color: white; border: none; border-radius: 25px; padding: 4px 12px; cursor: pointer; height: 25px; min-width: 83px;">
                    <span style="font-family: 'IBM Plex Sans', sans-serif; font-weight: 400; font-size: 10px; line-height: 24px; color: #0072c3; letter-spacing: 0px;">Open App</span>
                  </button>
                </div>
                <p style="margin: 0 0 4px 0; font-family: 'IBM Plex Sans', sans-serif; font-weight: 400; font-size: 9px; line-height: 24px; color: white; letter-spacing: 0px; opacity: 0.9;">Insert a description of your app here.</p>
                <div style="display: flex; align-items: center; gap: 2px; height: 12px;">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 0L7.5 4.5L12 5.5L8.5 9L9.5 13.5L6 11L2.5 13.5L3.5 9L0 5.5L4.5 4.5L6 0Z" fill="white"/>
                  </svg>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 0L7.5 4.5L12 5.5L8.5 9L9.5 13.5L6 11L2.5 13.5L3.5 9L0 5.5L4.5 4.5L6 0Z" fill="white"/>
                  </svg>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 0L7.5 4.5L12 5.5L8.5 9L9.5 13.5L6 11L2.5 13.5L3.5 9L0 5.5L4.5 4.5L6 0Z" fill="white"/>
                  </svg>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 0L7.5 4.5L12 5.5L8.5 9L9.5 13.5L6 11L2.5 13.5L3.5 9L0 5.5L4.5 4.5L6 0Z" fill="white"/>
                  </svg>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 0L7.5 4.5L12 5.5L8.5 9L9.5 13.5L6 11L2.5 13.5L3.5 9L0 5.5L4.5 4.5L6 0Z" fill="white" opacity="0.5"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        `);
      }
    }
  };

  const showToast = (id: string) =>
    editor?.runCommand(StudioCommands.toastAdd, {
      id,
      header: 'Toast header',
      content: 'Data logged in console',
      variant: ToastVariant.Info,
    });

  const getProjetData = () => {
    if (editor) {
      console.log({ projectData: editor?.getProjectData() });
      showToast('log-project-data');
    }
  };

  const getExportData = () => {
    if (editor) {
      console.log({ html: editor?.getHtml(), css: editor?.getCss() });
      showToast('log-html-css');
    }
  };

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
        showToast('banner-saved');
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
          showToast('banner-created');
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
        <button className="border rounded px-2" onClick={getProjetData}>
          Log Project Data
        </button>
        <button className="border rounded px-2" onClick={getExportData}>
          Log HTML/CSS
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
                    component: `
                      <div style="background-color: #0072c3; border-radius: 8px; padding: 13px 14px; position: relative; width: 100%; max-width: 400px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                        <div style="display: flex; align-items: flex-start; gap: 12px;">
                          <div style="position: relative; flex-shrink: 0;">
                            <button style="background: none; border: none; padding: 0; cursor: pointer; opacity: 0.7; width: 16px; height: 16px; position: absolute; left: 0; top: 0;">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 4L4 12M4 4L12 12" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                              </svg>
                            </button>
                            <div style="width: 50px; height: 50px; background-color: white; border-radius: 7.353px; box-shadow: 0px 2.941px 7.353px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; margin-left: 32px;">
                              <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13 3L5 8L13 13L21 8L13 3Z" fill="#303654"/>
                                <path d="M5 10L13 15L21 10" stroke="#009BDE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M5 13L13 18L21 13" stroke="#009BDE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <circle cx="8" cy="8" r="1.5" fill="#009BDE"/>
                                <circle cx="13" cy="10" r="1.5" fill="#009BDE"/>
                                <circle cx="18" cy="8" r="1.5" fill="#009BDE"/>
                                <circle cx="10" cy="13" r="1.5" fill="#009BDE"/>
                                <circle cx="16" cy="13" r="1.5" fill="#009BDE"/>
                              </svg>
                            </div>
                          </div>
                          <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                              <h2 style="margin: 0; font-family: 'IBM Plex Sans', sans-serif; font-weight: 500; font-size: 14px; line-height: 24px; color: white; letter-spacing: 0px; text-transform: uppercase;">YOUR APP</h2>
                              <button style="background-color: white; border: none; border-radius: 25px; padding: 4px 12px; cursor: pointer; height: 25px; min-width: 83px;">
                                <span style="font-family: 'IBM Plex Sans', sans-serif; font-weight: 400; font-size: 10px; line-height: 24px; color: #0072c3; letter-spacing: 0px;">Open App</span>
                              </button>
                            </div>
                            <p style="margin: 0 0 4px 0; font-family: 'IBM Plex Sans', sans-serif; font-weight: 400; font-size: 9px; line-height: 24px; color: white; letter-spacing: 0px; opacity: 0.9;">Insert a description of your app here.</p>
                            <div style="display: flex; align-items: center; gap: 2px; height: 12px;">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 0L7.5 4.5L12 5.5L8.5 9L9.5 13.5L6 11L2.5 13.5L3.5 9L0 5.5L4.5 4.5L6 0Z" fill="white"/>
                              </svg>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 0L7.5 4.5L12 5.5L8.5 9L9.5 13.5L6 11L2.5 13.5L3.5 9L0 5.5L4.5 4.5L6 0Z" fill="white"/>
                              </svg>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 0L7.5 4.5L12 5.5L8.5 9L9.5 13.5L6 11L2.5 13.5L3.5 9L0 5.5L4.5 4.5L6 0Z" fill="white"/>
                              </svg>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 0L7.5 4.5L12 5.5L8.5 9L9.5 13.5L6 11L2.5 13.5L3.5 9L0 5.5L4.5 4.5L6 0Z" fill="white"/>
                              </svg>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 0L7.5 4.5L12 5.5L8.5 9L9.5 13.5L6 11L2.5 13.5L3.5 9L0 5.5L4.5 4.5L6 0Z" fill="white" opacity="0.5"/>
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    `,
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
