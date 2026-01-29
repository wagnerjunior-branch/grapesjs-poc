'use client';

import { useEffect, useRef, useState } from 'react';

interface TemplatePreviewProps {
  html: string;
  title?: string;
  onLoad?: () => void;
}

/**
 * TemplatePreview Component
 *
 * Renders HTML in an isolated iframe with live updates.
 * Uses srcdoc for security and proper sandboxing.
 */
export default function TemplatePreview({
  html,
  title = 'Template Preview',
  onLoad,
}: TemplatePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(1);

  // Update iframe content when HTML changes
  useEffect(() => {
    if (iframeRef.current) {
      setIsLoading(true);

      // Check if HTML is already a complete document
      const isFullDocument = html.trim().toLowerCase().startsWith('<!doctype') ||
                            html.trim().toLowerCase().startsWith('<html');

      console.log('=== TEMPLATE PREVIEW ===');
      console.log('Is full document:', isFullDocument);
      console.log('HTML length:', html.length);
      console.log('HTML starts with:', html.substring(0, 200));

      // If it's already a full document, use it as-is
      // Otherwise, wrap it in a complete document structure
      const completeHtml = isFullDocument ? html : wrapHtmlWithDocument(html);

      console.log('Complete HTML length:', completeHtml.length);
      console.log('Complete HTML starts with:', completeHtml.substring(0, 200));

      // Update iframe content
      iframeRef.current.srcdoc = completeHtml;
    }
  }, [html]);

  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  // Zoom controls
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));
  const handleZoomReset = () => setScale(1);

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Preview Header */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-3">
        <div>
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">Live Preview</p>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            aria-label="Zoom out"
          >
            −
          </button>
          <span className="min-w-[3rem] text-center text-xs font-medium text-gray-700">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            disabled={scale >= 2}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={handleZoomReset}
            className="ml-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="relative flex-1 overflow-auto bg-gray-100 p-4">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50">
            <div className="text-sm text-gray-600">Loading preview...</div>
          </div>
        )}

        <div
          className="mx-auto transition-transform"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          <iframe
            ref={iframeRef}
            onLoad={handleIframeLoad}
            title="Template Preview"
            className="block h-[600px] w-full border border-gray-300 bg-white shadow-lg"
            sandbox="allow-same-origin allow-scripts"
            style={{
              minWidth: '320px',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Wrap HTML content in a complete document with necessary styles
 */
function wrapHtmlWithDocument(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>

  <!-- Tailwind CSS v4 -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- IBM Plex Sans Font -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&display=swap" rel="stylesheet">

  <style>
    body {
      font-family: 'IBM Plex Sans', sans-serif;
      margin: 0;
      padding: 0;
    }

    /* Highlight editable elements on hover (for debugging) */
    [data-editable-id]:hover {
      outline: 2px dashed rgba(59, 130, 246, 0.5);
      outline-offset: 2px;
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}
