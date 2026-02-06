import { Suspense } from 'react';
import PuckEditorClient from '@/app/components/PuckEditorClient';
import { prisma } from '../../lib/prisma';

interface PageProps {
  searchParams: Promise<{ id?: string }>;
}

async function getPuckProject(id: string) {
  try {
    const project = await prisma.puckProject.findUnique({
      where: { id },
    });
    return project;
  } catch (error) {
    console.error('Error fetching puck project:', error);
    return null;
  }
}

export default async function PuckEditorPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialProject = params.id ? await getPuckProject(params.id) : null;

  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="text-lg text-gray-600">Loading editor...</div>
        </div>
      }
    >
      <PuckEditorClient
        initialProject={
          initialProject
            ? {
                id: initialProject.id,
                name: initialProject.name,
                figmaUrl: initialProject.figmaUrl || undefined,
                html: initialProject.html,
                puckData: initialProject.puckData as any,
                variables: initialProject.variables as any,
              }
            : null
        }
      />
    </Suspense>
  );
}

export const metadata = {
  title: 'Puck Editor | Visual Editor',
  description: 'Edit Figma designs with the Puck visual editor',
};
