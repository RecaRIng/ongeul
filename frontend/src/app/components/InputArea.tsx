import { useState } from 'react';
import { Upload, Send } from 'lucide-react';
import DocumentTypeSelector from './DocumentTypeSelector';

interface InputAreaProps {
  onSubmit: (text: string, types: string[]) => void;
}

export default function InputArea({ onSubmit }: InputAreaProps) {
  const [text, setText] = useState('');
  const [docTypes, setDocTypes] = useState<string[]>([]);

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text, docTypes);
      setText('');
      setDocTypes([]);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          학교 문서를 입력해주세요
        </label>
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="안내문, 가정통신문, 과제 등을 입력하거나 업로드해주세요."
            className="w-full min-h-[200px] p-4 border-2 border-gray-200 rounded-xl resize-none focus:outline-none"
            style={{ '--focus-border': '#354d3f' } as any}
            onFocus={(e) => e.currentTarget.style.borderColor = '#354d3f'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
              }
            }}
          />
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Upload className="w-5 h-5" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              style={{ backgroundColor: '#354d3f' }}
              onMouseEnter={(e) => !text.trim() ? null : e.currentTarget.style.backgroundColor = '#2a3d32'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#354d3f'}
            >
              <Send className="w-4 h-4" />
              분석하기
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          문서 유형
        </label>
        <p className="text-xs text-gray-600 mb-3">
          가장 가까운 유형을 선택하면 더 정확한 분석이 가능해요. 중복 선택 또는 미선택도 가능합니다.
        </p>
        <DocumentTypeSelector selected={docTypes} onSelect={setDocTypes} />
      </div>
    </div>
  );
}
