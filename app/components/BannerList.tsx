'use client';

import { useState, useEffect } from 'react';
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
          <button
            onClick={() => router.push('/editor')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create New Banner
          </button>
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
                className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-white"
              >
                <div className="mb-4">
                  <h2 className="text-xl font-semibold mb-2">{banner.name}</h2>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(banner.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
