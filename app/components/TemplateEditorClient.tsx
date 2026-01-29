'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FigmaUrlInput from './FigmaUrlInput';
import TemplateFormEditor from './TemplateFormEditor';
import TemplatePreview from './TemplatePreview';
import {
  parseHtmlForEditableElements,
  applyChangesToHtml,
  cleanHtmlForExport,
} from '@/app/lib/html-parser';
import { generateFormSchema } from '@/app/lib/template-editor';
import type { FormSchema } from '@/app/lib/template-editor';

interface TemplateEditorClientProps {
  initialHtml?: string;
  templateName?: string;
  showFigmaInput?: boolean; // If true, show Figma URL input first
}

/**
 * TemplateEditorClient Component
 *
 * Main editor with split-pane interface:
 * - Left: Dynamic form generated from HTML
 * - Right: Live preview with updates onBlur
 */
export default function TemplateEditorClient({
  initialHtml,
  templateName = 'Untitled Template',
  showFigmaInput = false,
}: TemplateEditorClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [stage, setStage] = useState<'figma-input' | 'editor'>(
    initialHtml ? 'editor' : showFigmaInput ? 'figma-input' : 'editor'
  );
  const [originalHtml, setOriginalHtml] = useState<string>(initialHtml || '');
  const [annotatedHtml, setAnnotatedHtml] = useState<string>('');
  const [currentHtml, setCurrentHtml] = useState<string>('');
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [name, setName] = useState(templateName);
  const [showExportModal, setShowExportModal] = useState(false);
  const [figmaFileKey, setFigmaFileKey] = useState<string>('');
  const [figmaNodeId, setFigmaNodeId] = useState<string>('');
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Parse HTML and generate schema on mount or when HTML changes
  useEffect(() => {
    if (originalHtml) {
      setIsProcessing(true);

      try {
        console.log('=== DEBUGGING HTML FLOW ===');
        console.log('Original HTML length:', originalHtml.length);
        console.log('Original HTML starts with:', originalHtml.substring(0, 200));

        // Parse HTML to detect editable elements
        const result = parseHtmlForEditableElements(originalHtml);

        console.log('Annotated HTML length:', result.annotatedHtml.length);
        console.log('Annotated HTML starts with:', result.annotatedHtml.substring(0, 200));
        console.log('Number of editable elements found:', result.elements.length);

        setAnnotatedHtml(result.annotatedHtml);
        setCurrentHtml(result.annotatedHtml);

        // Generate form schema
        const formSchema = generateFormSchema(result.elements, result.groups);
        setSchema(formSchema);

        // Initialize field values from detected elements
        const initialValues: Record<string, string> = {};
        result.elements.forEach((element) => {
          initialValues[element.id] = element.value;
        });
        setFieldValues(initialValues);
      } catch (error) {
        console.error('Error parsing HTML:', error);
        alert('Failed to parse HTML template. Please check the HTML format.');
      } finally {
        setIsProcessing(false);
      }
    }
  }, [originalHtml]);

  // Handle Figma HTML generation
  const handleHtmlGenerated = useCallback(
    (html: string, fileKey: string, nodeId: string) => {
      setOriginalHtml(html);
      setFigmaFileKey(fileKey);
      setFigmaNodeId(nodeId);
      setName(`Figma Design ${nodeId}`);
      setStage('editor');
    },
    []
  );

  // Handle Figma error
  const handleFigmaError = useCallback((error: string) => {
    console.error('Figma error:', error);
    // Error is already displayed in FigmaUrlInput component
  }, []);

  // Handle form field changes
  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setFieldValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));

    // Update HTML immediately (for onBlur updates to work)
    setCurrentHtml((prevHtml) => {
      const changes = { [fieldId]: value };
      return applyChangesToHtml(prevHtml, changes);
    });
  }, []);

  // Handle HTML import
  const handleImportHtml = useCallback(() => {
    const input = prompt('Paste your HTML code:');
    if (input) {
      setOriginalHtml(input);
    }
  }, []);

  // Handle export
  const handleExport = useCallback((includeAnnotations: boolean) => {
    const htmlToExport = includeAnnotations
      ? currentHtml
      : cleanHtmlForExport(currentHtml);

    // Create download
    const blob = new Blob([htmlToExport], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);

    setShowExportModal(false);
  }, [currentHtml, name]);

  // Handle copy to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cleanHtmlForExport(currentHtml));
      alert('HTML copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy HTML to clipboard.');
    }
  }, [currentHtml]);

  // Load template from query params
  useEffect(() => {
    const htmlParam = searchParams.get('html');
    if (htmlParam) {
      try {
        const decoded = decodeURIComponent(htmlParam);
        setOriginalHtml(decoded);
      } catch (error) {
        console.error('Failed to decode HTML from URL:', error);
      }
    }
  }, [searchParams]);

  // Loading state
  if (isProcessing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-lg font-medium text-gray-900">
            Processing template...
          </div>
          <div className="text-sm text-gray-500">
            Analyzing HTML and generating form
          </div>
        </div>
      </div>
    );
  }

  // Stage 1: Figma URL Input
  if (stage === 'figma-input' && !originalHtml) {
    return (
      <FigmaUrlInput
        onHtmlGenerated={handleHtmlGenerated}
        onError={handleFigmaError}
      />
    );
  }

  // Empty state (when not using Figma input)
  if (!originalHtml && stage !== 'figma-input') {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md text-center">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            No Template Loaded
          </h2>
          <p className="mb-6 text-sm text-gray-600">
            Import an HTML template to start editing its content with a simple form
            interface.
          </p>
          <button
            onClick={handleImportHtml}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Import HTML Template
          </button>
          <div className="mt-4">
            <button
              onClick={() => router.push('/template-editor?demo=true')}
              className="text-sm text-blue-600 hover:underline"
            >
              Or load demo template
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-b border-transparent text-xl font-semibold text-gray-900 hover:border-gray-300 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500">Form-Based Template Editor</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className="rounded border border-yellow-400 bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-100"
          >
            {showDebugPanel ? 'Hide' : 'Debug'}
          </button>
          <button
            onClick={handleImportHtml}
            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Import HTML
          </button>
          <button
            onClick={handleCopyToClipboard}
            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Copy HTML
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Export
          </button>
        </div>
      </div>

      {/* Debug Panel */}
      {showDebugPanel && (
        <div className="border-b bg-yellow-50 p-4">
          <div className="mx-auto max-w-7xl">
            <h3 className="mb-2 text-sm font-semibold text-yellow-900">Debug Info</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-medium text-yellow-800">Original HTML Length:</p>
                <p className="text-yellow-700">{originalHtml.length} characters</p>
              </div>
              <div>
                <p className="font-medium text-yellow-800">Current HTML Length:</p>
                <p className="text-yellow-700">{currentHtml.length} characters</p>
              </div>
              <div className="col-span-2">
                <p className="font-medium text-yellow-800">Current HTML Preview (first 500 chars):</p>
                <pre className="mt-1 overflow-x-auto rounded bg-yellow-100 p-2 text-yellow-900">
                  {currentHtml.substring(0, 500)}
                </pre>
              </div>
              <div className="col-span-2">
                <button
                  onClick={() => {
                    const blob = new Blob([currentHtml], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'debug-current.html';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="rounded bg-yellow-600 px-3 py-1 text-white hover:bg-yellow-700"
                >
                  Download Current HTML for Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Split Pane Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane - Form Editor */}
        <div className="w-1/3 min-w-[320px] border-r">
          {schema && (
            <TemplateFormEditor
              schema={schema}
              values={fieldValues}
              onChange={handleFieldChange}
            />
          )}
        </div>

        {/* Right Pane - Preview */}
        <div className="flex-1">
          <TemplatePreview html={currentHtml} title={name} />
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Export Template
            </h3>
            <p className="mb-6 text-sm text-gray-600">
              Choose how you want to export your template:
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleExport(false)}
                className="w-full rounded border border-gray-300 bg-white px-4 py-3 text-left hover:bg-gray-50"
              >
                <div className="font-medium text-gray-900">Clean HTML</div>
                <div className="text-sm text-gray-500">
                  Export without data-editable-id attributes (production-ready)
                </div>
              </button>

              <button
                onClick={() => handleExport(true)}
                className="w-full rounded border border-gray-300 bg-white px-4 py-3 text-left hover:bg-gray-50"
              >
                <div className="font-medium text-gray-900">
                  HTML with Annotations
                </div>
                <div className="text-sm text-gray-500">
                  Export with data-editable-id attributes (for re-editing)
                </div>
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
