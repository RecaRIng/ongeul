import { useState } from 'react';
import { Sparkles, Image as ImageIcon, Info, Wand2, Copy, Download, RefreshCw } from 'lucide-react';
import imgLunchbox from '../../imports/image.png';
import imgWater from '../../imports/image-10.png';
import imgShoes from '../../imports/image-11.png';
import imgSeq1 from '../../imports/image-14.png';
import imgSeq2 from '../../imports/image-12.png';
import imgSeq3 from '../../imports/image-13.png';
import imgSeq4 from '../../imports/image-15.png';

type ImageType = 'supplies' | 'activity' | 'sequence' | 'word';

const SUPPLIES_ITEMS = [
  { src: imgLunchbox, label: '도시락' },
  { src: imgWater, label: '물' },
  { src: imgShoes, label: '운동화' },
];

const SEQUENCE_STEPS = [
  { src: imgSeq2, label: '참가 신청서 작성하기' },
  { src: imgSeq3, label: '담임선생님께 신청서 제출하기' },
  { src: imgSeq4, label: '체험학습 날 준비물 챙기기' },
  { src: imgSeq1, label: '학교 교문 앞에 모이기' },
];

interface GeneratedItem {
  id: number;
  type: ImageType;
  title: string;
  description: string;
  source?: string;
}

interface VisualCard {
  cardType: string;
  label: string;
  target: string;
  prompt: string;
  imageUrl: string;
}

interface VisualGeneratorProps {
  originalText?: string;
  easyText?: string;
  visuals?: VisualCard[];
}

interface Recommendation {
  type: ImageType;
  title: string;
  description: string;
}

const ALL_TYPES: { type: ImageType; title: string; short: string; detail: string }[] = [
  {
    type: 'supplies',
    title: '준비물 이미지',
    short: '챙겨야 할 물건을 그림으로 정리해요.',
    detail:
      '문서에 등장하는 준비물을 한눈에 보기 쉬운 일러스트로 정리해요.',
  },
  {
    type: 'activity',
    title: '활동 이미지',
    short: '문장에 담긴 행동이나 상황을 그림으로 보여줘요.',
    detail:
      '문장으로만 설명되어 이해하기 어려운 행동이나 상황을 장면 일러스트로 표현해 이해를 도와요.',
  },
  {
    type: 'sequence',
    title: '순서 이미지',
    short: '해야 할 일을 순서대로 보여줘요.',
    detail:
      '여러 단계를 거쳐야 하는 일을 번호와 화살표로 연결해 순서대로 보여줘요.',
  },
  {
    type: 'word',
    title: '단어 이미지',
    short: '어려운 단어를 그림과 쉬운 뜻으로 설명해요.',
    detail:
      '아이가 처음 보는 어려운 단어를 그림과 한 줄 설명으로 함께 보여줘 어휘 이해를 도와요.',
  },
];

const RECOMMENDATIONS: Recommendation[] = [
  {
    type: 'supplies',
    title: '준비물 이미지',
    description: '도시락, 물, 운동화를 한눈에 보여줘요.',
  },
  {
    type: 'sequence',
    title: '순서 이미지',
    description: '신청서 제출부터 집합까지 순서대로 보여줘요.',
  },
];

export default function VisualGenerator({ originalText = '', easyText = '', visuals = [] }: VisualGeneratorProps) {
  const [selected, setSelected] = useState<Set<ImageType>>(new Set());
  const [openInfo, setOpenInfo] = useState<ImageType | null>(null);
  const [generated, setGenerated] = useState<GeneratedItem[]>([]);
  const [nextId, setNextId] = useState(1);
  const [pending, setPending] = useState<ImageType[]>([]);
  const [pendingChoice, setPendingChoice] = useState<Record<string, { mode: 'original' | 'easy' | 'custom'; custom: string; portion?: string }>>({});

  const renderBoldText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      const match = part.match(/^\*\*([^*]+)\*\*$/);
      if (match) {
        return <strong key={i}>{match[1]}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const VALID_TYPES = new Set<ImageType>(['supplies', 'activity', 'sequence', 'word']);
  const activeRecommendations: Recommendation[] = visuals.length > 0
    ? visuals.map((v) => ({
        type: (VALID_TYPES.has(v.cardType as ImageType) ? v.cardType : 'activity') as ImageType,
        title: v.label,
        description: v.target,
      }))
    : RECOMMENDATIONS;

  const recommendedTypes = new Set(activeRecommendations.map((r) => r.type));
  const generatedTypes = new Set(generated.map((g) => g.type));

  const toggle = (type: ImageType) => {
    if (recommendedTypes.has(type)) return;
    if (generated.some((g) => g.type === type)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const appendItems = (items: Omit<GeneratedItem, 'id'>[]) => {
    setGenerated((prev) => {
      const startId = nextId;
      const next = items.map((it, i) => ({ ...it, id: startId + i }));
      setNextId(startId + items.length);
      return [...prev, ...next];
    });
  };

  const handleRecommendClick = (rec: Recommendation) => {
    appendItems([
      {
        type: rec.type,
        title: rec.title,
        description: rec.description,
      },
    ]);
  };

  const handleSelectedClick = () => {
    const types = ALL_TYPES.filter((t) => selected.has(t.type)).map((t) => t.type);
    if (types.length === 0) return;
    setPending((prev) => [...prev, ...types.filter((t) => !prev.includes(t))]);
    setPendingChoice((prev) => {
      const next = { ...prev };
      types.forEach((t) => {
        if (!next[t]) next[t] = { mode: 'easy', custom: '' };
      });
      return next;
    });
    setSelected(new Set());
  };

  const confirmPending = (type: ImageType) => {
    const meta = ALL_TYPES.find((t) => t.type === type);
    if (!meta) return;
    const choice = pendingChoice[type];
    let source = '';
    if (choice?.mode === 'original') source = choice.portion || originalText;
    else if (choice?.mode === 'easy') source = choice.portion || easyText;
    else source = choice?.custom || '';
    if (!source.trim()) return;
    appendItems([
      {
        type,
        title: meta.title,
        description: meta.short,
        source,
      },
    ]);
    setPending((prev) => prev.filter((t) => t !== type));
    setPendingChoice((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
  };

  const cancelPending = (type: ImageType) => {
    setPending((prev) => prev.filter((t) => t !== type));
    setPendingChoice((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
  };

  const regenerate = (id: number) => {
    setGenerated((prev) => prev.map((it) => (it.id === id ? { ...it } : it)));
  };

  return (
    <>
    <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
      <div className="flex items-start gap-3">
        <ImageIcon className="w-6 h-6 mt-1 flex-shrink-0" style={{ color: '#354d3f' }} />
        <div>
          <h2 className="text-lg font-bold text-gray-900">시각자료 만들기</h2>
          <p className="text-sm text-gray-600 mt-1">
            문서 내용을 그림으로 만들어 아이의 이해를 도와요.
          </p>
        </div>
      </div>

      {/* 추천 시각자료 */}
      <div className="rounded-xl p-5 border" style={{ backgroundColor: '#f9f3ef', borderColor: '#e0bda5' }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" style={{ color: '#354d3f' }} />
          <h3 className="font-bold text-gray-900">추천 시각자료</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          문서에서 그림으로 보여주면 이해가 쉬운 부분을 골랐어요.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activeRecommendations.map((rec) => {
            const alreadyMade = generatedTypes.has(rec.type);
            return (
            <div key={rec.type} className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="font-semibold text-gray-900">{rec.title}</p>
              <p className="text-sm text-gray-600 mt-1 mb-3">{rec.description}</p>
              <button
                onClick={() => handleRecommendClick(rec)}
                disabled={alreadyMade}
                className="w-full px-3 py-2 rounded-lg text-white text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#354d3f' }}
                onMouseEnter={(e) => alreadyMade ? null : (e.currentTarget.style.backgroundColor = '#2a3d32')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#354d3f')}
              >
                <Wand2 className="w-4 h-4" />
                {alreadyMade ? '이미 만들었어요' : '이 이미지 만들기'}
              </button>
            </div>
            );
          })}
        </div>
      </div>

      {/* 직접 선택하기 */}
      <div>
        <h3 className="font-bold text-gray-900 mb-1">직접 선택하기</h3>
        <p className="text-sm text-gray-600 mb-4">
          원하는 시각자료 유형을 직접 골라 만들 수 있어요. (추천된 항목은 위에서 만들 수 있어요)
        </p>

        <div className="space-y-2">
          {ALL_TYPES.map((item) => {
            const isRecommended = recommendedTypes.has(item.type);
            const isMade = generatedTypes.has(item.type);
            const isDisabled = isRecommended || isMade;
            const isChecked = selected.has(item.type);
            const isInfoOpen = openInfo === item.type;
            return (
              <div
                key={item.type}
                className="border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-3 p-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 flex-shrink-0"
                    style={{ accentColor: '#354d3f' }}
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => toggle(item.type)}
                  />
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <p
                      className={`font-semibold ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}
                    >
                      {item.title}
                    </p>
                    {isMade && !isRecommended && (
                      <span className="text-xs text-gray-500">(이미 만들었어요)</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenInfo(isInfoOpen ? null : item.type)}
                    className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label={`${item.title} 설명 보기`}
                  >
                    <Info className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                {isInfoOpen && (
                  <div className="px-4 pb-4 pl-10">
                    <div className="rounded-md p-3 text-sm leading-relaxed" style={{ backgroundColor: '#f9f3ef', color: '#354d3f' }}>
                      <p className="font-medium mb-1">{item.short}</p>
                      <p className="text-gray-700">{item.detail}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {pending.length > 0 && (
          <div className="mt-4 space-y-4">
            {pending.map((type) => {
              const meta = ALL_TYPES.find((t) => t.type === type);
              if (!meta) return null;
              const unit = type === 'word' ? '단어' : '문장';
              const choice = pendingChoice[type] || { mode: 'easy' as const, custom: '' };
              const isValid =
                (choice.mode === 'original' && (choice.portion?.trim() || originalText.trim())) ||
                (choice.mode === 'easy' && (choice.portion?.trim() || easyText.trim())) ||
                (choice.mode === 'custom' && choice.custom.trim());

              const setMode = (mode: 'original' | 'easy' | 'custom') =>
                setPendingChoice((prev) => ({
                  ...prev,
                  [type]: { ...(prev[type] || { custom: '' }), mode, portion: mode === 'custom' ? prev[type]?.portion : undefined },
                }));

              const setPortion = (text: string) =>
                setPendingChoice((prev) => ({
                  ...prev,
                  [type]: { ...(prev[type] || { custom: '' }), portion: text },
                }));

              const isWordType = type === 'word';

              const renderTextBox = (mode: 'easy' | 'original', text: string, title: string) => {
                const isSelected = choice.mode === mode;
                const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
                return (
                  <div
                    onClick={() => {
                      if (!isSelected) {
                        setMode(mode);
                        setPortion('');
                      }
                    }}
                    className={`rounded-lg bg-white p-3 cursor-pointer ${isSelected ? '' : 'border border-gray-200 hover:border-gray-300'}`}
                    style={isSelected ? { borderColor: '#354d3f', borderWidth: 2 } : undefined}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        readOnly
                        checked={isSelected}
                        style={{ accentColor: '#354d3f' }}
                      />
                      <p className="font-semibold text-gray-900 text-sm">{title}</p>
                    </div>
                    {!text.trim() ? (
                      <p className="text-sm text-gray-500">내용이 없어요.</p>
                    ) : isSelected ? (
                      <div
                        className="text-sm text-gray-800 leading-relaxed max-h-60 overflow-y-auto overflow-x-hidden space-y-3"
                        onMouseUp={(e) => {
                          const sel = window.getSelection?.()?.toString().trim();
                          if (sel) {
                            setPortion(sel);
                            e.stopPropagation();
                          }
                        }}
                      >
                        {paragraphs.map((para, pIdx) => {
                          const units = isWordType
                            ? para.split(/(\*\*[^*]+\*\*|\s+)/).filter(s => s)
                            : para.split(/(?<=[.!?。])\s+/).flatMap((s, i, arr) =>
                                i < arr.length - 1 ? [s, ' '] : [s]
                              );
                          return (
                            <p key={pIdx}>
                              {units.map((u, uIdx) => {
                                if (/^\s+$/.test(u)) return <span key={uIdx}>{u}</span>;
                                const cleaned = u.trim();
                                if (!cleaned) return <span key={uIdx}>{u}</span>;
                                const isPortion = choice.portion === cleaned;
                                return (
                                  <span
                                    key={uIdx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPortion(cleaned);
                                    }}
                                    className={`cursor-pointer rounded px-0.5 ${isPortion ? '' : 'hover:bg-gray-100'}`}
                                    style={isPortion ? { backgroundColor: '#e0e7df' } : undefined}
                                  >
                                    {renderBoldText(u)}
                                  </span>
                                );
                              })}
                            </p>
                          );
                        })}
                        {choice.portion && (
                          <div className="pt-2 border-t border-gray-200 flex items-center justify-between gap-2 overflow-hidden">
                            <p className="text-xs text-gray-600 truncate min-w-0">
                              선택: <span className="text-gray-900">{renderBoldText(choice.portion)}</span>
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPortion('');
                              }}
                              className="text-xs text-gray-500 hover:text-gray-700 flex-shrink-0"
                            >
                              선택 해제
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-700 line-clamp-3 whitespace-pre-line">
                        {renderBoldText(text)}
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <div key={type} className="rounded-lg border-2 p-4" style={{ borderColor: '#82987f', backgroundColor: '#f9f3ef' }}>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-gray-900">
                      {meta.title} {unit} 선택하기
                    </h4>
                    <button
                      onClick={() => cancelPending(type)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      취소
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    {unit}을 클릭하거나 드래그하면 선택할 수 있어요.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {renderTextBox('easy', easyText, '쉬운글에서 선택')}
                    {renderTextBox('original', originalText, '원문에서 선택')}
                  </div>

                  <label
                    onClick={() => choice.mode !== 'custom' && setMode('custom')}
                    className={`mt-3 block rounded-lg bg-white p-3 cursor-text ${choice.mode === 'custom' ? '' : 'border border-gray-200'}`}
                    style={choice.mode === 'custom' ? { borderColor: '#354d3f', borderWidth: 2 } : undefined}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="radio"
                        readOnly
                        checked={choice.mode === 'custom'}
                        style={{ accentColor: '#354d3f' }}
                      />
                      <p className="font-semibold text-gray-900 text-sm">직접 입력하기</p>
                    </div>
                    <textarea
                      value={choice.custom}
                      onChange={(e) =>
                        setPendingChoice((prev) => ({
                          ...prev,
                          [type]: { ...(prev[type] || { custom: '' }), mode: 'custom', custom: e.target.value },
                        }))
                      }
                      onFocus={() => setMode('custom')}
                      placeholder={`그림으로 만들 ${unit}을 입력해주세요.`}
                      className="w-full min-h-[36px] p-2 border border-gray-200 rounded-md text-sm focus:outline-none resize-none"
                      rows={1}
                    />
                  </label>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => confirmPending(type)}
                      disabled={!isValid}
                      className="px-4 py-2 rounded-lg text-white text-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: '#354d3f' }}
                      onMouseEnter={(e) => isValid && (e.currentTarget.style.backgroundColor = '#2a3d32')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#354d3f')}
                    >
                      <Wand2 className="w-4 h-4" />
                      이미지 만들기
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSelectedClick}
            disabled={selected.size === 0}
            className="px-4 py-2 rounded-lg text-white text-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#354d3f' }}
            onMouseEnter={(e) => selected.size === 0 ? null : (e.currentTarget.style.backgroundColor = '#2a3d32')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#354d3f')}
          >
            <Wand2 className="w-4 h-4" />
            선택한 이미지 만들기
          </button>
        </div>
      </div>

    </section>
    {generated.length > 0 && (
      <section className="bg-white border border-gray-200 rounded-xl p-6 mt-6">
        <h3 className="font-bold text-gray-900 mb-4">생성된 이미지</h3>
        <div className="space-y-4">
          {generated.map((item, idx) => (
            <div
              key={item.id}
              className="rounded-lg border border-gray-200 overflow-hidden bg-white"
            >
              <div className="p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <span className="text-xs text-gray-500">#{idx + 1}</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{item.description}</p>

                {item.type === 'supplies' ? (
                  <div className="grid grid-cols-3 gap-4">
                    {SUPPLIES_ITEMS.map((s) => (
                      <div key={s.label} className="flex flex-col items-center border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="w-full aspect-square bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
                          <img src={s.src} alt={s.label} className="w-full h-full object-contain" />
                        </div>
                        <p className="mt-2 text-sm font-medium text-gray-800">{s.label}</p>
                        <div className="mt-2 flex flex-wrap gap-1 justify-center">
                          <button
                            aria-label={`${s.label} 복사하기`}
                            className="px-2 py-1 text-xs rounded-md text-white flex items-center gap-1 transition-colors"
                            style={{ backgroundColor: '#354d3f' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a3d32')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#354d3f')}
                          >
                            <Copy className="w-3 h-3" />
                            복사
                          </button>
                          <button
                            aria-label={`${s.label} 저장하기`}
                            className="px-2 py-1 text-xs rounded-md text-white flex items-center gap-1 transition-colors"
                            style={{ backgroundColor: '#354d3f' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a3d32')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#354d3f')}
                          >
                            <Download className="w-3 h-3" />
                            저장
                          </button>
                          <button
                            aria-label={`${s.label} 다시 생성하기`}
                            className="px-2 py-1 text-xs rounded-md border bg-white text-gray-700 hover:bg-gray-50 flex items-center gap-1"
                            style={{ borderColor: '#354d3f', color: '#354d3f' }}
                          >
                            <RefreshCw className="w-3 h-3" />
                            다시
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : item.type === 'sequence' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {SEQUENCE_STEPS.map((s, sIdx) => (
                      <div key={sIdx} className="flex flex-col items-center border border-gray-200 rounded-lg p-3 bg-white">
                        <div className="w-full aspect-square bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
                          <img src={s.src} alt={s.label} className="w-full h-full object-contain" />
                        </div>
                        <div className="mt-2 flex items-start gap-2">
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: '#354d3f' }}
                          >
                            {sIdx + 1}
                          </span>
                          <p className="text-sm font-medium text-gray-800 leading-snug">{s.label}</p>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1 justify-center">
                          <button
                            aria-label={`${s.label} 복사하기`}
                            className="px-2 py-1 text-xs rounded-md text-white flex items-center gap-1 transition-colors"
                            style={{ backgroundColor: '#354d3f' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a3d32')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#354d3f')}
                          >
                            <Copy className="w-3 h-3" />
                            복사
                          </button>
                          <button
                            aria-label={`${s.label} 저장하기`}
                            className="px-2 py-1 text-xs rounded-md text-white flex items-center gap-1 transition-colors"
                            style={{ backgroundColor: '#354d3f' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a3d32')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#354d3f')}
                          >
                            <Download className="w-3 h-3" />
                            저장
                          </button>
                          <button
                            aria-label={`${s.label} 다시 생성하기`}
                            className="px-2 py-1 text-xs rounded-md border bg-white hover:bg-gray-50 flex items-center gap-1"
                            style={{ borderColor: '#354d3f', color: '#354d3f' }}
                          >
                            <RefreshCw className="w-3 h-3" />
                            다시
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="aspect-[4/3] bg-gray-100 rounded-lg" />
                    <div className="mt-4 flex flex-wrap gap-2 justify-end">
                      <button
                        className="px-3 py-2 text-sm rounded-lg text-white flex items-center gap-1 transition-colors"
                        style={{ backgroundColor: '#354d3f' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a3d32')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#354d3f')}
                      >
                        <Copy className="w-4 h-4" />
                        복사하기
                      </button>
                      <button
                        className="px-3 py-2 text-sm rounded-lg text-white flex items-center gap-1 transition-colors"
                        style={{ backgroundColor: '#354d3f' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a3d32')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#354d3f')}
                      >
                        <Download className="w-4 h-4" />
                        저장하기
                      </button>
                      <button
                        onClick={() => regenerate(item.id)}
                        className="px-3 py-2 text-sm rounded-lg border bg-white hover:bg-gray-50 flex items-center gap-1"
                        style={{ borderColor: '#354d3f', color: '#354d3f' }}
                      >
                        <RefreshCw className="w-4 h-4" />
                        다시 생성하기
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    )}
    </>
  );
}
