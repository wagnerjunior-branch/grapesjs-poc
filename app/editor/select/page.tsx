'use client';

import { useRouter } from 'next/navigation';

export default function EditorSelectPage() {
  const router = useRouter();

  const selectEditor = (editorType: 'grapesjs' | 'react-email-editor') => {
    router.push(`/editor?editorType=${editorType}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2 text-center">Select Editor</h1>
          <p className="text-gray-600 text-center mb-8">
            Choose which editor you want to use to create your template
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              onClick={() => selectEditor('grapesjs')}
              className="border-2 border-gray-200 rounded-lg p-6 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">🎨</div>
                <h2 className="text-xl font-semibold mb-2">GrapesJS</h2>
                <p className="text-gray-600 text-sm mb-4">
                  Powerful visual page builder with advanced customization options
                </p>
                <button className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                  Use GrapesJS
                </button>
              </div>
            </div>

            <div
              onClick={() => selectEditor('react-email-editor')}
              className="border-2 border-gray-200 rounded-lg p-6 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">📧</div>
                <h2 className="text-xl font-semibold mb-2">React Email Editor</h2>
                <p className="text-gray-600 text-sm mb-4">
                  Specialized email template editor with drag-and-drop interface
                </p>
                <button className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                  Use React Email Editor
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back to Templates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
