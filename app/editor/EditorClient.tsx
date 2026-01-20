'use client';

import dynamic from 'next/dynamic';
import BannerEditor from '../components/BannerEditor';

interface EditorSettingsType {
  showTypographySection: boolean;
  showLayoutSection: boolean;
  showSizeSection: boolean;
  showSpaceSection: boolean;
  showPositionSection: boolean;
  showEffectsSection: boolean;
  showBackgroundSection: boolean;
  showBordersSection: boolean;
  id: string;
}

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
  initialSettings: EditorSettingsType;
}) {
  const editorType = searchParams.editorType || 'grapesjs';

  if (editorType === 'react-email-editor') {
    return <ReactEmailEditor />;
  }

  return <BannerEditor initialSettings={initialSettings} />;
}
