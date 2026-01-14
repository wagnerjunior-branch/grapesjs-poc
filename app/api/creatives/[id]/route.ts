import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const creative = await prisma.creative.findUnique({
      where: { id },
    });

    if (!creative) {
      return NextResponse.json(
        { error: 'Creative not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(creative);
  } catch (error) {
    console.error('Error fetching creative:', error);
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting creative:', error);
    return NextResponse.json(
      { error: 'Failed to delete creative' },
      { status: 500 }
    );
  }
}
