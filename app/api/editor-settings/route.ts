import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

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
      showTypographySection,
      showLayoutSection,
      showSizeSection,
      showSpaceSection,
      showPositionSection,
      showEffectsSection,
      showBackgroundSection,
      showBordersSection,
    } = body;

    const updatedSettings = {
      showTypographySection: showTypographySection ?? DEFAULT_SETTINGS.showTypographySection,
      showLayoutSection: showLayoutSection ?? DEFAULT_SETTINGS.showLayoutSection,
      showSizeSection: showSizeSection ?? DEFAULT_SETTINGS.showSizeSection,
      showSpaceSection: showSpaceSection ?? DEFAULT_SETTINGS.showSpaceSection,
      showPositionSection: showPositionSection ?? DEFAULT_SETTINGS.showPositionSection,
      showEffectsSection: showEffectsSection ?? DEFAULT_SETTINGS.showEffectsSection,
      showBackgroundSection: showBackgroundSection ?? DEFAULT_SETTINGS.showBackgroundSection,
      showBordersSection: showBordersSection ?? DEFAULT_SETTINGS.showBordersSection,
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
