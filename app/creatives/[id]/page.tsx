import { Suspense } from 'react';
import CreativeEditor from '../../components/CreativeEditor';

export default function CreativePage() {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <CreativeEditor />
    </Suspense>
  );
}
