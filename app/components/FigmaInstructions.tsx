'use client';

import { useState } from 'react';
import { validateFigmaUrl } from '@/app/lib/figma-utils';

/**
 * FigmaInstructions Component
 *
 * Shows instructions for the automated Figma workflow.
 * Users paste URLs directly in chat for automatic processing.
 */
export default function FigmaInstructions() {
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const handleValidate = () => {
    const validation = validateFigmaUrl(url);
    setIsValid(validation.valid);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="w-full max-w-3xl">

        {/* Hero Section */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-purple-100">
            <svg className="h-10 w-10 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Figma to Form Editor
          </h1>
          <p className="text-lg text-gray-600">
            Automated workflow powered by Claude Code
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-xl bg-white p-8 shadow-xl">

          {/* How It Works */}
          <div className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">
              🚀 How It Works (Automated)
            </h2>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 font-bold text-purple-600">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 font-semibold text-gray-900">Copy Your Figma URL</h3>
                  <p className="text-sm text-gray-600">
                    Open Figma, select a frame/component, and copy the URL from your browser.
                    Make sure it includes <code className="rounded bg-gray-100 px-1 text-xs">node-id</code>.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 font-bold text-purple-600">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 font-semibold text-gray-900">Paste in Chat Below</h3>
                  <p className="text-sm text-gray-600">
                    Paste your Figma URL in the chat (scroll down). No need to say anything else!
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100 font-bold text-green-600">
                  ✓
                </div>
                <div className="flex-1">
                  <h3 className="mb-1 font-semibold text-gray-900">I Process Automatically</h3>
                  <p className="text-sm text-gray-600">
                    Claude Code automatically invokes the <code className="rounded bg-gray-100 px-1 text-xs">/html-renderer</code> skill,
                    generates HTML, and provides a direct link to edit.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* URL Validator */}
          <div className="mb-8 rounded-lg border-2 border-gray-200 bg-gray-50 p-6">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">
              ✅ Validate Your URL First (Optional)
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Want to check if your URL is valid before pasting in chat? Test it here:
            </p>

            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setIsValid(null);
                }}
                placeholder="https://www.figma.com/design/..."
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={handleValidate}
                className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Validate
              </button>
            </div>

            {isValid === true && (
              <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                ✅ Valid Figma URL! Ready to paste in chat below.
              </div>
            )}

            {isValid === false && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                ❌ Invalid URL. Make sure it includes <code className="rounded bg-red-100 px-1">node-id</code> parameter.
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            {/* Try Demo */}
            <a
              href="/template-editor?demo=figma-banner"
              className="block rounded-lg bg-blue-600 px-6 py-4 text-center font-medium text-white hover:bg-blue-700"
            >
              🎨 Try the Demo Banner (Already Processed)
            </a>

            {/* Example URL */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="mb-2 text-sm font-semibold text-gray-700">Example Figma URL:</h4>
              <code className="block break-all text-xs text-gray-600">
                https://www.figma.com/design/uXhPriLGgHXFqLIZw4xx3T/Banners?node-id=3556-11384&m=dev
              </code>
              <p className="mt-2 text-xs text-gray-500">
                Try pasting this in the chat to see it work!
              </p>
            </div>
          </div>

        </div>

        {/* Footer Note */}
        <div className="mt-6 rounded-lg bg-amber-50 p-4 text-center">
          <p className="text-sm text-amber-900">
            💡 <strong>Pro Tip:</strong> Just paste Figma URLs directly in the chat - I'll handle everything automatically!
          </p>
        </div>

      </div>
    </div>
  );
}
