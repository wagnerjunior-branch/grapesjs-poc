'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Banner {
  id: string;
  name: string;
  projectData: Record<string, unknown>;
  html: string;
  css: string;
  createdAt: string;
  updatedAt: string;
}

function BannerPreview({ html, css }: { html: string; css: string }) {
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    setIframeKey((prev) => prev + 1);
  }, [html, css]);

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=375, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          html, body {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            overflow-x: hidden !important;
            -webkit-text-size-adjust: 100%;
          }
          
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          
          body > * {
            width: 100%;
            max-width: 100%;
          }
          
          ${css}
          
          @media (min-width: 376px) {
            * {
              max-width: 375px !important;
            }
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;

  const iframeSrc = `data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`;

  return (
    <div className="relative bg-linear-to-br from-gray-200 to-gray-300 p-6 flex justify-center items-center min-h-[300px]">
      <div className="relative w-full max-w-[375px] bg-black rounded-[3.5rem] shadow-2xl overflow-hidden border-4 border-gray-800">
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-48 h-8 bg-black rounded-b-3xl z-10 flex items-start justify-center pt-1.5">
        </div>
        <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gray-900 rounded-full z-10"></div>
        <div className="pt-12 pb-4 px-2 bg-gray-900">
          <div className="bg-white rounded-t-3xl overflow-hidden shadow-inner" style={{ height: '400px', width: '100%', maxWidth: '100%' }}>
            <iframe
              key={iframeKey}
              src={iframeSrc}
              className="w-full border-0 bg-white"
              style={{
                width: '100%',
                maxWidth: '100%',
                height: '400px',
                border: 'none',
                display: 'block',
              }}
              sandbox="allow-same-origin"
              scrolling="auto"
              title="Banner Preview"
            />
          </div>
        </div>
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 w-36 h-1 bg-gray-900 rounded-full"></div>
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gray-800 rounded-full mb-1"></div>
      </div>
    </div>
  );
}

export default function BannerList() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/banners');
      if (!response.ok) throw new Error('Failed to load banners');
      const data = await response.json();
      setBanners(data);
    } catch (error) {
      console.error('Error loading banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) {
      return;
    }

    try {
      const response = await fetch(`/api/banners/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete banner');
      loadBanners();
    } catch (error) {
      console.error('Error deleting banner:', error);
      alert('Failed to delete banner');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading banners...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Banner Templates</h1>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/creatives')}
              className="border rounded px-4 py-2 hover:bg-gray-100"
            >
              View Creatives
            </button>
            <button
              onClick={() => router.push('/editor')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create New Template
            </button>
          </div>
        </div>

        {banners.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No banners found</p>
            <button
              onClick={() => router.push('/editor')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Banner
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white flex flex-col"
              >
                <BannerPreview html={banner.html} css={banner.css} />
                <div className="p-4 pt-0 flex flex-col flex-1">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold mb-2">{banner.name}</h2>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(banner.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => router.push(`/editor?id=${banner.id}`)}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
