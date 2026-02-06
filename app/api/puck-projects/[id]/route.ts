import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { cache, CACHE_KEYS } from '../../../lib/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cached = cache.get<unknown>(CACHE_KEYS.PUCK_PROJECT_BY_ID(id));
    if (cached) {
      return NextResponse.json(cached);
    }

    const project = await prisma.puckProject.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    cache.set(CACHE_KEYS.PUCK_PROJECT_BY_ID(id), project);
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching puck project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
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
    const { name, html, puckData, variables } = body;

    const project = await prisma.puckProject.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(html !== undefined && { html }),
        ...(puckData !== undefined && { puckData }),
        ...(variables !== undefined && { variables }),
      },
    });

    cache.invalidate(CACHE_KEYS.PUCK_PROJECT_BY_ID(id));
    cache.invalidate(CACHE_KEYS.PUCK_PROJECTS_LIST);
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error updating puck project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
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
    await prisma.puckProject.delete({
      where: { id },
    });

    cache.invalidate(CACHE_KEYS.PUCK_PROJECT_BY_ID(id));
    cache.invalidate(CACHE_KEYS.PUCK_PROJECTS_LIST);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting puck project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
