import { Suspense } from 'react';
import TemplateEditorClient from '@/app/components/TemplateEditorClient';
import { promises as fs } from 'fs';
import path from 'path';

interface PageProps {
  searchParams: Promise<{ demo?: string; html?: string }>;
}

/**
 * Template Editor Route (Server Component)
 *
 * Loads template data server-side and passes to client component.
 * Supports:
 * - ?demo=true - Load demo template from public folder
 * - ?html=<encoded> - Load HTML from URL parameter
 */
export default async function TemplateEditorPage({ searchParams }: PageProps) {
  const params = await searchParams;
  let initialHtml: string | undefined;
  let templateName = 'Untitled Template';

  // Load Figma banner demo
  if (params.demo === 'figma-banner') {
    try {
      const figmaBannerPath = path.join(
        process.cwd(),
        'html',
        'figma-banner-3556-11384.html'
      );
      const fileContent = await fs.readFile(figmaBannerPath, 'utf-8');

      // Extract just the body content
      const bodyMatch = fileContent.match(
        /<body[^>]*>([\s\S]*?)<\/body>/i
      );

      if (bodyMatch) {
        initialHtml = bodyMatch[1].trim();
        templateName = 'Figma Banner (3556:11384)';
      }
    } catch (error) {
      console.error('Failed to load Figma banner demo:', error);
    }
  }
  // Load FULL HTML document (including <head>, scripts, styles)
  else if (params.demo === 'full') {
    try {
      const bannerPath = path.join(
        process.cwd(),
        'public',
        'banner-standard-right.html'
      );
      let fileContent = await fs.readFile(bannerPath, 'utf-8');

      // Remove the demo info section from body
      fileContent = fileContent.replace(
        /<!-- Demo Info -->[\s\S]*?<\/div>\s*<\/body>/,
        '</body>'
      );

      initialHtml = fileContent.trim();
      templateName = 'Standard Banner (Full HTML)';
    } catch (error) {
      console.error('Failed to load full HTML template:', error);
    }
  }
  // Load original demo template (body content only)
  else if (params.demo === 'true') {
    try {
      const bannerPath = path.join(
        process.cwd(),
        'public',
        'banner-standard-right.html'
      );
      const fileContent = await fs.readFile(bannerPath, 'utf-8');

      // Extract just the body content (remove demo info section)
      const bodyMatch = fileContent.match(
        /<body[^>]*>([\s\S]*?)<\/body>/i
      );

      if (bodyMatch) {
        let bodyContent = bodyMatch[1];

        // Remove the demo info section
        bodyContent = bodyContent.replace(
          /<!-- Demo Info -->[\s\S]*?<\/div>/,
          ''
        );

        initialHtml = bodyContent.trim();
        templateName = 'Standard Banner Demo';
      }
    } catch (error) {
      console.error('Failed to load demo template:', error);
    }
  }

  // Load from URL parameter if provided (takes precedence)
  if (params.html) {
    try {
      initialHtml = decodeURIComponent(params.html);
      templateName = 'Custom Template';
    } catch (error) {
      console.error('Failed to decode HTML from URL:', error);
    }
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="text-lg text-gray-600">Loading editor...</div>
        </div>
      }
    >
      <TemplateEditorClient
        initialHtml={initialHtml}
        templateName={templateName}
      />
    </Suspense>
  );
}

/**
 * Metadata
 */
export const metadata = {
  title: 'Template Editor | Form-Based Editor',
  description: 'Edit HTML templates with a simple form interface',
};
