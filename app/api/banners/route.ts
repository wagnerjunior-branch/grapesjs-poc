import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { cache, CACHE_KEYS } from '../../lib/cache';

export async function GET() {
  try {
    // Try to get from cache first
    const cached = cache.get<unknown[]>(CACHE_KEYS.BANNERS_LIST);
    if (cached) {
      return NextResponse.json(cached);
    }

    const banners = await prisma.banner.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Store in cache
    cache.set(CACHE_KEYS.BANNERS_LIST, banners);

    return NextResponse.json(banners);
  } catch (error) {
    console.error('Error fetching banners:', error);

    // Try to return stale cache on error
    const staleCache = cache.getStale<unknown[]>(CACHE_KEYS.BANNERS_LIST);
    if (staleCache) {
      console.log('Returning stale cache due to database error');
      return NextResponse.json(staleCache);
    }

    return NextResponse.json(
      { error: 'Failed to fetch banners' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, projectData, html, css, editorType } = body;

    if (!name || !projectData || !html || css === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const banner = await prisma.banner.create({
      data: {
        name,
        projectData,
        html,
        css: css || '',
        editorType: editorType || 'grapesjs',
      },
    });

    // Invalidate list cache
    cache.invalidate(CACHE_KEYS.BANNERS_LIST);

    return NextResponse.json(banner);
  } catch (error) {
    console.error('Error creating banner:', error);
    return NextResponse.json(
      { error: 'Failed to create banner' },
      { status: 500 }
    );
  }
}
