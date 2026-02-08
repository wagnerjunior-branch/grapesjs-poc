'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Puck, usePuck, type Data } from '@measured/puck';
import '@measured/puck/puck.css';
import { puckConfig } from '@/app/lib/puck-config';
import { htmlToPuckData, htmlToComponents, jsonToPuckData } from '@/app/lib/puck-components';
import { validateFigmaUrl } from '@/app/lib/figma-utils';
import {
  extractVariables,
  extractVariablesFromPuckData,
  resolveVariables,
  resolveVariablesInPuckData,
  type TemplateVariable,
} from '@/app/lib/puck-template';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PuckProject {
  id: string;
  name: string;
  figmaUrl?: string;
  html: string;
  puckData: Data;
  variables?: TemplateVariable[];
  createdAt?: string;
  updatedAt?: string;
}

interface SavedProjectSummary {
  id: string;
  name: string;
  figmaUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface PuckEditorClientProps {
  initialProject?: PuckProject | null;
}

type EditorState = 'import' | 'processing' | 'editing';
type ImportTab = 'figma' | 'html';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check whether puckData uses component-based format (has zones or non-HtmlBlock items). */
function isComponentBased(data: Data): boolean {
  if (data.zones && Object.keys(data.zones).length > 0) return true;
  return data.content.some((item) => item.type !== 'HtmlBlock');
}

// ---------------------------------------------------------------------------
// DispatchCapture — captures Puck's internal dispatch into a shared ref.
// Must be rendered inside Puck's component tree (e.g. via overrides).
// ---------------------------------------------------------------------------

function DispatchCapture({
  dispatchRef,
}: {
  dispatchRef: React.RefObject<((action: any) => void) | null>;
}) {
  const { dispatch } = usePuck();
  dispatchRef.current = dispatch;
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PuckEditorClient({
  initialProject,
}: PuckEditorClientProps) {
  // --- core workflow state ---
  const [state, setState] = useState<EditorState>(
    initialProject ? 'editing' : 'import',
  );

  // --- import form state ---
  const [figmaUrl, setFigmaUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [importTab, setImportTab] = useState<ImportTab>('figma');
  const [rawHtml, setRawHtml] = useState('');

  // --- project state ---
  const [projectId, setProjectId] = useState<string | null>(
    initialProject?.id ?? null,
  );
  const [projectName, setProjectName] = useState(
    initialProject?.name ?? 'Untitled Project',
  );
  const [puckData, setPuckData] = useState<Data>(
    (initialProject?.puckData as Data) ?? { content: [], root: { props: {} } },
  );
  const [html, setHtml] = useState(initialProject?.html ?? '');
  const [variables, setVariables] = useState<TemplateVariable[]>(
    initialProject?.variables ?? [],
  );
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {},
  );
  /** Keep the original (unresolved) puckData so variable changes can re-resolve. */
  const originalPuckDataRef = useRef<Data | null>(null);

  /** Puck's internal dispatch, captured by DispatchCapture inside overrides */
  const puckDispatchRef = useRef<((action: any) => void) | null>(null);

  /** Stable overrides — never recreated, so Puck won't remount the override component */
  const puckOverrides = useMemo(
    () => ({
      headerActions: ({ children }: { children: React.ReactNode }) => (
        <>
          <DispatchCapture dispatchRef={puckDispatchRef} />
          {children}
        </>
      ),
    }),
    [],
  );

  // --- saved projects list ---
  const [savedProjects, setSavedProjects] = useState<SavedProjectSummary[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

  // --- processing state ---
  const [processingMessage, setProcessingMessage] = useState('');

  // --- auto-save timer ---
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -------------------------------------------------------------------------
  // Fetch saved projects on mount
  // -------------------------------------------------------------------------

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch('/api/puck-projects');
        if (res.ok) {
          const data: SavedProjectSummary[] = await res.json();
          setSavedProjects(data);
        }
      } catch (err) {
        console.error('Failed to fetch saved projects:', err);
      }
    }
    fetchProjects();
  }, []);

  // -------------------------------------------------------------------------
  // Initialise variable values when variables change
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (variables.length === 0) return;
    setVariableValues((prev) => {
      const next: Record<string, string> = {};
      for (const v of variables) {
        next[v.name] = prev[v.name] ?? v.defaultValue ?? '';
      }
      return next;
    });
  }, [variables]);

  // -------------------------------------------------------------------------
  // Initialise from initialProject
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!initialProject) return;
    setProjectId(initialProject.id);
    setProjectName(initialProject.name);
    setPuckData(initialProject.puckData as Data);
    setHtml(initialProject.html);
    setVariables(initialProject.variables ?? []);
    originalPuckDataRef.current = initialProject.puckData as Data;
    setState('editing');
  }, [initialProject]);

  // -------------------------------------------------------------------------
  // Figma submit
  // -------------------------------------------------------------------------

  const handleFigmaSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setUrlError(null);

      const validation = validateFigmaUrl(figmaUrl);
      if (!validation.valid) {
        setUrlError(validation.error ?? 'Invalid Figma URL');
        return;
      }

      setState('processing');
      setProcessingMessage('Fetching design from Figma...');

      try {
        const res = await fetch('/api/figma-to-puck', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ figmaUrl }),
        });

        const result = await res.json();

        if (!result.success) {
          setUrlError(result.error ?? 'Failed to process Figma design');
          setState('import');
          return;
        }

        // If the API returned pre-built puckData, use it directly
        if (result.puckData) {
          const data = result.puckData as Data;
          const vars = extractVariablesFromPuckData(data);
          setVariables(vars);
          setHtml(result.html || '');
          await loadPuckDataIntoEditor(data, vars, result.html || '', figmaUrl);
        } else {
          // Fallback: server returned HTML only (backward compat)
          const vars = extractVariables(result.html);
          setVariables(vars);
          setHtml(result.html);
          await loadHtmlIntoEditor(result.html, vars, figmaUrl);
        }
      } catch (err) {
        console.error('Figma submit error:', err);
        setUrlError(
          err instanceof Error ? err.message : 'Failed to process design',
        );
        setState('import');
      }
    },
    [figmaUrl, projectName],
  );

  // -------------------------------------------------------------------------
  // HTML import
  // -------------------------------------------------------------------------

  const handleHtmlImport = useCallback(() => {
    if (!rawHtml.trim()) return;

    // Convert HTML to native Puck components
    const components = htmlToComponents(rawHtml);

    if (components.length > 0) {
      // Component-based path: fully editable in Puck
      const data = jsonToPuckData(components) as Data;
      const vars = extractVariablesFromPuckData(data);
      setVariables(vars);
      setHtml(rawHtml);
      loadPuckDataIntoEditor(data, vars, rawHtml);
    } else {
      // Fallback: wrap as HtmlBlock (e.g. empty or unparseable HTML)
      const vars = extractVariables(rawHtml);
      setVariables(vars);
      setHtml(rawHtml);
      loadHtmlIntoEditor(rawHtml, vars);
    }
  }, [rawHtml, projectName]);

  // -------------------------------------------------------------------------
  // File upload
  // -------------------------------------------------------------------------

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === 'string') {
          setRawHtml(text);
        }
      };
      reader.readAsText(file);
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Load pre-built Puck Data into editor (component-based path)
  // -------------------------------------------------------------------------

  const loadPuckDataIntoEditor = useCallback(
    async (
      data: Data,
      vars: TemplateVariable[],
      htmlContent: string,
      figUrl?: string,
    ) => {
      setState('processing');
      setProcessingMessage('Building editor...');

      originalPuckDataRef.current = data;
      setPuckData(data);

      setProcessingMessage('Saving project...');

      try {
        const res = await fetch('/api/puck-projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: projectName,
            figmaUrl: figUrl ?? undefined,
            html: htmlContent,
            puckData: data,
            variables: vars.length > 0 ? vars : undefined,
          }),
        });

        if (res.ok) {
          const project = await res.json();
          setProjectId(project.id);
          const listRes = await fetch('/api/puck-projects');
          if (listRes.ok) {
            setSavedProjects(await listRes.json());
          }
        }
      } catch (err) {
        console.error('Failed to save project:', err);
      }

      setState('editing');
    },
    [projectName],
  );

  // -------------------------------------------------------------------------
  // Load HTML into editor (HTML import path — backward compat)
  // -------------------------------------------------------------------------

  const loadHtmlIntoEditor = useCallback(
    async (
      htmlContent: string,
      vars: TemplateVariable[],
      figUrl?: string,
    ) => {
      setState('processing');
      setProcessingMessage('Building Puck data...');

      const data = htmlToPuckData(htmlContent) as Data;
      originalPuckDataRef.current = data;
      setPuckData(data);

      setProcessingMessage('Saving project...');

      try {
        const res = await fetch('/api/puck-projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: projectName,
            figmaUrl: figUrl ?? undefined,
            html: htmlContent,
            puckData: data,
            variables: vars.length > 0 ? vars : undefined,
          }),
        });

        if (res.ok) {
          const project = await res.json();
          setProjectId(project.id);
          // Refresh saved project list
          const listRes = await fetch('/api/puck-projects');
          if (listRes.ok) {
            setSavedProjects(await listRes.json());
          }
        }
      } catch (err) {
        console.error('Failed to save project:', err);
      }

      setState('editing');
    },
    [projectName],
  );

  // -------------------------------------------------------------------------
  // Load existing project
  // -------------------------------------------------------------------------

  const loadProject = useCallback(async (id: string) => {
    setState('processing');
    setProcessingMessage('Loading project...');

    try {
      const res = await fetch(`/api/puck-projects/${id}`);
      if (!res.ok) {
        setState('import');
        return;
      }

      const project: PuckProject = await res.json();
      setProjectId(project.id);
      setProjectName(project.name);
      setHtml(project.html);
      setPuckData(project.puckData as Data);
      originalPuckDataRef.current = project.puckData as Data;
      setVariables(project.variables ?? []);
      setState('editing');
    } catch (err) {
      console.error('Failed to load project:', err);
      setState('import');
    }
  }, []);

  // -------------------------------------------------------------------------
  // Delete selected projects
  // -------------------------------------------------------------------------

  const handleDeleteProjects = useCallback(async () => {
    if (selectedProjectIds.size === 0) return;

    const count = selectedProjectIds.size;
    const confirmed = window.confirm(
      `Delete ${count} project${count > 1 ? 's' : ''}? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      const res = await fetch('/api/puck-projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedProjectIds) }),
      });

      if (res.ok) {
        setSelectedProjectIds(new Set());
        const listRes = await fetch('/api/puck-projects');
        if (listRes.ok) {
          setSavedProjects(await listRes.json());
        }
      }
    } catch (err) {
      console.error('Failed to delete projects:', err);
    }
  }, [selectedProjectIds]);

  // -------------------------------------------------------------------------
  // Variable change
  // -------------------------------------------------------------------------

  const handleVariableChange = useCallback(
    (name: string, value: string) => {
      setVariableValues((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  // Sync variable values into Puck's internal store after render
  useEffect(() => {
    if (variables.length === 0) return;
    if (!puckDispatchRef.current) return;

    const original = originalPuckDataRef.current;
    if (original && isComponentBased(original)) {
      const resolved = resolveVariablesInPuckData(original, variableValues);
      puckDispatchRef.current({ type: 'setData', data: resolved });
    } else if (html) {
      const resolvedHtml = resolveVariables(html, variableValues);
      const newData = htmlToPuckData(resolvedHtml) as Data;
      puckDispatchRef.current({ type: 'setData', data: newData });
    }
  }, [variableValues, html, variables.length]);

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------

  const handleExport = useCallback(
    async (mode: 'clean' | 'template') => {
      let output: string;
      if (mode === 'template') {
        output = html;
      } else {
        output = resolveVariables(html, variableValues);
      }

      try {
        await navigator.clipboard.writeText(output);
        alert(
          mode === 'template'
            ? 'Template HTML (with {{variables}}) copied to clipboard!'
            : 'Clean HTML copied to clipboard!',
        );
      } catch {
        // Fallback: open in a new window
        const w = window.open('', '_blank');
        if (w) {
          w.document.write(
            `<pre style="white-space:pre-wrap">${output.replace(/</g, '&lt;')}</pre>`,
          );
        }
      }
    },
    [html, variableValues],
  );

  // -------------------------------------------------------------------------
  // Publish (save to DB)
  // -------------------------------------------------------------------------

  const handlePublish = useCallback(
    async (data: Data) => {
      if (!projectId) return;

      try {
        await fetch(`/api/puck-projects/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: projectName,
            puckData: data,
            variables: variables.length > 0 ? variables : undefined,
          }),
        });

        alert('Project saved!');
      } catch (err) {
        console.error('Failed to publish:', err);
        alert('Failed to save project.');
      }
    },
    [projectId, projectName, variables],
  );

  // -------------------------------------------------------------------------
  // Auto-save on Puck onChange (debounced 3s)
  // -------------------------------------------------------------------------

  const handlePuckChange = useCallback(
    (data: Data) => {
      setPuckData(data);

      if (!projectId) return;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/puck-projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ puckData: data }),
          });
        } catch (err) {
          console.error('Auto-save failed:', err);
        }
      }, 3000);
    },
    [projectId],
  );

  // -------------------------------------------------------------------------
  // Cancel processing
  // -------------------------------------------------------------------------

  const handleCancelProcessing = useCallback(() => {
    setState('import');
    setProcessingMessage('');
  }, []);

  // -------------------------------------------------------------------------
  // Back to import
  // -------------------------------------------------------------------------

  const handleBackToImport = useCallback(() => {
    setState('import');
  }, []);

  // =========================================================================
  // RENDER — Processing state
  // =========================================================================

  if (state === 'processing') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg
            className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-600"
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
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="mb-2 text-lg font-medium text-gray-700">
            {processingMessage || 'Processing...'}
          </p>
          <p className="mb-4 text-sm text-gray-500">
            This may take 20-30 seconds while the AI analyzes the design.
          </p>
          <button
            onClick={handleCancelProcessing}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER — Editing state
  // =========================================================================

  if (state === 'editing') {
    const hasVariables = variables.length > 0;

    return (
      <div className="flex h-screen flex-col">
        {/* Top toolbar */}
        <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2">
          <button
            onClick={handleBackToImport}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            &larr; Back
          </button>

          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="rounded border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />

          <div className="flex-1" />

          <button
            onClick={() => handleExport('clean')}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
          >
            Export Clean HTML
          </button>

          {hasVariables && (
            <button
              onClick={() => handleExport('template')}
              className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700"
            >
              Export Template
            </button>
          )}
        </div>

        {/* Main editing area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Variable sidebar */}
          {hasVariables && (
            <div className="w-64 shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-800">
                Template Variables
              </h3>
              <div className="space-y-3">
                {variables.map((v) => (
                  <div key={v.name}>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      {v.name}
                    </label>
                    <input
                      type="text"
                      value={variableValues[v.name] ?? ''}
                      onChange={(e) =>
                        handleVariableChange(v.name, e.target.value)
                      }
                      placeholder={v.defaultValue || v.name}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Puck editor */}
          <div className="flex-1">
            <Puck
              config={puckConfig}
              data={puckData}
              onChange={handlePuckChange}
              onPublish={handlePublish}
              overrides={puckOverrides}
              viewports={[
                { width: 375, height: 'auto', label: 'Mobile', icon: 'Smartphone' },
                { width: 768, height: 'auto', label: 'Tablet', icon: 'Tablet' },
                { width: 1280, height: 'auto', label: 'Desktop', icon: 'Monitor' },
              ]}
              ui={{
                viewports: {
                  current: { width: 375, height: 'auto' },
                  controlsVisible: true,
                  options: [],
                },
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER — Import state (default)
  // =========================================================================

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-lg">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Puck Editor
          </h1>
          <p className="text-gray-600">
            Import a design from Figma or paste HTML to start editing
          </p>
        </div>

        {/* Project name */}
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Project Name
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="My Project"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tab toggle */}
        <div className="mb-6 flex rounded-lg border border-gray-200">
          <button
            onClick={() => setImportTab('figma')}
            className={`flex-1 rounded-l-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              importTab === 'figma'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Figma URL
          </button>
          <button
            onClick={() => setImportTab('html')}
            className={`flex-1 rounded-r-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              importTab === 'html'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Import HTML
          </button>
        </div>

        {/* Figma tab */}
        {importTab === 'figma' && (
          <form onSubmit={handleFigmaSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Figma Design URL
              </label>
              <input
                type="url"
                value={figmaUrl}
                onChange={(e) => {
                  setFigmaUrl(e.target.value);
                  setUrlError(null);
                }}
                placeholder="https://www.figma.com/design/{file-id}/{file-name}?node-id={node-id}"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Select a frame or component in Figma, then copy the URL from
                your browser.
              </p>
            </div>

            {urlError && (
              <div className="rounded-lg bg-red-50 p-3">
                <p className="text-sm text-red-800">{urlError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!figmaUrl.trim()}
              className="w-full rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Import from Figma
            </button>
          </form>
        )}

        {/* HTML tab */}
        {importTab === 'html' && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Paste HTML
              </label>
              <textarea
                value={rawHtml}
                onChange={(e) => setRawHtml(e.target.value)}
                placeholder="<div>Your HTML here...</div>"
                rows={8}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 font-mono text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Or upload an HTML file
              </label>
              <input
                type="file"
                accept=".html,.htm"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <button
              onClick={handleHtmlImport}
              disabled={!rawHtml.trim()}
              className="w-full rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Load into Editor
            </button>
          </div>
        )}

        {/* Saved projects */}
        {savedProjects.length > 0 && (
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-gray-800">
                  Saved Projects
                </h2>
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={
                      savedProjects.length > 0 &&
                      selectedProjectIds.size === savedProjects.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProjectIds(
                          new Set(savedProjects.map((p) => p.id)),
                        );
                      } else {
                        setSelectedProjectIds(new Set());
                      }
                    }}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Select all
                </label>
              </div>
              {selectedProjectIds.size > 0 && (
                <button
                  onClick={handleDeleteProjects}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                >
                  Delete ({selectedProjectIds.size})
                </button>
              )}
            </div>
            <div className="space-y-2">
              {savedProjects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedProjectIds.has(p.id)}
                    onChange={(e) => {
                      setSelectedProjectIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) {
                          next.add(p.id);
                        } else {
                          next.delete(p.id);
                        }
                        return next;
                      });
                    }}
                    className="h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => loadProject(p.id)}
                    className="flex flex-1 items-center justify-between text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {p.name}
                      </p>
                      {p.figmaUrl && (
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {p.figmaUrl}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(p.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
