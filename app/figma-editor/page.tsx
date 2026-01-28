import FigmaProcessor from '@/app/components/FigmaProcessor';

/**
 * Figma Editor Route
 *
 * Simple workflow: User pastes Figma URL and clicks ONE button.
 * Claude Code automatically detects and processes the request.
 */
export default function FigmaEditorPage() {
  return <FigmaProcessor />;
}

/**
 * Metadata
 */
export const metadata = {
  title: 'Figma to Form Editor | Automated Processing',
  description: 'Paste Figma URL, click Process - Claude Code handles the rest',
};
