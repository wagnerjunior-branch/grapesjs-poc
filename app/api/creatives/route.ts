import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const creatives = await prisma.creative.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(creatives);
  } catch (error) {
    console.error('Error fetching creatives:', error);
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

    return NextResponse.json(creative);
  } catch (error) {
    console.error('Error creating creative:', error);
    return NextResponse.json(
      { error: 'Failed to create creative' },
      { status: 500 }
    );
  }
}
