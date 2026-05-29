import { useState } from 'react';
import { Lightbulb, BookOpen, CheckSquare, Eye, FileText, ArrowRight, Image as ImageIcon } from 'lucide-react';
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

export default function ResultView({ data, savedWords, onSaveWord, onShowChildView, onShowActivities, onShowVisuals }: ResultViewProps) {
  const [showOriginal, setShowOriginal] = useState(false);

  const renderTextWithTooltips = (text: string) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    data.words.forEach((wordData, idx) => {
      const i = text.indexOf(wordData.word, lastIndex);
      if (i !== -1) {
        if (i > lastIndex) parts.push(text.substring(lastIndex, i));
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
        lastIndex = i + wordData.word.length;
      }
    });
    if (lastIndex < text.length) parts.push(text.substring(lastIndex));
    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {showOriginal && (
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between" style={{ backgroundColor: '#f9f3ef' }}>
            <h3 className="font-bold" style={{ color: '#354d3f' }}>원문</h3>
            <button
              onClick={() => setShowOriginal(false)}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              닫기
            </button>
          </div>
          <div className="p-6 leading-relaxed text-gray-900">
            {(data.originalText || '원문이 없습니다.').split('\n').map((line, idx) => (
              <p key={idx} className="mb-3 last:mb-0">
                {line.trim() === '' ? ' ' : renderTextWithTooltips(line)}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* 핵심 요약 + 쉬운글 변환 (나란히) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section className="rounded-xl p-6 border" style={{ backgroundColor: '#f9f3ef', borderColor: '#e0bda5' }}>
        <div className="flex items-start gap-3">
          <Lightbulb className="w-6 h-6 mt-1 flex-shrink-0" style={{ color: '#354d3f' }} />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900 mb-3">핵심 요약</h2>
            <div className="space-y-2 leading-relaxed">
              {data.guideSummary.split('\n').map((line, idx) => {
                if (line.trim() === '') return <div key={idx} className="h-2" />;
                const isBullet = line.trimStart().startsWith('- ');
                const content = isBullet ? line.trimStart().slice(2) : line;
                const parts = content.split(/(\*\*[^*]+\*\*)/g);
                const rendered = parts.map((part, i) => {
                  const match = part.match(/^\*\*([^*]+)\*\*$/);
                  if (match) {
                    return (
                      <span key={i} className="font-semibold" style={{ color: '#354d3f' }}>
                        {match[1]}
                      </span>
                    );
                  }
                  return <span key={i}>{part}</span>;
                });
                if (isBullet) {
                  return (
                    <div key={idx} className="flex gap-2 text-gray-800 pl-2">
                      <span style={{ color: '#354d3f' }}>•</span>
                      <span className="flex-1">{rendered}</span>
                    </div>
                  );
                }
                return (
                  <p key={idx} className="text-gray-800">
                    {rendered}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 쉬운글 변환 */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start gap-3 mb-4">
          <BookOpen className="w-6 h-6 mt-1 flex-shrink-0" style={{ color: '#354d3f' }} />
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-gray-900">쉬운글 변환</h2>
                <p className="text-sm text-gray-600 mt-1">
                  단어를 클릭하면 뜻과 예문을 볼 수 있어요
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
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
            </div>
          </div>
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
      </div>

      {/* 시각 자료 만들기 (다른 페이지로 이동) */}
      <button
        onClick={onShowVisuals}
        className="w-full rounded-xl p-6 border text-left transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#e0e7df', borderColor: '#82987f' }}
      >
        <div className="flex items-center gap-3">
          <ImageIcon className="w-6 h-6 flex-shrink-0 text-gray-900" />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">시각 자료 만들기</h2>
            <p className="text-sm text-gray-700 mt-1">
              문서 내용을 그림으로 만들어 아이의 이해를 도와요.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 flex-shrink-0 text-gray-900" />
        </div>
      </button>

      {/* 활동 자료 만들기 (다른 페이지로 이동) */}
      <button
        onClick={onShowActivities}
        className="w-full rounded-xl p-6 border text-left transition-opacity hover:opacity-90"
        style={{ backgroundColor: '#e0e7df', borderColor: '#82987f' }}
      >
        <div className="flex items-center gap-3">
          <CheckSquare className="w-6 h-6 flex-shrink-0" style={{ color: '#354d3f' }} />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">활동 자료 만들기</h2>
            <p className="text-sm text-gray-600 mt-1">
              아이와 함께 해볼 수 있는 활동과 온글 코치의 팁을 확인해보세요.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: '#354d3f' }} />
        </div>
      </button>

      {/* 아이와 함께 보기 */}
      <button
        onClick={onShowChildView}
        className="w-full px-4 py-3 rounded-xl text-white flex items-center justify-center gap-2 transition-colors"
        style={{ backgroundColor: '#354d3f' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a3d32'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#354d3f'}
      >
        <Eye className="w-5 h-5" />
        아이와 함께 보기
      </button>
    </div>
  );
}

