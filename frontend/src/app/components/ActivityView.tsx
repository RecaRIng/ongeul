import { useState, useRef } from 'react';
import { CheckSquare, ArrowLeft, Copy, Download, Eye } from 'lucide-react';

interface Activity {
  type: 'checklist' | 'questions' | 'steps' | 'matching';
  title: string;
  description?: string;
  items: string[];
  answers?: string[];
  leftCards?: string[];
  rightCards?: string[];
}

interface ActivityViewProps {
  activities: Activity[];
  onBack: () => void;
}

const COACH_TIPS = [
  {
    title: '직접 글에서 찾아보게 해보세요',
    body:
      '아이가 바로 답을 듣기보다,\n글에서 **날짜·준비물·장소**를 직접 찾아보게 하면\n**읽기 이해와 정보 찾기 연습**에 도움이 됩니다.\n\n아이가 어려워하면 **힌트 보기 기능**을 활용해보세요!',
  },
  {
    title: '아이가 자기 말로 설명해보게 해보세요',
    body:
      '"내일 뭐 해야 해?", "뭘 챙겨야 해?"처럼 물어보며\n**아이 스스로 설명**하게 하면\n**이해 여부를 자연스럽게 확인**할 수 있습니다.',
  },
  {
    title: '읽고 바로 준비 행동까지 이어가보세요',
    body:
      '가방에 준비물을 넣거나 제출물을 확인하는\n**행동까지 연결**하면\n이해한 내용을 **실제 수행으로 이어가는 연습**이 됩니다.',
  },
  {
    title: '새 단어를 일상에서 다시 사용해보세요',
    body:
      "'**참가 신청서**', '**체험학습**' 같은 단어를\n다른 상황에서도 **반복해서 사용**해보면\n**어휘 이해와 표현력**이 함께 자랄 수 있습니다.",
  },
];

export default function ActivityView({ activities, onBack }: ActivityViewProps) {
  const [matchingState, setMatchingState] = useState<Record<number, Record<number, number>>>({});
  const [selectedLeft, setSelectedLeft] = useState<Record<number, number | null>>({});
  const [showAnswer, setShowAnswer] = useState<Record<number, boolean>>({});
  const [shuffledCards, setShuffledCards] = useState<Record<number, { left: number[]; right: number[] }>>({});
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        결과로 돌아가기
      </button>

      <section className="rounded-xl p-6 border" style={{ backgroundColor: '#f9f3ef', borderColor: '#82987f' }}>
        <div className="flex items-start gap-3 mb-4">
          <CheckSquare className="w-6 h-6 mt-1 flex-shrink-0" style={{ color: '#354d3f' }} />
          <div>
            <h2 className="text-lg font-bold text-gray-900">활동 자료</h2>
            <p className="text-sm text-gray-600 mt-1">
              문서 내용을 잘 이해했는지 확인하는 활동이에요.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {activities.map((activity, idx) => (
            <div key={idx} className="bg-white rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <h3 className={`font-semibold text-gray-900 ${activity.description ? 'mb-1' : ''}`}>{activity.title}</h3>
                  {activity.description && (
                    <p className="text-sm text-gray-600">{activity.description}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    className="px-2 py-1.5 text-xs rounded-md text-white flex items-center gap-1 transition-colors"
                    style={{ backgroundColor: '#354d3f' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a3d32')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#354d3f')}
                  >
                    <Copy className="w-3 h-3" />
                    복사
                  </button>
                  <button
                    className="px-2 py-1.5 text-xs rounded-md text-white flex items-center gap-1 transition-colors"
                    style={{ backgroundColor: '#354d3f' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a3d32')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#354d3f')}
                  >
                    <Download className="w-3 h-3" />
                    저장
                  </button>
                </div>
              </div>
              {activity.type === 'checklist' && (
                <div className="space-y-2">
                  {activity.items.map((item, itemIdx) => (
                    <label key={itemIdx} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        style={{ accentColor: '#354d3f' }}
                      />
                      <span className="text-gray-700">{item}</span>
                    </label>
                  ))}
                </div>
              )}
              {activity.type === 'questions' && (
                <div className="space-y-3">
                  {activity.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="bg-gray-50 rounded-lg p-3">
                      <p className="font-medium text-gray-900 mb-2">{item}</p>
                      {activity.answers && activity.answers[itemIdx] && (
                        <p className="text-sm text-gray-700 pl-3 border-l-2" style={{ borderColor: '#82987f' }}>
                          → {activity.answers[itemIdx]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {activity.type === 'matching' && activity.leftCards && activity.rightCards && (() => {
                if (!shuffledCards[idx]) {
                  const leftIndices = activity.leftCards.map((_, i) => i);
                  const rightIndices = activity.rightCards.map((_, i) => i);
                  const shuffleArray = (arr: number[]) => {
                    const shuffled = [...arr];
                    for (let i = shuffled.length - 1; i > 0; i--) {
                      const j = Math.floor(Math.random() * (i + 1));
                      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                    }
                    return shuffled;
                  };
                  setShuffledCards((prev) => ({
                    ...prev,
                    [idx]: { left: shuffleArray(leftIndices), right: shuffleArray(rightIndices) },
                  }));
                }
                const shuffled = shuffledCards[idx] || { left: [], right: [] };
                const currentState = matchingState[idx];
                const isShowAnswer = showAnswer[idx];

                const cardHeight = 56;
                const cardGap = 12;
                const currentMatches = matchingState[idx] || {};
                const currentSelected = selectedLeft[idx];

                return (
                  <div>
                    <div className="flex justify-end gap-2 mb-3">
                      <button
                        onClick={() => setShowAnswer((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                        className="px-3 py-2 text-sm rounded-lg border text-gray-700 hover:bg-gray-50 flex items-center gap-1"
                        style={{ borderColor: '#354d3f', color: '#354d3f' }}
                      >
                        <Eye className="w-4 h-4" />
                        {isShowAnswer ? '정답 숨기기' : '정답 보기'}
                      </button>
                    </div>
                    <div className="relative">
                      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                        {isShowAnswer && shuffled.left.map((leftIdx, i) => {
                          const rightIdx = leftIdx;
                          const rightPos = shuffled.right.indexOf(rightIdx);
                          if (rightPos === -1) return null;
                          const y1 = i * (cardHeight + cardGap) + cardHeight / 2;
                          const y2 = rightPos * (cardHeight + cardGap) + cardHeight / 2;
                          return (
                            <line
                              key={`answer-${i}`}
                              x1="calc(50% - 24px)"
                              y1={y1}
                              x2="calc(50% + 24px)"
                              y2={y2}
                              stroke="#354d3f"
                              strokeWidth="2"
                              opacity="0.6"
                            />
                          );
                        })}
                        {!isShowAnswer && Object.entries(currentMatches).map(([leftI, rightI]) => {
                          const leftIdx = parseInt(leftI);
                          const rightIdx = parseInt(rightI as unknown as string);
                          const y1 = leftIdx * (cardHeight + cardGap) + cardHeight / 2;
                          const y2 = rightIdx * (cardHeight + cardGap) + cardHeight / 2;
                          return (
                            <line
                              key={`match-${leftIdx}-${rightIdx}`}
                              x1="calc(50% - 24px)"
                              y1={y1}
                              x2="calc(50% + 24px)"
                              y2={y2}
                              stroke="#82987f"
                              strokeWidth="3"
                            />
                          );
                        })}
                      </svg>
                      <div className="grid grid-cols-2 gap-12" style={{ position: 'relative', zIndex: 2 }}>
                        <div className="space-y-3">
                          {shuffled.left.map((leftIdx, i) => {
                            const isSelected = currentSelected === i;
                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedLeft((prev) => ({ ...prev, [idx]: null }));
                                  } else {
                                    setSelectedLeft((prev) => ({ ...prev, [idx]: i }));
                                  }
                                }}
                                className={`w-full text-left bg-white rounded-lg p-3 border-2 transition-colors ${
                                  isSelected ? '' : 'border-gray-200 hover:border-gray-300'
                                }`}
                                style={isSelected ? { borderColor: '#354d3f' } : undefined}
                              >
                                <p className="text-gray-900">{activity.leftCards?.[leftIdx]}</p>
                              </button>
                            );
                          })}
                        </div>
                        <div className="space-y-3">
                          {shuffled.right.map((rightIdx, i) => {
                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  if (currentSelected !== null && currentSelected !== undefined) {
                                    setMatchingState((prev) => ({
                                      ...prev,
                                      [idx]: { ...(prev[idx] || {}), [currentSelected]: i },
                                    }));
                                    setSelectedLeft((prev) => ({ ...prev, [idx]: null }));
                                  }
                                }}
                                className="w-full text-left bg-white rounded-lg p-3 border-2 border-gray-200 hover:border-gray-300 transition-colors"
                              >
                                <p className="text-gray-900">{activity.rightCards?.[rightIdx]}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              {activity.type === 'steps' && (
                <ol className="space-y-2 list-decimal list-inside">
                  {activity.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="text-gray-700">{item}</li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl p-6 border-2" style={{ borderColor: '#82987f', backgroundColor: '#ffffff' }}>
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
            {COACH_TIPS.map((tip, i) => (
              <div key={i} className="rounded-lg p-4" style={{ backgroundColor: '#f9f3ef' }}>
                <p className="font-semibold mb-2" style={{ color: '#354d3f' }}>
                  📌 {tip.title}
                </p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {tip.body.split(/(\*\*.+?\*\*)/g).map((part, idx) => {
                    const m = part.match(/^\*\*(.+?)\*\*$/);
                    return m ? (
                      <span key={idx} className="font-semibold" style={{ color: '#354d3f' }}>
                        {m[1]}
                      </span>
                    ) : (
                      <span key={idx}>{part}</span>
                    );
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
