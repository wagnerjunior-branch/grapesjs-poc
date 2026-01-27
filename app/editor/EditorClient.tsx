'use client';

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

export default function EditorClient({
  initialSettings,
}: {
  initialSettings: EditorSettingsType;
}) {
  return <BannerEditor initialSettings={initialSettings} />;
}
