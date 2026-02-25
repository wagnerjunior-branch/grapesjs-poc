'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Banner {
  id: string;
  name: string;
  html: string;
  css: string;
  projectData: Record<string, unknown>;
  createdAt: string;
}

export default function NewCreativePage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadBanners() {
      try {
        const response = await fetch('/api/banners');
        if (!response.ok) throw new Error('Failed to load banners');
        const data = await response.json();
        setBanners(data);
      } catch (error) {
        console.error('Error loading banners:', error);
      } finally {
        setLoading(false);
      }
    }
    loadBanners();
  }, []);

  const handleSelect = async (banner: Banner) => {
    try {
      setCreating(banner.id);
      const response = await fetch('/api/creatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${banner.name} - Creative`,
          bannerId: banner.id,
          projectData: banner.projectData,
          html: banner.html,
          css: banner.css,
        }),
      });
      if (!response.ok) throw new Error('Failed to create creative');
      const creative = await response.json();
      router.push(`/creatives/${creative.id}`);
    } catch (error) {
      console.error('Error creating creative:', error);
      alert('Failed to create creative');
      setCreating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Select a Template</h1>
          <button
            onClick={() => router.push('/creatives')}
            className="border rounded px-4 py-2 hover:bg-gray-100"
          >
            Back to Creatives
          </button>
        </div>
        <p className="text-gray-600 mb-6">Choose a banner template to create a new creative variation.</p>

        {banners.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No templates available. Create a banner first.</p>
            <button
              onClick={() => router.push('/editor')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create a Banner
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banners.map((banner) => (
              <button
                key={banner.id}
                onClick={() => handleSelect(banner)}
                disabled={creating !== null}
                className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white text-left cursor-pointer disabled:opacity-50"
              >
                <div className="p-4">
                  <h2 className="text-lg font-semibold mb-1">{banner.name}</h2>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(banner.createdAt).toLocaleDateString()}
                  </p>
                  {creating === banner.id && (
                    <p className="text-sm text-blue-600 mt-2">Creating...</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
