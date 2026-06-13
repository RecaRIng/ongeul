import { useRef, useState } from 'react';
import { FileImage, Send, Upload, X } from 'lucide-react';
import DocumentTypeSelector from './DocumentTypeSelector';

interface InputAreaProps {
  onSubmit: (text: string, types: string[]) => void;
  onFileSubmit?: (file: UploadedDocument, types: string[]) => void;
}

export interface UploadedDocument {
  fileBase64: string;
  mimeType: string;
  fileName: string;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',').pop() || '' : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function InputArea({ onSubmit, onFileSubmit }: InputAreaProps) {
  const [text, setText] = useState('');
  const [docTypes, setDocTypes] = useState<string[]>([]);
  const [fileError, setFileError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasContent = text.trim().length > 0 || selectedFile !== null;
  const canSubmit = hasContent;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    if (selectedFile) {
      try {
        const mimeType = selectedFile.type || (selectedFile.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '');
        const fileBase64 = await readFileAsBase64(selectedFile);
        onFileSubmit?.(
          {
            fileBase64,
            mimeType: mimeType || 'application/octet-stream',
            fileName: selectedFile.name,
          },
          docTypes,
        );
        setSelectedFile(null);
        setDocTypes([]);
        setFileError('');
      } catch {
        setFileError('파일을 읽는 중 문제가 발생했어요. 내용을 복사해서 입력창에 붙여넣어 주세요.');
      }
      return;
    }

    if (text.trim()) {
      onSubmit(text.trim(), docTypes);
      setText('');
      setDocTypes([]);
      setFileError('');
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const mimeType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '');
    const isTextFile = file.type.startsWith('text/') || /\.(txt|md|markdown|csv|json)$/i.test(file.name);
    const isUploadDocument =
      mimeType === 'application/pdf' ||
      mimeType === 'image/png' ||
      mimeType === 'image/jpeg' ||
      /\.(pdf|png|jpe?g)$/i.test(file.name);

    if (!isTextFile && !isUploadDocument) {
      setFileError('이미지, PDF, txt, md, csv, json 파일을 업로드할 수 있어요.');
      return;
    }

    if (isUploadDocument && !isTextFile) {
      setSelectedFile(file);
      setText('');
      setFileError('');
      return;
    }

    try {
      const fileText = await file.text();
      setText(fileText);
      setSelectedFile(null);
      setFileError('');
    } catch {
      setFileError('파일을 읽는 중 문제가 발생했어요. 내용을 복사해서 입력창에 붙여넣어 주세요.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-6 lg:px-8">
      <div>
        <label className="mb-3 block text-sm font-semibold text-gray-900">학교 문서를 입력해주세요</label>
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,application/pdf,.pdf,.txt,.md,.markdown,.csv,.json,text/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="안내문, 가정통신문, 과제 등을 입력하거나 업로드해주세요."
            className="min-h-[240px] w-full resize-none rounded-xl border-2 border-gray-200 p-4 pr-14 text-gray-900 focus:outline-none"
            onFocus={(event) => {
              event.currentTarget.style.borderColor = '#354d3f';
            }}
            onBlur={(event) => {
              event.currentTarget.style.borderColor = '#e5e7eb';
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                handleSubmit();
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="문서 업로드"
            className="absolute bottom-3 right-3 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <Upload className="h-5 w-5" />
          </button>
        </div>

        {fileError && <p className="mt-2 text-sm text-red-600">{fileError}</p>}

        {selectedFile && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800">
            <div className="flex min-w-0 items-center gap-2">
              <FileImage className="h-4 w-4 flex-shrink-0" style={{ color: '#354d3f' }} />
              <span className="truncate">{selectedFile.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="선택한 파일 제거"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-900">문서 유형</label>
        <p className="mb-3 text-xs text-gray-600">선택하지 않으면 온글이 자동으로 문서 유형을 판단해요.</p>
        <DocumentTypeSelector selected={docTypes} onSelect={setDocTypes} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="mb-3 text-sm text-gray-600">
          {!hasContent
            ? '문서 내용을 입력하거나 파일을 선택해주세요.'
            : docTypes.length === 0
              ? '자동 판별로 문서 분석을 시작할 수 있어요.'
              : '분석하기를 누르면 문서 분석을 시작해요.'}
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 text-base font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: '#354d3f' }}
          onMouseEnter={(event) => {
            if (canSubmit) event.currentTarget.style.backgroundColor = '#2a3d32';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = '#354d3f';
          }}
        >
          <Send className="h-5 w-5" />
          분석하기
        </button>
      </div>
    </div>
  );
}
