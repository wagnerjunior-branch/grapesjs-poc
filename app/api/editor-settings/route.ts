import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { cache, CACHE_KEYS } from '../../lib/cache';

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
    // Try to get from cache first
    const cached = cache.get<unknown>(CACHE_KEYS.EDITOR_SETTINGS);
    if (cached) {
      return NextResponse.json(cached);
    }

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
    const result = {
      id: settingsRecord.id,
      ...DEFAULT_SETTINGS,
      ...settings,
    };

    // Store in cache
    cache.set(CACHE_KEYS.EDITOR_SETTINGS, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching editor settings:', error);

    // Try to return stale cache on error
    const staleCache = cache.getStale<unknown>(CACHE_KEYS.EDITOR_SETTINGS);
    if (staleCache) {
      console.log('Returning stale cache due to database error');
      return NextResponse.json(staleCache);
    }

    // Return default settings as fallback
    return NextResponse.json({
      id: 'default',
      ...DEFAULT_SETTINGS,
    });
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
    const result = {
      id: settingsRecord.id,
      ...DEFAULT_SETTINGS,
      ...settings,
    };

    // Invalidate cache
    cache.invalidate(CACHE_KEYS.EDITOR_SETTINGS);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error saving editor settings:', error);
    return NextResponse.json(
      { error: 'Failed to save editor settings' },
      { status: 500 }
    );
  }
}
