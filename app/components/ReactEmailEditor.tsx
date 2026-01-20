'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import EmailEditor, { EditorRef } from 'react-email-editor';

interface EmailEditorExportData {
  design: unknown;
  html: string;
}

export default function ReactEmailEditor() {
  const [bannerId, setBannerId] = useState<string | null>(null);
  const [bannerName, setBannerName] = useState('Untitled Banner');
  const [saving, setSaving] = useState(false);
  const [editorLoaded, setEditorLoaded] = useState(false);
  const emailEditorRef = useRef<EditorRef>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setBannerId(id);
      if (editorLoaded) {
        loadBanner(id);
      }
    } else {
      setBannerId(null);
      setBannerName('Untitled Banner');
    }
  }, [searchParams, editorLoaded]);

  const onEditorReady = () => {
    setEditorLoaded(true);

    // Load banner if there's an ID in the URL
    const id = searchParams.get('id');
    if (id) {
      loadBanner(id);
    }
  };

  const loadBanner = async (id: string) => {
    try {
      const response = await fetch(`/api/banners/${id}`);
      if (!response.ok) throw new Error('Failed to load banner');
      const data = await response.json();

      if (data && data.projectData) {
        setBannerName(data.name);

        // Load design into react-email-editor
        if (emailEditorRef.current && data.projectData) {
          try {
            // react-email-editor uses 'design' field for its data
            const design = typeof data.projectData === 'object' && 'design' in data.projectData
              ? data.projectData.design
              : data.projectData;

            emailEditorRef.current.editor?.loadDesign(design);
          } catch (error) {
            console.error('Error loading design:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading banner:', error);
    }
  };

  const logHtml = () => {
    if (!emailEditorRef.current?.editor) return;

    // Export design from react-email-editor
    emailEditorRef.current.editor.exportHtml((data: EmailEditorExportData) => {
      const { design, html } = data;

      console.log('=== HTML to be saved ===');
      console.log(html);
      console.log('=== Design JSON ===');
      console.log(JSON.stringify(design, null, 2));
      console.log('===================');
    });
  };

  const saveBanner = async () => {
    if (!emailEditorRef.current?.editor) return;

    try {
      setSaving(true);

      // Export design from react-email-editor
      emailEditorRef.current.editor.exportHtml((data: EmailEditorExportData) => {
        const { design, html } = data;

        // Extract CSS from HTML if needed, or use inline styles
        const projectData = { design };

        const bannerData = {
          name: bannerName,
          projectData,
          html: html || '',
          css: '', // react-email-editor uses inline styles
          editorType: 'react-email-editor',
        };

        if (bannerId) {
          fetch(`/api/banners/${bannerId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(bannerData),
          })
            .then((response) => {
              if (!response.ok) throw new Error('Failed to update banner');
              alert('Banner saved successfully');
            })
            .catch((error) => {
              console.error('Error saving banner:', error);
              alert('Failed to save banner');
            })
            .finally(() => {
              setSaving(false);
            });
        } else {
          fetch('/api/banners', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(bannerData),
          })
            .then((response) => {
              if (!response.ok) throw new Error('Failed to create banner');
              return response.json();
            })
            .then((data) => {
              if (data) {
                setBannerId(data.id);
                router.replace(`/editor?editorType=react-email-editor&id=${data.id}`);
                alert('Banner created successfully');
              }
            })
            .catch((error) => {
              console.error('Error creating banner:', error);
              alert('Failed to create banner');
            })
            .finally(() => {
              setSaving(false);
            });
        }
      });
    } catch (error) {
      console.error('Error saving banner:', error);
      alert('Failed to save banner');
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
          onClick={logHtml}
          className="border rounded px-3 py-1 hover:bg-gray-100"
        >
          Log HTML
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
        <EmailEditor
          ref={emailEditorRef}
          onReady={onEditorReady}
          minHeight="100%"
          options={{
            displayMode: 'email',
            locale: 'pt-BR',
            appearance: {
              theme: 'light',
              panels: {
                tools: {
                  dock: 'left'
                }
              }
            },
            features: {
              preview: true,
              stockImages: true,
            },
            editor: {
              minRows: 1,
              autoSelectOnDrop: true,
            },
            tools: {
              rows: {
                properties: {
                  noStackMobile: {
                    editor: {
                      _override: {
                        mobile: {
                          defaultValue: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          }}
        />
      </div>
    </main>
  );
}
