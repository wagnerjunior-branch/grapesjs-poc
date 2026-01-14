import { Suspense } from 'react';
import TemplateSelector from '../../components/TemplateSelector';

function TemplateSelectorContent() {
  return <TemplateSelector />;
}

export default function NewCreativePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TemplateSelectorContent />
    </Suspense>
  );
}
