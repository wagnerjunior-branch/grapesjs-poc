import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(banners);
  } catch (error) {
    console.error('Error fetching banners:', error);
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
        css: css || '', // Allow empty string for react-email-editor which uses inline styles
        editorType: editorType || 'grapesjs',
      },
    });

    return NextResponse.json(banner);
  } catch (error) {
    console.error('Error creating banner:', error);
    return NextResponse.json(
      { error: 'Failed to create banner' },
      { status: 500 }
    );
  }
}
