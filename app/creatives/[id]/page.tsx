import { Suspense } from 'react';
import CreativeEditor from '../../components/CreativeEditor';

function CreativeEditorContent() {
  return <CreativeEditor />;
}

export default function CreativePage() {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <CreativeEditorContent />
    </Suspense>
  );
}
