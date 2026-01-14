import { Suspense } from 'react';
import BannerEditor from '../components/BannerEditor';

function EditorContent() {
  return <BannerEditor />;
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <EditorContent />
    </Suspense>
  );
}
