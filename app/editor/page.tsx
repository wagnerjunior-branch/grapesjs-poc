import { Suspense } from 'react';
import BannerEditor from '../components/BannerEditor';
import { prisma } from '../../lib/prisma';

const DEFAULT_SETTINGS = {
  showLayerManager: true,
  showBlockManager: true,
  showStylesManager: true,
  showTraitsManager: true,
  showDeviceManager: true,
  showCommands: true,
  showUndoRedo: true,
  showFullscreen: true,
  showCodeView: true,
  showPreview: true,
  showCanvasToolbar: true,
  showTypographySection: true,
  showLayoutSection: true,
  showSizeSection: true,
  showSpaceSection: true,
  showPositionSection: true,
  showEffectsSection: true,
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

function EditorContent({ initialSettings }: { initialSettings: typeof DEFAULT_SETTINGS & { id: string } }) {
  return <BannerEditor initialSettings={initialSettings} />;
}

export default async function EditorPage() {
  const initialSettings = await getEditorSettings();

  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <EditorContent initialSettings={initialSettings} />
    </Suspense>
  );
}
