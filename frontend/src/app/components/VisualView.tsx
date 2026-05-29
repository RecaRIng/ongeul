import { ArrowLeft } from 'lucide-react';
import VisualGenerator from './VisualGenerator';

interface VisualViewProps {
  onBack: () => void;
  originalText?: string;
  easyText?: string;
}

export default function VisualView({ onBack, originalText, easyText }: VisualViewProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        결과로 돌아가기
      </button>
      <VisualGenerator originalText={originalText} easyText={easyText} />
    </div>
  );
}
