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
    const cached = cache.get<unknown>(CACHE_KEYS.CREATIVE_BY_ID(id));
    if (cached) {
      return NextResponse.json(cached);
    }

    const creative = await prisma.creative.findUnique({
      where: { id },
    });

    if (!creative) {
      return NextResponse.json(
        { error: 'Creative not found' },
        { status: 404 }
      );
    }

    // Store in cache
    cache.set(CACHE_KEYS.CREATIVE_BY_ID(id), creative);

    return NextResponse.json(creative);
  } catch (error) {
    console.error('Error fetching creative:', error);

    const { id } = await params;
    // Try to return stale cache on error
    const staleCache = cache.getStale<unknown>(CACHE_KEYS.CREATIVE_BY_ID(id));
    if (staleCache) {
      console.log('Returning stale cache due to database error');
      return NextResponse.json(staleCache);
    }

    return NextResponse.json(
      { error: 'Failed to fetch creative' },
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
    const { name, projectData, html, css } = body;

    if (!name || !projectData || !html || !css) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const creative = await prisma.creative.update({
      where: { id },
      data: {
        name,
        projectData,
        html,
        css,
      },
    });

    // Invalidate caches
    cache.invalidate(CACHE_KEYS.CREATIVE_BY_ID(id));
    cache.invalidate(CACHE_KEYS.CREATIVES_LIST);

    return NextResponse.json(creative);
  } catch (error) {
    console.error('Error updating creative:', error);
    return NextResponse.json(
      { error: 'Failed to update creative' },
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
    await prisma.creative.delete({
      where: { id },
    });

    // Invalidate caches
    cache.invalidate(CACHE_KEYS.CREATIVE_BY_ID(id));
    cache.invalidate(CACHE_KEYS.CREATIVES_LIST);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting creative:', error);
    return NextResponse.json(
      { error: 'Failed to delete creative' },
      { status: 500 }
    );
  }
}
