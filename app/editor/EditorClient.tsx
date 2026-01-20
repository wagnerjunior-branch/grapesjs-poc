'use client';

import dynamic from 'next/dynamic';
import BannerEditor from '../components/BannerEditor';

// Dynamic import with SSR disabled to prevent hydration mismatch
const ReactEmailEditor = dynamic(
  () => import('../components/ReactEmailEditor'),
  { ssr: false }
);

export default function EditorClient({
  searchParams,
  initialSettings,
}: {
  searchParams: { editorType?: string; id?: string };
  initialSettings: typeof initialSettings & { id: string };
}) {
  const editorType = searchParams.editorType || 'grapesjs';

  if (editorType === 'react-email-editor') {
    return <ReactEmailEditor />;
  }

  return <BannerEditor initialSettings={initialSettings} />;
}
