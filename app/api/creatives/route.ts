import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { cache, CACHE_KEYS } from '../../lib/cache';

export async function GET() {
  try {
    // Try to get from cache first
    const cached = cache.get<unknown[]>(CACHE_KEYS.CREATIVES_LIST);
    if (cached) {
      return NextResponse.json(cached);
    }

    const creatives = await prisma.creative.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Store in cache
    cache.set(CACHE_KEYS.CREATIVES_LIST, creatives);

    return NextResponse.json(creatives);
  } catch (error) {
    console.error('Error fetching creatives:', error);

    // Try to return stale cache on error
    const staleCache = cache.getStale<unknown[]>(CACHE_KEYS.CREATIVES_LIST);
    if (staleCache) {
      console.log('Returning stale cache due to database error');
      return NextResponse.json(staleCache);
    }

    return NextResponse.json(
      { error: 'Failed to fetch creatives' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, bannerId, projectData, html, css } = body;

    if (!name || !bannerId || !projectData || !html || !css) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const creative = await prisma.creative.create({
      data: {
        name,
        bannerId,
        projectData,
        html,
        css,
      },
    });

    // Invalidate list cache
    cache.invalidate(CACHE_KEYS.CREATIVES_LIST);

    return NextResponse.json(creative);
  } catch (error) {
    console.error('Error creating creative:', error);
    return NextResponse.json(
      { error: 'Failed to create creative' },
      { status: 500 }
    );
  }
}
