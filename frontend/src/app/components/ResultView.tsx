import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CheckSquare, Eye, FileText, Image as ImageIcon, Lightbulb } from 'lucide-react';
import EasyText from './EasyText';
import WordTooltip from './WordTooltip';

interface Activity {
  type: 'checklist' | 'questions' | 'steps' | 'matching';
  title: string;
  description?: string;
  items: string[];
  answers?: string[];
  leftCards?: string[];
  rightCards?: string[];
}

interface ResultData {
  guideSummary: string;
  easyText: string;
  easierText?: string;
  detailedText?: string;
  originalText?: string;
  words: Array<{ word: string; meaning: string; examples: string[] }>;
  activities: Activity[];
}

interface ResultViewProps {
  data: ResultData;
  savedWords: Set<string>;
  onSaveWord: (word: string, meaning: string, examples: string[]) => void;
  onShowChildView: () => void;
  onShowActivities: () => void;
  onShowVisuals: () => void;
}

function parseSummary(summary: string) {
  return summary
    .split('\n')
    .map((line) => line.trim().replace(/^- /, ''))
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split(':');
      return rest.length > 0 ? { label: label.trim(), value: rest.join(':').trim() } : { label: '안내', value: line };
    });
}

export default function ResultView({ data, savedWords, onSaveWord, onShowChildView, onShowActivities, onShowVisuals }: ResultViewProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const summaryItems = useMemo(() => parseSummary(data.guideSummary), [data.guideSummary]);

  const renderTextWithTooltips = (text: string) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    data.words.forEach((wordData, idx) => {
      const index = text.indexOf(wordData.word, lastIndex);
      if (index === -1) return;
      if (index > lastIndex) parts.push(text.substring(lastIndex, index));
      parts.push(
        <WordTooltip
          key={`${wordData.word}-${idx}`}
          word={wordData.word}
          meaning={wordData.meaning}
          examples={wordData.examples}
          onSave={onSaveWord}
          isSaved={savedWords.has(wordData.word)}
        />
      );
      lastIndex = index + wordData.word.length;
    });

    if (lastIndex < text.length) parts.push(text.substring(lastIndex));
    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <section className="rounded-xl border p-5 sm:p-6" style={{ backgroundColor: '#f9f3ef', borderColor: '#e0bda5' }}>
        <div className="flex items-start gap-3 mb-5">
          <Lightbulb className="w-6 h-6 mt-1 flex-shrink-0" style={{ color: '#354d3f' }} />
          <div>
            <h2 className="text-xl font-bold text-gray-900">핵심 요약</h2>
            <p className="text-sm text-gray-600 mt-1">한 장에서 전체 문서의 핵심 정보를 바로 볼 수 있어요.</p>
          </div>
        </div>

        <div className="rounded-xl bg-white/90 border border-white overflow-hidden">
          {summaryItems.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className={`grid grid-cols-[92px_1fr] sm:grid-cols-[120px_1fr] gap-4 px-4 sm:px-5 py-4 ${
                index === summaryItems.length - 1 ? '' : 'border-b border-gray-100'
              }`}
            >
              <div className="text-sm font-bold" style={{ color: '#354d3f' }}>
                {item.label}
              </div>
              <div className="text-base sm:text-lg leading-8 text-gray-900 break-keep">
                {item.value || '-'}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
          <div className="flex items-start gap-3">
            <BookOpen className="w-6 h-6 mt-1 flex-shrink-0" style={{ color: '#354d3f' }} />
            <div>
              <h2 className="text-xl font-bold text-gray-900">쉬운글 변환</h2>
              <p className="text-sm text-gray-600 mt-1">짧은 문장으로 끊어서 읽기 쉽게 보여줘요.</p>
            </div>
          </div>
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="px-3 py-2 text-sm rounded-lg border transition-colors flex items-center gap-1"
            style={
              showOriginal
                ? { backgroundColor: '#354d3f', color: '#ffffff', borderColor: '#354d3f' }
                : { backgroundColor: '#ffffff', color: '#374151', borderColor: '#d1d5db' }
            }
          >
            <FileText className="w-4 h-4" />
            {showOriginal ? '원문 닫기' : '원문 같이 보기'}
          </button>
        </div>

        <EasyText
          content={data.easyText}
          easierContent={data.easierText}
          detailedContent={data.detailedText}
          words={data.words}
          savedWords={savedWords}
          onSaveWord={onSaveWord}
        />
      </section>

      {showOriginal && (
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200" style={{ backgroundColor: '#f9f3ef' }}>
            <h3 className="font-bold" style={{ color: '#354d3f' }}>원문</h3>
          </div>
          <div className="p-5 leading-8 text-gray-900 space-y-2">
            {(data.originalText || '원문이 없습니다.').split('\n').map((line, idx) => (
              <p key={idx}>{line.trim() === '' ? ' ' : renderTextWithTooltips(line)}</p>
            ))}
          </div>
        </section>
      )}

      <button
        onClick={onShowVisuals}
        className="w-full rounded-xl p-5 border text-left transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#e0e7df', borderColor: '#82987f' }}
      >
        <div className="flex items-center gap-3">
          <ImageIcon className="w-6 h-6 flex-shrink-0 text-gray-900" />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">시각 자료 만들기</h2>
            <p className="text-sm text-gray-700 mt-1">문서 내용을 그림 자료로 바꿔 볼 수 있어요.</p>
          </div>
          <ArrowRight className="w-5 h-5 flex-shrink-0 text-gray-900" />
        </div>
      </button>

      <button
        onClick={onShowActivities}
        className="w-full rounded-xl p-5 border text-left transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#e0e7df', borderColor: '#82987f' }}
      >
        <div className="flex items-center gap-3">
          <CheckSquare className="w-6 h-6 flex-shrink-0" style={{ color: '#354d3f' }} />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">활동 자료 만들기</h2>
            <p className="text-sm text-gray-700 mt-1">체크리스트와 질문 자료를 확인해요.</p>
          </div>
          <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: '#354d3f' }} />
        </div>
      </button>

      <button
        onClick={onShowChildView}
        className="w-full px-4 py-3 rounded-xl text-white flex items-center justify-center gap-2 transition-colors"
        style={{ backgroundColor: '#354d3f' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#2a3d32';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#354d3f';
        }}
      >
        <Eye className="w-5 h-5" />
        아이와 함께 보기
      </button>
    </div>
  );
}
