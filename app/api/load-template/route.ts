import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const template = searchParams.get('template');

    if (!template) {
      return NextResponse.json(
        { error: 'Template parameter is required' },
        { status: 400 }
      );
    }

    let filePath: string;
    
    if (template === 'banner-standard-right') {
      filePath = path.join(process.cwd(), 'public', 'banner-standard-right.html');
    } else {
      return NextResponse.json(
        { error: 'Unknown template' },
        { status: 404 }
      );
    }

    const fileContent = await fs.readFile(filePath, 'utf-8');

    const bodyMatch = fileContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const headMatch = fileContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i);

    if (!bodyMatch) {
      return NextResponse.json(
        { error: 'Invalid HTML structure' },
        { status: 400 }
      );
    }

    let bodyContent = bodyMatch[1];
    bodyContent = bodyContent.replace(/<!-- Demo Info -->[\s\S]*?<\/div>\s*$/, '').trim();

    let headContent = '';
    if (headMatch) {
      headContent = headMatch[1];
    }

    const projectData = {
      pages: [
        {
          name: 'Banner Template',
          head: headContent,
          component: bodyContent,
        },
      ],
    };

    return NextResponse.json({
      success: true,
      projectData,
      html: bodyContent,
      templateName: 'Standard Banner - Right Layout',
    });
  } catch (error) {
    console.error('Error loading template:', error);
    return NextResponse.json(
      { error: 'Failed to load template' },
      { status: 500 }
    );
  }
}
