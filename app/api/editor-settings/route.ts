import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

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

export async function GET() {
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
    return NextResponse.json({
      id: settingsRecord.id,
      ...DEFAULT_SETTINGS,
      ...settings,
    });
  } catch (error) {
    console.error('Error fetching editor settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch editor settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      id,
      showLayerManager,
      showBlockManager,
      showStylesManager,
      showTraitsManager,
      showDeviceManager,
      showCommands,
      showUndoRedo,
      showFullscreen,
      showCodeView,
      showPreview,
      showCanvasToolbar,
      showTypographySection,
      showLayoutSection,
      showSizeSection,
      showSpaceSection,
      showPositionSection,
      showEffectsSection,
    } = body;

    const updatedSettings = {
      showLayerManager: showLayerManager ?? DEFAULT_SETTINGS.showLayerManager,
      showBlockManager: showBlockManager ?? DEFAULT_SETTINGS.showBlockManager,
      showStylesManager: showStylesManager ?? DEFAULT_SETTINGS.showStylesManager,
      showTraitsManager: showTraitsManager ?? DEFAULT_SETTINGS.showTraitsManager,
      showDeviceManager: showDeviceManager ?? DEFAULT_SETTINGS.showDeviceManager,
      showCommands: showCommands ?? DEFAULT_SETTINGS.showCommands,
      showUndoRedo: showUndoRedo ?? DEFAULT_SETTINGS.showUndoRedo,
      showFullscreen: showFullscreen ?? DEFAULT_SETTINGS.showFullscreen,
      showCodeView: showCodeView ?? DEFAULT_SETTINGS.showCodeView,
      showPreview: showPreview ?? DEFAULT_SETTINGS.showPreview,
      showCanvasToolbar: showCanvasToolbar ?? DEFAULT_SETTINGS.showCanvasToolbar,
      showTypographySection: showTypographySection ?? DEFAULT_SETTINGS.showTypographySection,
      showLayoutSection: showLayoutSection ?? DEFAULT_SETTINGS.showLayoutSection,
      showSizeSection: showSizeSection ?? DEFAULT_SETTINGS.showSizeSection,
      showSpaceSection: showSpaceSection ?? DEFAULT_SETTINGS.showSpaceSection,
      showPositionSection: showPositionSection ?? DEFAULT_SETTINGS.showPositionSection,
      showEffectsSection: showEffectsSection ?? DEFAULT_SETTINGS.showEffectsSection,
    };

    let settingsRecord = await prisma.editorSettings.findFirst({
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (settingsRecord && (!id || settingsRecord.id === id)) {
      settingsRecord = await prisma.editorSettings.update({
        where: { id: settingsRecord.id },
        data: {
          settings: updatedSettings,
        },
      });
    } else {
      settingsRecord = await prisma.editorSettings.create({
        data: {
          settings: updatedSettings,
        },
      });
    }

    const settings = settingsRecord.settings as typeof DEFAULT_SETTINGS;
    return NextResponse.json({
      id: settingsRecord.id,
      ...DEFAULT_SETTINGS,
      ...settings,
    });
  } catch (error) {
    console.error('Error saving editor settings:', error);
    return NextResponse.json(
      { error: 'Failed to save editor settings' },
      { status: 500 }
    );
  }
}
