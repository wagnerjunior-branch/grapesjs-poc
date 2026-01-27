import { Suspense } from 'react';
import EditorClient from './EditorClient';
import { prisma } from '../../lib/prisma';

const DEFAULT_SETTINGS = {
  showTypographySection: true,
  showLayoutSection: true,
  showSizeSection: true,
  showSpaceSection: true,
  showPositionSection: true,
  showEffectsSection: true,
  showBackgroundSection: true,
  showBordersSection: true,
};

async function getEditorSettings() {
  try {
    let settingsRecord = await prisma.editorSettings.findFirst({
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (!settingsRecord) {
      settingsRecord = await prisma.editorSettings.create({
        data: {
          settings: DEFAULT_SETTINGS,
        },
      });
    }

    const settings = settingsRecord.settings as typeof DEFAULT_SETTINGS;
    return {
      id: settingsRecord.id,
      ...DEFAULT_SETTINGS,
      ...settings,
    };
  } catch (error) {
    console.error('Error fetching editor settings:', error);
    return {
      id: '',
      ...DEFAULT_SETTINGS,
    };
  }
}

export default async function EditorPage() {
  const initialSettings = await getEditorSettings();

  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <EditorClient initialSettings={initialSettings} />
    </Suspense>
  );
}
