import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { cache, CACHE_KEYS } from '../../lib/cache';

export async function GET() {
  try {
    const cached = cache.get<unknown[]>(CACHE_KEYS.PUCK_PROJECTS_LIST);
    if (cached) {
      return NextResponse.json(cached);
    }

    const projects = await prisma.puckProject.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        figmaUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    cache.set(CACHE_KEYS.PUCK_PROJECTS_LIST, projects);
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching puck projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: ids (string[])' },
        { status: 400 }
      );
    }

    const result = await prisma.puckProject.deleteMany({
      where: { id: { in: ids } },
    });

    // Invalidate caches
    for (const id of ids) {
      cache.invalidate(CACHE_KEYS.PUCK_PROJECT_BY_ID(id));
    }
    cache.invalidate(CACHE_KEYS.PUCK_PROJECTS_LIST);

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Error deleting puck projects:', error);
    return NextResponse.json(
      { error: 'Failed to delete projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, figmaUrl, html, puckData, variables } = body;

    if (!name || !html || !puckData) {
      return NextResponse.json(
        { error: 'Missing required fields: name, html, puckData' },
        { status: 400 }
      );
    }

    const project = await prisma.puckProject.create({
      data: {
        name,
        figmaUrl: figmaUrl || null,
        html,
        puckData,
        variables: variables || null,
      },
    });

    cache.invalidate(CACHE_KEYS.PUCK_PROJECTS_LIST);
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error creating puck project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
