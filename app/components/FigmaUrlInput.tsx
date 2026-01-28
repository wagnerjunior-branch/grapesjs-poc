'use client';

import { useState, useCallback } from 'react';
import { validateFigmaUrl } from '@/app/lib/figma-utils';
import { processFigmaUrl } from '@/app/lib/figma-actions';

interface FigmaUrlInputProps {
  onHtmlGenerated: (html: string, fileKey: string, nodeId: string) => void;
  onError: (error: string) => void;
}

/**
 * FigmaUrlInput Component
 *
 * Stage 1 of the template editor flow.
 * Accepts a Figma design URL and triggers HTML generation.
 */
export default function FigmaUrlInput({ onHtmlGenerated, onError }: FigmaUrlInputProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<{
    fileKey: string;
    nodeId: string;
  } | null>(null);

  // Handle URL input change
  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    setError(null);
  }, []);

  // Validate and process URL
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate URL format
      const validation = validateFigmaUrl(url);
      if (!validation.valid) {
        setError(validation.error || 'Invalid Figma URL');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Parse Figma URL on server
        const result = await processFigmaUrl(url);

        if (!result.success) {
          setError(result.error || 'Failed to process Figma URL');
          setLoading(false);
          onError(result.error || 'Failed to process Figma URL');
          return;
        }

        // Store parsed data for display
        if (result.fileKey && result.nodeId) {
          setParsedData({
            fileKey: result.fileKey,
            nodeId: result.nodeId,
          });

          // Call the process API to trigger Claude's skill invocation
          try {
            const processResponse = await fetch('/api/figma-process', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url }),
            });

            const processData = await processResponse.json();

            if (processData.success && processData.message === 'CLAUDE_PROCESS_REQUEST') {
              // Show the trigger message that Claude will detect
              setError(
                `AUTO_PROCESS: ${processData.instruction}`
              );

              // Keep loading state - Claude will process this
              // Don't set loading to false yet
              return;
            }
          } catch (processErr) {
            console.warn('Could not create process request:', processErr);
          }

          // Fallback: Show manual instructions
          setError(
            'NEEDS_CLAUDE: URL parsed successfully. Please ask Claude Code to process this design.'
          );
        }

        setLoading(false);
      } catch (err) {
        console.error('Error processing Figma URL:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to process URL';
        setError(errorMessage);
        setLoading(false);
        onError(errorMessage);
      }
    },
    [url, onHtmlGenerated, onError]
  );

  // Handle paste event (auto-trim and validate)
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    setUrl(pastedText.trim());
    setError(null);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Figma to Form Editor
          </h1>
          <p className="text-gray-600">
            Paste a Figma design URL to generate an editable template
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* URL Input */}
          <div>
            <label
              htmlFor="figma-url"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Figma Design URL
            </label>
            <input
              id="figma-url"
              type="url"
              value={url}
              onChange={handleUrlChange}
              onPaste={handlePaste}
              placeholder="https://www.figma.com/design/{file-id}/{file-name}?node-id={node-id}&m=dev"
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
            />
            <p className="mt-2 text-xs text-gray-500">
              Tip: Open your design in Figma, select a frame or component, then copy the
              URL from your browser.
            </p>
          </div>

          {/* Error Message */}
          {error && !error.startsWith('READY_FOR_PROCESSING') && (
            <div className="rounded-lg bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Auto-Processing State */}
          {error && error.startsWith('AUTO_PROCESS:') && parsedData && (
            <div className="rounded-lg bg-green-50 border-2 border-green-300 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 animate-spin text-green-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-semibold text-green-900">
                    🤖 Auto-Processing with Claude Code...
                  </p>
                  <p className="mt-1 text-xs text-green-800">
                    File: <code className="bg-green-100 px-1 rounded">{parsedData.fileKey}</code> |
                    Node: <code className="bg-green-100 px-1 rounded">{parsedData.nodeId}</code>
                  </p>
                  <div className="mt-3 rounded bg-green-100 p-3 border border-green-200">
                    <p className="text-xs font-medium text-green-900 mb-1">
                      ⚡ Processing Steps:
                    </p>
                    <ol className="text-xs text-green-800 space-y-1 list-decimal list-inside">
                      <li>Calling Figma MCP get_design_context</li>
                      <li>Converting React to responsive HTML</li>
                      <li>Saving to html/ directory</li>
                      <li>Loading form editor automatically</li>
                    </ol>
                  </div>
                  <p className="mt-3 text-xs text-green-700">
                    💡 Claude Code is invoking the /html-renderer skill. This usually takes 10-30 seconds.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Manual Claude Processing */}
          {error && error.startsWith('NEEDS_CLAUDE') && parsedData && (
            <div className="rounded-lg bg-purple-50 border-2 border-purple-300 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-purple-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-semibold text-purple-900">
                    ✅ URL Validated Successfully
                  </p>
                  <p className="mt-1 text-xs text-purple-800">
                    File: <code className="bg-purple-100 px-1 rounded">{parsedData.fileKey}</code> |
                    Node: <code className="bg-purple-100 px-1 rounded">{parsedData.nodeId}</code>
                  </p>

                  <div className="mt-3 rounded bg-purple-100 p-3 border border-purple-200">
                    <p className="text-xs font-semibold text-purple-900 mb-2">
                      📋 Next Step: Request Processing
                    </p>
                    <p className="text-xs text-purple-800 mb-2">
                      Copy and paste this message in the chat:
                    </p>
                    <div className="bg-white rounded p-2 border border-purple-200">
                      <code className="text-xs text-purple-900 break-all">
                        Please process this Figma design and load it in the form editor: {url}
                      </code>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            `Please process this Figma design and load it in the form editor: ${url}`
                          );
                          alert('✅ Message copied to clipboard! Paste it in the chat.');
                        } catch (err) {
                          alert('Could not copy. Please copy manually from above.');
                        }
                      }}
                      className="mt-2 w-full rounded bg-purple-600 px-3 py-2 text-xs font-medium text-white hover:bg-purple-700"
                    >
                      📋 Copy Message to Clipboard
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-purple-700">
                    💡 I (Claude Code) will then call the Figma MCP, convert the design to HTML,
                    and load it in the form editor for you.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !url}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="mr-2 h-5 w-5 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Generate Template'
            )}
          </button>
        </form>

        {/* Quick Actions */}
        <div className="mt-8 space-y-4">
          {/* Load Demo Button */}
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-blue-900">
              Try the Demo Banner
            </h3>
            <p className="mb-3 text-xs text-blue-700">
              Load a pre-generated banner from Figma to test the editor immediately
            </p>
            <button
              onClick={() => {
                // Load the demo HTML file
                window.location.href = '/template-editor?demo=figma-banner';
              }}
              className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Load Demo Banner →
            </button>
          </div>

          {/* Example URL Format */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-2 text-sm font-medium text-gray-700">Example URL Format:</h3>
            <code className="block break-all text-xs text-gray-600">
              https://www.figma.com/design/abc123/MyDesign?node-id=1-234&m=dev
            </code>
            <p className="mt-2 text-xs text-gray-500">
              Make sure to include the <code className="rounded bg-gray-200 px-1">
                node-id
              </code>{' '}
              parameter
            </p>
          </div>

          {/* Instructions */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-amber-900">
              💡 How This Works
            </h3>
            <ol className="text-xs text-amber-800 space-y-2 list-decimal list-inside">
              <li>Paste your Figma URL above and click "Generate Template"</li>
              <li>A message will appear with instructions</li>
              <li>Copy and paste that message in the chat</li>
              <li>I (Claude Code) will process the design using Figma MCP</li>
              <li>The form editor loads automatically with your design</li>
            </ol>
            <p className="mt-2 text-xs font-medium text-amber-900">
              ⚡ Or click "Load Demo Banner" above to try it instantly!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
