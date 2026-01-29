'use client';

import { useState, useCallback } from 'react';
import { validateFigmaUrl, parseFigmaUrl } from '@/app/lib/figma-utils';

/**
 * FigmaProcessor Component
 *
 * Simple UI: User pastes Figma URL and clicks ONE button.
 * Displays request in a format Claude Code detects and processes automatically.
 */
export default function FigmaProcessor() {
  const [url, setUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<{
    fileKey: string;
    nodeId: string;
    timestamp: number;
  } | null>(null);

  const handleProcess = useCallback(async () => {
    setError(null);

    // Validate URL
    const validation = validateFigmaUrl(url);
    if (!validation.valid) {
      setError(validation.error || 'Invalid Figma URL');
      return;
    }

    // Parse URL
    const parseResult = parseFigmaUrl(url);
    if (!parseResult.success || !parseResult.data) {
      setError(parseResult.error || 'Failed to parse URL');
      return;
    }

    const { fileKey, nodeId } = parseResult.data;

    // Set processing state
    setProcessing(true);
    setRequest({
      fileKey,
      nodeId,
      timestamp: Date.now(),
    });

    // Log to console in a format Claude can detect
    console.log('🎨 FIGMA_PROCESSING_REQUEST:', JSON.stringify({
      action: 'INVOKE_HTML_RENDERER_SKILL',
      fileKey,
      nodeId,
      url,
      timestamp: Date.now(),
    }));

  }, [url]);

  const handleLoadTemplate = useCallback(async () => {
    setError(null);
    setProcessing(true);

    try {
      const response = await fetch('/api/load-template?template=banner-standard-right');

      if (!response.ok) {
        throw new Error('Failed to load template');
      }

      const data = await response.json();

      if (data.success && data.projectData) {
        const encodedData = encodeURIComponent(JSON.stringify(data.projectData));
        window.location.href = `/editor?template=${encodedData}&name=${encodeURIComponent(data.templateName)}`;
      } else {
        throw new Error('Invalid template data');
      }
    } catch (err) {
      setError('Failed to load template. Please try again.');
      setProcessing(false);
      console.error('Template load error:', err);
    }
  }, []);

  const handleLoadTemplateToFormEditor = useCallback(() => {
    // Directly load from the demo route which reads the original HTML
    // from /public/banner-standard-right.html with all Tailwind classes preserved
    window.location.href = '/template-editor?demo=true';
  }, []);

  const handleLoadFullHtmlToFormEditor = useCallback(() => {
    // Load the FULL HTML document (including <head>, <style>, scripts)
    // into the form editor - no GrapeJS conversion
    window.location.href = '/template-editor?demo=full';
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-purple-100">
            <svg className="h-10 w-10 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Figma to Form Editor
          </h1>
          <p className="text-gray-600">
            Paste your Figma URL and click Process
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-xl bg-white p-8 shadow-xl">

          {!processing && !request && (
            <>
              {/* Input Section */}
              <div className="mb-6">
                <label htmlFor="figma-url" className="mb-2 block text-sm font-medium text-gray-700">
                  Figma Design URL
                </label>
                <input
                  id="figma-url"
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError(null);
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    setUrl(pasted.trim());
                    setError(null);
                  }}
                  placeholder="https://www.figma.com/design/{file-id}?node-id={node-id}"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Paste your Figma URL (must include node-id parameter)
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800">
                  ❌ {error}
                </div>
              )}

              {/* Process Button */}
              <button
                onClick={handleProcess}
                disabled={!url}
                className="w-full rounded-lg bg-purple-600 px-6 py-4 text-lg font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              >
                Process with Claude Code
              </button>

              {/* Demo Buttons */}
              <div className="mt-6 space-y-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-gray-900">
                    📁 Load Existing Template
                  </h4>

                  {/* GrapeJS Visual Editor Button */}
                  <button
                    onClick={handleLoadTemplate}
                    disabled={processing}
                    className="block w-full rounded-lg bg-blue-600 px-6 py-3 text-center font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    Open in GrapeJS Visual Editor
                  </button>
                  <p className="mt-2 text-xs text-gray-600">
                    Converts the HTML template to GrapeJS format and opens it in the visual editor with drag-and-drop editing.
                  </p>

                  {/* Form Editor Button (Body Content Only) */}
                  <button
                    onClick={handleLoadTemplateToFormEditor}
                    disabled={processing}
                    className="mt-3 block w-full rounded-lg border-2 border-green-600 bg-white px-6 py-3 text-center font-medium text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:border-gray-400 disabled:text-gray-400"
                  >
                    Open in Form Editor (Body Only)
                  </button>
                  <p className="mt-2 text-xs text-gray-600">
                    Opens just the body content in the form-based editor. Excludes &lt;head&gt;, scripts, and styles.
                  </p>

                  {/* Form Editor Button (Full HTML Document) */}
                  <button
                    onClick={handleLoadFullHtmlToFormEditor}
                    disabled={processing}
                    className="mt-3 block w-full rounded-lg border-2 border-purple-600 bg-white px-6 py-3 text-center font-medium text-purple-700 hover:bg-purple-50 disabled:cursor-not-allowed disabled:border-gray-400 disabled:text-gray-400"
                  >
                    Open in Form Editor (Full HTML)
                  </button>
                  <p className="mt-2 text-xs text-gray-600">
                    Opens the complete HTML document including &lt;head&gt;, scripts, styles, and body. No GrapeJS conversion.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Processing/Request State */}
          {processing && request && (
            <div className="space-y-6">

              {/* Request Details */}
              <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <svg className="h-8 w-8 animate-spin text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-purple-900">Processing Request</h3>
                    <p className="text-sm text-purple-700">Claude Code is invoking the html-renderer skill</p>
                  </div>
                </div>

                <div className="space-y-2 rounded bg-white p-4">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">File Key:</span>
                    <code className="rounded bg-gray-100 px-2 py-1 text-purple-600">{request.fileKey}</code>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Node ID:</span>
                    <code className="rounded bg-gray-100 px-2 py-1 text-purple-600">{request.nodeId}</code>
                  </div>
                </div>
              </div>

              {/* Claude Instructions - This is what I see and respond to */}
              <div className="rounded-lg border-2 border-green-300 bg-green-50 p-6">
                <h3 className="mb-3 text-lg font-semibold text-green-900">
                  📋 Request for Claude Code
                </h3>
                <div className="rounded-lg bg-white p-4 font-mono text-sm">
                  <p className="mb-2 text-green-800">
                    <strong>CLAUDE_CODE_REQUEST:</strong>
                  </p>
                  <p className="mb-2 text-gray-800">
                    Please invoke the <code className="rounded bg-green-100 px-2 py-1 text-green-700">/html-renderer</code> skill
                  </p>
                  <p className="text-gray-800">
                    Figma Node: <code className="rounded bg-green-100 px-2 py-1 text-green-700">{request.fileKey}/{request.nodeId}</code>
                  </p>
                </div>
                <p className="mt-3 text-xs text-green-700">
                  ⏳ Waiting for Claude Code to process... (typically 10-30 seconds)
                </p>
              </div>

              {/* Reset Button */}
              <button
                onClick={() => {
                  setProcessing(false);
                  setRequest(null);
                  setUrl('');
                }}
                className="w-full rounded-lg border-2 border-gray-300 bg-white px-6 py-3 text-gray-700 hover:bg-gray-50"
              >
                Process Another Design
              </button>

            </div>
          )}

        </div>

        {/* Instructions */}
        <div className="mt-6 rounded-lg bg-blue-50 p-4">
          <h4 className="mb-2 text-sm font-semibold text-blue-900">How it works:</h4>
          <ol className="space-y-1 text-xs text-blue-800">
            <li>1. Paste your Figma URL above</li>
            <li>2. Click "Process with Claude Code"</li>
            <li>3. Claude Code automatically invokes /html-renderer skill</li>
            <li>4. You'll receive a link to edit your design</li>
          </ol>
        </div>

      </div>
    </div>
  );
}
