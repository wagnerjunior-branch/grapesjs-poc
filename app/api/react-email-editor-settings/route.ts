import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

const DEFAULT_SETTINGS = {
  displayMode: 'email',
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
          settings: {},
        },
      });
    }

    const settings = settingsRecord.settings as Record<string, unknown>;
    const reactEmailEditorSettings = (settings.reactEmailEditorSettings as typeof DEFAULT_SETTINGS) || DEFAULT_SETTINGS;

    return NextResponse.json({
      id: settingsRecord.id,
      ...DEFAULT_SETTINGS,
      ...reactEmailEditorSettings,
    });
  } catch (error) {
    console.error('Error fetching react email editor settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch react email editor settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, displayMode } = body;

    let settingsRecord = await prisma.editorSettings.findFirst({
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const currentSettings = settingsRecord?.settings as Record<string, unknown> || {};
    const updatedReactEmailEditorSettings = {
      displayMode: displayMode || DEFAULT_SETTINGS.displayMode,
    };

    const updatedSettings = {
      ...currentSettings,
      reactEmailEditorSettings: updatedReactEmailEditorSettings,
    };

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

    const settings = settingsRecord.settings as Record<string, unknown>;
    const reactEmailEditorSettings = (settings.reactEmailEditorSettings as typeof DEFAULT_SETTINGS) || DEFAULT_SETTINGS;

    return NextResponse.json({
      id: settingsRecord.id,
      ...DEFAULT_SETTINGS,
      ...reactEmailEditorSettings,
    });
  } catch (error) {
    console.error('Error saving react email editor settings:', error);
    return NextResponse.json(
      { error: 'Failed to save react email editor settings' },
      { status: 500 }
    );
  }
}
