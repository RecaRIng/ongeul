import { useState } from 'react';
import { X, FileText, ArrowRight, ArrowLeft, Lightbulb, Eye, EyeOff } from 'lucide-react';
import EasyText from './EasyText';
import WordTooltip from './WordTooltip';

interface Word {
  word: string;
  meaning: string;
  examples: string[];
}

interface Activity {
  type: 'checklist' | 'questions' | 'steps' | 'matching';
  title: string;
  description?: string;
  items: string[];
  answers?: string[];
  leftCards?: string[];
  rightCards?: string[];
}

interface ChildViewProps {
  content: string;
  originalText: string;
  words: Word[];
  savedWords: Set<string>;
  activities: Activity[];
  onSaveWord: (word: string, meaning: string, examples: string[]) => void;
  onClose: () => void;
}

export default function ChildView({ content, originalText, words, savedWords, activities, onSaveWord, onClose }: ChildViewProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [hintSet, setHintSet] = useState<Set<number>>(new Set());
  const [answerSet, setAnswerSet] = useState<Set<number>>(new Set());
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleCheck = (key: string) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const questions = activities.find(a => a.type === 'questions');

  const toggleHint = (index: number) => {
    setHintSet(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAnswer = (index: number) => {
    setAnswerSet(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const extractBold = (s: string | undefined) => {
    if (!s) return undefined;
    const m = s.match(/\*\*(.+?)\*\*/);
    return m ? m[1] : s;
  };

  const renderAnswerWithBold = (s: string) => {
    const parts = s.split(/(\*\*.+?\*\*)/g);
    return parts.map((p, i) => {
      const m = p.match(/^\*\*(.+?)\*\*$/);
      if (m) {
        return (
          <span key={i} style={{ color: '#111827' }}>
            {m[1]}
          </span>
        );
      }
      return (
        <span key={i} style={{ color: '#6b7280' }}>
          {p}
        </span>
      );
    });
  };

  const renderLineWithMultiHighlight = (line: string, answers: string[]) => {
    if (answers.length === 0) return <>{line}</>;
    type Range = { start: number; end: number };
    const ranges: Range[] = [];
    answers.forEach(ans => {
      const i = line.indexOf(ans);
      if (i !== -1) ranges.push({ start: i, end: i + ans.length });
    });
    if (ranges.length === 0) return <>{line}</>;
    ranges.sort((a, b) => a.start - b.start);
    const merged: Range[] = [];
    ranges.forEach(r => {
      const last = merged[merged.length - 1];
      if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
      else merged.push({ ...r });
    });
    const out: React.ReactNode[] = [];
    let cursor = 0;
    merged.forEach((r, i) => {
      if (r.start > cursor) out.push(line.substring(cursor, r.start));
      out.push(
        <span
          key={i}
          style={{
            color: '#ffffff',
            backgroundColor: '#82987f',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 700,
          }}
        >
          {line.substring(r.start, r.end)}
        </span>
      );
      cursor = r.end;
    });
    if (cursor < line.length) out.push(line.substring(cursor));
    return <>{out}</>;
  };

  const renderLineWithHighlight = (line: string, answer: string | undefined) => {
    if (!answer) return <>{line}</>;
    const idx = line.indexOf(answer);
    if (idx === -1) return <>{line}</>;
    return (
      <>
        {line.substring(0, idx)}
        <span
          style={{
            color: '#ffffff',
            backgroundColor: '#82987f',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 700,
          }}
        >
          {line.substring(idx, idx + answer.length)}
        </span>
        {line.substring(idx + answer.length)}
      </>
    );
  };

  if (showActivity && questions) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#f9f3ef' }}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold" style={{ color: '#354d3f' }}>
              함께 생각해봐요
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowActivity(false)}
                className="px-3 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                뒤로 가기
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                aria-label="닫기"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 왼쪽: 쉬운글 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-4">쉬운글</h2>
              <div className="leading-relaxed text-gray-900">
                {content.split('\n').map((line, idx) => {
                  const activeHints = Array.from(hintSet)
                    .map(i => extractBold(questions.answers?.[i]))
                    .filter((s): s is string => !!s);
                  // 빈 줄이면 문단 구분을 위한 공백
                  if (line.trim() === '') {
                    return <div key={idx} className="h-3" />;
                  }
                  return (
                    <p key={idx} className="mb-1">
                      {renderLineWithMultiHighlight(line, activeHints)}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* 오른쪽: 질문 */}
            <div className="bg-white rounded-xl p-6 border-2" style={{ borderColor: '#354d3f' }}>
              <h2 className="text-lg font-bold mb-4" style={{ color: '#354d3f' }}>
                {questions.title}
              </h2>
              <div className="space-y-4">
                {questions.items.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-lg" style={{ backgroundColor: '#f9f3ef' }}>
                    <p className="text-gray-800 font-medium mb-3">
                      {idx + 1}. {item}
                    </p>

                    {answerSet.has(idx) && questions.answers?.[idx] && (
                      <div className="mb-3 p-3 rounded-lg bg-white border-2" style={{ borderColor: '#354d3f' }}>
                        {!questions.answers[idx].includes(',') ? (
                          <p className="text-gray-800 leading-relaxed">
                            {questions.answers[idx].includes('**')
                              ? renderAnswerWithBold(questions.answers[idx])
                              : (
                                <span style={{ color: '#111827' }}>
                                  {questions.answers[idx]}
                                </span>
                              )}
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {questions.answers[idx].split(/,\s*/).map((ans, ansIdx) => {
                              const key = `${idx}-${ansIdx}`;
                              const checked = !!checkedItems[key];
                              return (
                                <li key={ansIdx}>
                                  <button
                                    type="button"
                                    onClick={() => toggleCheck(key)}
                                    className="flex items-center gap-2 text-gray-800 w-full text-left hover:opacity-80 transition-opacity"
                                  >
                                    <span
                                      className="inline-flex items-center justify-center w-5 h-5 rounded border-2 flex-shrink-0 transition-colors"
                                      style={{
                                        borderColor: '#354d3f',
                                        backgroundColor: checked ? '#354d3f' : '#ffffff',
                                      }}
                                    >
                                      {checked && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                      )}
                                    </span>
                                    <span className={checked ? 'line-through text-gray-500' : ''}>{ans}</span>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleHint(idx)}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors flex items-center justify-center gap-1 ${
                          hintSet.has(idx)
                            ? 'text-white'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                        style={hintSet.has(idx) ? { backgroundColor: '#82987f', borderColor: '#82987f' } : {}}
                      >
                        <Lightbulb className="w-4 h-4" />
                        {hintSet.has(idx) ? '힌트 숨기기' : '힌트 표시'}
                      </button>
                      <button
                        onClick={() => toggleAnswer(idx)}
                        className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors flex items-center justify-center gap-1 ${
                          answerSet.has(idx)
                            ? 'text-white'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                        style={answerSet.has(idx) ? { backgroundColor: '#354d3f', borderColor: '#354d3f' } : {}}
                      >
                        {answerSet.has(idx) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {answerSet.has(idx) ? '정답 숨기기' : '정답 보기'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-xl p-6 border-2" style={{ borderColor: '#82987f', backgroundColor: '#ffffff' }}>
            <div className="flex items-center gap-2 mb-4">
              <span
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white"
                style={{ backgroundColor: '#354d3f' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <h2 className="text-lg font-bold" style={{ color: '#354d3f' }}>온글 코치</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: '직접 글에서 찾아보게 해보세요',
                  body:
                    '아이가 바로 답을 듣기보다,\n글에서 **날짜·준비물·장소**를 직접 찾아보게 하면\n**읽기 이해와 정보 찾기 연습**에 도움이 됩니다.\n\n아이가 어려워하면 **힌트 보기 기능**을 활용해보세요!',
                },
                {
                  title: '아이가 자기 말로 설명해보게 해보세요',
                  body:
                    '“내일 뭐 해야 해?”, “뭘 챙겨야 해?”처럼 물어보며\n**아이 스스로 설명**하게 하면\n**이해 여부를 자연스럽게 확인**할 수 있습니다.',
                },
                {
                  title: '읽고 바로 준비 행동까지 이어가보세요',
                  body:
                    '가방에 준비물을 넣거나 제출물을 확인하는\n**행동까지 연결**하면\n이해한 내용을 **실제 수행으로 이어가는 연습**이 됩니다.',
                },
                {
                  title: '새 단어를 일상에서 다시 사용해보세요',
                  body:
                    '‘**참가 신청서**’, ‘**체험학습**’ 같은 단어를\n다른 상황에서도 **반복해서 사용**해보면\n**어휘 이해와 표현력**이 함께 자랄 수 있습니다.',
                },
              ].map((tip, i) => (
                <div
                  key={i}
                  className="rounded-lg p-4"
                  style={{ backgroundColor: '#f9f3ef' }}
                >
                  <p className="font-semibold mb-2" style={{ color: '#354d3f' }}>
                    📌 {tip.title}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {renderAnswerWithBold(tip.body)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderTextWithTooltips = (text: string) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    words.forEach((wordData, idx) => {
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
    <div className="min-h-screen" style={{ backgroundColor: '#f9f3ef' }}>
      <div className={`${showOriginal ? 'max-w-7xl' : 'max-w-4xl'} mx-auto px-4 py-8`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#354d3f' }}>
            함께 읽어요
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="px-3 py-1.5 text-sm border rounded-lg transition-colors flex items-center gap-1"
              style={
                showOriginal
                  ? { backgroundColor: '#354d3f', color: '#ffffff', borderColor: '#354d3f' }
                  : { backgroundColor: '#ffffff', color: '#374151', borderColor: '#d1d5db' }
              }
            >
              <FileText className="w-4 h-4" />
              {showOriginal ? '원문 닫기' : '원문 보기'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        <div className={showOriginal ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : ''}>
          <div>
            <EasyText
              content={content}
              words={words}
              savedWords={savedWords}
              onSaveWord={onSaveWord}
            />
          </div>

          {showOriginal && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200" style={{ backgroundColor: '#f9f3ef' }}>
                <h2 className="text-lg font-bold" style={{ color: '#354d3f' }}>원문</h2>
              </div>
              <div className="p-6 leading-relaxed text-gray-900">
                {originalText.split('\n').map((line, idx) => (
                  <p key={idx} className="mb-3 last:mb-0">
                    {line.trim() === '' ? ' ' : renderTextWithTooltips(line)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {questions && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setShowActivity(true)}
              className="px-6 py-3 rounded-xl text-white flex items-center gap-2 transition-colors text-lg font-semibold"
              style={{ backgroundColor: '#354d3f' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a3d32'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#354d3f'}
            >
              다음 활동으로 넘어가기
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
