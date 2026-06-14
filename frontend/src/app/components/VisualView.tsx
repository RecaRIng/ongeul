import { ArrowLeft } from 'lucide-react';
import VisualGenerator from './VisualGenerator';

interface VisualCard {
  cardType: string;
  label: string;
  target: string;
  prompt: string;
  imageUrl: string;
}

interface ActionStep {
  step: number;
  action: string;
  reason: string;
  visualTarget: string;
}

interface OutputPlan {
  commonBlocks: string[];
  typeBlocks: string[];
  optionalBlocks: string[];
}

interface VisualViewProps {
  onBack: () => void;
  originalText?: string;
  easyText?: string;
  visuals?: VisualCard[];
  actionSteps?: ActionStep[];
  outputPlan?: OutputPlan;
  materials?: string[];
}

export default function VisualView({ onBack, originalText, easyText, visuals, actionSteps, outputPlan, materials }: VisualViewProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        결과로 돌아가기
      </button>
      <VisualGenerator originalText={originalText} easyText={easyText} visuals={visuals} actionSteps={actionSteps} materials={materials} />
    </div>
  );
}
