import { ChangeEvent, useRef, useState } from 'react';
import { Upload, Send } from 'lucide-react';
import DocumentTypeSelector from './DocumentTypeSelector';

interface InputAreaProps {
  onSubmit: (text: string, types: string[]) => void;
  onImageSubmit: (file: File, types: string[]) => void;
  disabled?: boolean;
}

export default function InputArea({ onSubmit, onImageSubmit, disabled = false }: InputAreaProps) {
  const [text, setText] = useState('');
  const [docTypes, setDocTypes] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (text.trim() && !disabled) {
      onSubmit(text, docTypes);
      setText('');
      setDocTypes([]);
    }
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (file && !disabled) {
      onImageSubmit(file, docTypes);
      setDocTypes([]);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          학교 문서를 입력하거나 이미지로 업로드해 주세요
        </label>
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="안내문, 가정통신문, 과제 내용을 입력해 주세요."
            className="w-full min-h-[200px] p-4 border-2 border-gray-200 rounded-xl resize-none focus:outline-none"
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#354d3f';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit();
              }
            }}
            disabled={disabled}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handleImageChange}
          />
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              title="이미지 업로드"
            >
              <Upload className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!text.trim() || disabled}
              className="px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              style={{ backgroundColor: '#354d3f' }}
              onMouseEnter={(e) => {
                if (text.trim() && !disabled) e.currentTarget.style.backgroundColor = '#2a3d32';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#354d3f';
              }}
            >
              <Send className="w-4 h-4" />
              분석하기
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">문서 유형</label>
        <p className="text-xs text-gray-600 mb-3">
          가장 가까운 유형을 선택하면 더 정확하게 분석할 수 있습니다. 선택하지 않아도 자동으로 판단합니다.
        </p>
        <DocumentTypeSelector selected={docTypes} onSelect={setDocTypes} />
      </div>
    </div>
  );
}
