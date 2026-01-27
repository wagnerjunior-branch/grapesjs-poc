import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { cache, CACHE_KEYS } from '../../../lib/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Try to get from cache first
    const cached = cache.get<unknown>(CACHE_KEYS.BANNER_BY_ID(id));
    if (cached) {
      return NextResponse.json(cached);
    }

    const banner = await prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      return NextResponse.json(
        { error: 'Banner not found' },
        { status: 404 }
      );
    }

    // Store in cache
    cache.set(CACHE_KEYS.BANNER_BY_ID(id), banner);

    return NextResponse.json(banner);
  } catch (error) {
    console.error('Error fetching banner:', error);

    const { id } = await params;
    // Try to return stale cache on error
    const staleCache = cache.getStale<unknown>(CACHE_KEYS.BANNER_BY_ID(id));
    if (staleCache) {
      console.log('Returning stale cache due to database error');
      return NextResponse.json(staleCache);
    }

    return NextResponse.json(
      { error: 'Failed to fetch banner' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, projectData, html, css, editorType } = body;

    if (!name || !projectData || !html || css === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const banner = await prisma.banner.update({
      where: { id },
      data: {
        name,
        projectData,
        html,
        css: css || '',
        editorType: editorType || 'grapesjs',
      },
    });

    // Invalidate caches
    cache.invalidate(CACHE_KEYS.BANNER_BY_ID(id));
    cache.invalidate(CACHE_KEYS.BANNERS_LIST);

    return NextResponse.json(banner);
  } catch (error) {
    console.error('Error updating banner:', error);
    return NextResponse.json(
      { error: 'Failed to update banner' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.banner.delete({
      where: { id },
    });

    // Invalidate caches
    cache.invalidate(CACHE_KEYS.BANNER_BY_ID(id));
    cache.invalidate(CACHE_KEYS.BANNERS_LIST);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting banner:', error);
    return NextResponse.json(
      { error: 'Failed to delete banner' },
      { status: 500 }
    );
  }
}
