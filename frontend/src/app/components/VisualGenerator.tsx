import { useState } from 'react';
import { Copy, Download, Image as ImageIcon, Info, RefreshCw, Sparkles, Wand2 } from 'lucide-react';

type ImageType = 'supplies' | 'activity' | 'sequence' | 'word';
type SourceMode = 'original' | 'easy' | 'custom';

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

interface GeneratedItem {
  id: number;
  type: ImageType;
  title: string;
  description: string;
  source?: string;
  visual?: VisualCard;
}

interface Recommendation {
  type: ImageType;
  title: string;
  description: string;
  visual?: VisualCard;
}

interface PendingChoice {
  mode: SourceMode;
  custom: string;
  portion?: string;
}

const ALL_TYPES: { type: ImageType; title: string; short: string; detail: string }[] = [
  {
    type: 'supplies',
    title: '준비물 이미지',
    short: '챙겨야 할 물건을 그림으로 정리해요.',
    detail: '문서에 나온 준비물을 아이가 바로 확인할 수 있게 카드로 보여줘요.',
  },
  {
    type: 'activity',
    title: '활동 이미지',
    short: '문장에 나온 행동이나 상황을 그림으로 보여줘요.',
    detail: '장소, 활동, 주의사항처럼 말로만 이해하기 어려운 부분을 한 장면으로 보여줘요.',
  },
  {
    type: 'sequence',
    title: '순서 이미지',
    short: '해야 할 일을 순서대로 보여줘요.',
    detail: '신청, 제출, 준비, 이동처럼 여러 단계를 차례로 정리할 때 사용해요.',
  },
  {
    type: 'word',
    title: '단어 이미지',
    short: '어려운 단어를 그림과 쉬운 설명으로 보여줘요.',
    detail: '아이가 처음 보는 단어나 추상적인 말을 이해할 수 있게 돕는 카드예요.',
  },
];

const CARD_TYPE_LABELS: Record<string, string> = {
  date_card: '날짜',
  time_card: '시간',
  place_card: '장소',
  material_card: '준비물',
  deadline_card: '마감일',
  submit_to_card: '제출처',
  signature_card: '서명',
  choice_card: '선택',
  step_card: '행동',
  warning_card: '주의사항',
  result_card: '결과',
};

function makeId(): number {
  return Date.now() + Math.floor(Math.random() * 100000);
}

function visualToType(cardType: string): ImageType {
  if (cardType === 'material_card') return 'supplies';
  if (cardType === 'step_card') return 'sequence';
  if (cardType === 'warning_card') return 'word';
  return 'activity';
}

function getCardTitle(visual: VisualCard): string {
  return visual.label || CARD_TYPE_LABELS[visual.cardType] || '시각자료';
}

function buildRecommendations(visuals: VisualCard[]): Recommendation[] {
  if (!visuals.length) {
    return [
      {
        type: 'supplies',
        title: '준비물 이미지',
        description: '문서에서 준비물을 찾으면 카드로 만들 수 있어요.',
      },
      {
        type: 'sequence',
        title: '순서 이미지',
        description: '해야 할 일을 순서대로 보여줄 수 있어요.',
      },
    ];
  }

  return visuals.map((visual) => ({
    type: visualToType(visual.cardType),
    title: getCardTitle(visual),
    description: visual.target,
    visual,
  }));
}

async function copyImage(imageUrl?: string) {
  if (!imageUrl) return;
  await navigator.clipboard?.writeText(imageUrl);
}

function downloadImage(imageUrl: string | undefined, index: number) {
  if (!imageUrl) return;
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = `ongle-visual-${index + 1}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function VisualGenerator({ originalText = '', easyText = '', visuals = [] }: VisualGeneratorProps) {
  const [selected, setSelected] = useState<Set<ImageType>>(new Set());
  const [openInfo, setOpenInfo] = useState<ImageType | null>(null);
  const [generated, setGenerated] = useState<GeneratedItem[]>([]);
  const [pending, setPending] = useState<ImageType[]>([]);
  const [pendingChoice, setPendingChoice] = useState<Record<string, PendingChoice>>({});
  const [notice, setNotice] = useState('');
  const [regeneratingIds, setRegeneratingIds] = useState<Set<number>>(new Set());

  const recommendations = buildRecommendations(visuals);
  const generatedKeys = new Set(generated.map((item) => (item.visual ? `${item.visual.cardType}:${item.visual.target}` : `manual:${item.type}`)));
  const manualMadeTypes = new Set(generated.filter((item) => !item.visual).map((item) => item.type));

  const appendItems = (items: Omit<GeneratedItem, 'id'>[]) => {
    setGenerated((prev) => [
      ...prev,
      ...items.map((item) => ({
        ...item,
        id: makeId(),
      })),
    ]);
  };

  const handleRecommendClick = (rec: Recommendation) => {
    const key = rec.visual ? `${rec.visual.cardType}:${rec.visual.target}` : `manual:${rec.type}`;
    if (generatedKeys.has(key)) return;
    appendItems([{ type: rec.type, title: rec.title, description: rec.description, visual: rec.visual }]);
  };

  const toggle = (type: ImageType) => {
    if (manualMadeTypes.has(type)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleSelectedClick = () => {
    if (!selected.size) return;

    const nextTypes = [...selected].filter((type) => !pending.includes(type));
    setPending((prev) => [...prev, ...nextTypes]);
    setPendingChoice((prev) => {
      const next = { ...prev };
      nextTypes.forEach((type) => {
        next[type] = next[type] || { mode: 'easy', custom: '' };
      });
      return next;
    });
    setSelected(new Set());
  };

  const confirmPending = (type: ImageType) => {
    const meta = ALL_TYPES.find((item) => item.type === type);
    if (!meta) return;

    const choice = pendingChoice[type];
    const source =
      choice?.mode === 'original'
        ? choice.portion || originalText
        : choice?.mode === 'custom'
          ? choice.custom
          : choice?.portion || easyText;

    if (!source.trim()) return;

    appendItems([{ type, title: meta.title, description: meta.short, source }]);
    setPending((prev) => prev.filter((item) => item !== type));
    setPendingChoice((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
    setNotice('직접 선택한 시각자료 틀을 만들었어요. 세부 생성 기능은 다음 단계에서 연결할 수 있어요.');
  };

  const setChoiceMode = (type: ImageType, mode: SourceMode) => {
    setPendingChoice((prev) => ({
      ...prev,
      [type]: { ...(prev[type] || { custom: '' }), mode },
    }));
  };

  const requestRegenerate = async (item: GeneratedItem) => {
    if (!item.visual?.prompt) {
      setNotice('추천 카드에서 생성된 이미지부터 다시 생성할 수 있어요. 직접 선택 기능의 생성 API는 다음 단계에서 연결할 수 있어요.');
      return;
    }

    setNotice('');
    setRegeneratingIds((prev) => new Set(prev).add(item.id));

    try {
      const response = await fetch('/api/visual/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: item.visual.prompt,
          cardType: item.visual.cardType,
          target: item.visual.target,
        }),
      });
      const data = (await response.json()) as { imageUrl?: string; error?: string };

      if (!response.ok || !data.imageUrl) {
        throw new Error(data.error || '이미지를 다시 만들지 못했어요.');
      }

      setGenerated((prev) =>
        prev.map((current) =>
          current.id === item.id && current.visual
            ? { ...current, visual: { ...current.visual, imageUrl: data.imageUrl ?? '' } }
            : current,
        ),
      );
      setNotice('새로운 이미지로 다시 만들었어요.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setNotice(`다시 생성 실패: ${message}`);
    } finally {
      setRegeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const renderImageArea = (item: GeneratedItem, index: number) => {
    const imageUrl = item.visual?.imageUrl;
    const isRegenerating = regeneratingIds.has(item.id);

    return (
      <div className="bg-gray-50 p-4">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white">
          {imageUrl ? (
            <img src={imageUrl} alt={item.description || item.title} className="h-full w-full object-contain" loading="lazy" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center px-4 text-center text-gray-400">
              <ImageIcon className="h-10 w-10" />
              <p className="mt-2 text-sm">이미지 영역</p>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => copyImage(imageUrl)}
            disabled={!imageUrl}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: '#354d3f' }}
          >
            <Copy className="h-4 w-4" />
            복사
          </button>
          <button
            type="button"
            onClick={() => downloadImage(imageUrl, index)}
            disabled={!imageUrl}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: '#354d3f' }}
          >
            <Download className="h-4 w-4" />
            저장
          </button>
          <button
            type="button"
            onClick={() => requestRegenerate(item)}
            disabled={isRegenerating}
            className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm transition-colors disabled:cursor-wait disabled:opacity-60"
            style={{ borderColor: '#354d3f', color: '#354d3f' }}
          >
            <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            {isRegenerating ? '다시 생성 중' : '다시 생성'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <section className="space-y-6 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <ImageIcon className="mt-1 h-6 w-6 flex-shrink-0" style={{ color: '#354d3f' }} />
          <div>
            <h2 className="text-lg font-bold text-gray-900">시각자료 만들기</h2>
            <p className="mt-1 text-sm text-gray-600">문서 내용을 그림 카드로 만들어 아이가 이해하기 쉽게 정리해요.</p>
          </div>
        </div>

        {notice && <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">{notice}</div>}

        <div className="rounded-xl border p-5" style={{ backgroundColor: '#f9f3ef', borderColor: '#e0bda5' }}>
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: '#354d3f' }} />
            <h3 className="font-bold text-gray-900">추천 시각자료</h3>
          </div>
          <p className="mb-4 text-sm text-gray-600">문서에서 그림으로 보여주면 좋은 부분을 골라냈어요.</p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {recommendations.map((rec, index) => {
              const key = rec.visual ? `${rec.visual.cardType}:${rec.visual.target}` : `manual:${rec.type}`;
              const alreadyMade = generatedKeys.has(key);
              return (
                <div key={`${key}-${index}`} className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="font-semibold text-gray-900">{rec.title}</p>
                  <p className="mb-3 mt-1 text-sm text-gray-600">{rec.description}</p>
                  <button
                    type="button"
                    onClick={() => handleRecommendClick(rec)}
                    disabled={alreadyMade}
                    className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ backgroundColor: '#354d3f' }}
                  >
                    <Wand2 className="h-4 w-4" />
                    {alreadyMade ? '이미 만들었어요' : '이미지 만들기'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="mb-1 font-bold text-gray-900">직접 선택하기</h3>
          <p className="mb-4 text-sm text-gray-600">원하는 시각자료 유형을 직접 골라 만들 수 있어요.</p>

          <div className="space-y-2">
            {ALL_TYPES.map((item) => {
              const isChecked = selected.has(item.type);
              const isInfoOpen = openInfo === item.type;
              const isMade = manualMadeTypes.has(item.type);
              return (
                <div key={item.type} className="rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 p-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 flex-shrink-0"
                      style={{ accentColor: '#354d3f' }}
                      checked={isChecked}
                      disabled={isMade}
                      onChange={() => toggle(item.type)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold ${isMade ? 'text-gray-400' : 'text-gray-900'}`}>{item.title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenInfo(isInfoOpen ? null : item.type)}
                      className="rounded-full p-1 transition-colors hover:bg-gray-100"
                      aria-label={`${item.title} 설명 보기`}
                    >
                      <Info className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                  {isInfoOpen && (
                    <div className="px-4 pb-4 pl-10">
                      <div className="rounded-md p-3 text-sm leading-relaxed" style={{ backgroundColor: '#f9f3ef', color: '#354d3f' }}>
                        <p className="mb-1 font-medium">{item.short}</p>
                        <p className="text-gray-700">{item.detail}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSelectedClick}
              disabled={selected.size === 0}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: '#354d3f' }}
            >
              <Wand2 className="h-4 w-4" />
              선택한 이미지 만들기
            </button>
          </div>
        </div>

        {pending.length > 0 && (
          <div className="space-y-4">
            {pending.map((type) => {
              const meta = ALL_TYPES.find((item) => item.type === type);
              if (!meta) return null;

              const choice = pendingChoice[type] || { mode: 'easy', custom: '' };
              const isValid =
                (choice.mode === 'original' && Boolean((choice.portion || originalText).trim())) ||
                (choice.mode === 'easy' && Boolean((choice.portion || easyText).trim())) ||
                (choice.mode === 'custom' && Boolean(choice.custom.trim()));

              return (
                <div key={type} className="rounded-lg border-2 p-4" style={{ borderColor: '#82987f', backgroundColor: '#f9f3ef' }}>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-bold text-gray-900">{meta.title} 내용 선택하기</h4>
                    <button
                      type="button"
                      onClick={() => setPending((prev) => prev.filter((item) => item !== type))}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      취소
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {(['easy', 'original'] as const).map((mode) => {
                      const text = mode === 'easy' ? easyText : originalText;
                      const selectedMode = choice.mode === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setChoiceMode(type, mode)}
                          className="rounded-lg bg-white p-3 text-left"
                          style={selectedMode ? { borderColor: '#354d3f', borderWidth: 2 } : { borderColor: '#e5e7eb', borderWidth: 1 }}
                        >
                          <p className="text-sm font-semibold text-gray-900">{mode === 'easy' ? '쉬운글에서 선택' : '원문에서 선택'}</p>
                          <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm text-gray-700">{text || '내용이 없어요'}</p>
                        </button>
                      );
                    })}
                  </div>

                  <label
                    onClick={() => setChoiceMode(type, 'custom')}
                    className="mt-3 block rounded-lg bg-white p-3"
                    style={choice.mode === 'custom' ? { borderColor: '#354d3f', borderWidth: 2 } : { borderColor: '#e5e7eb', borderWidth: 1 }}
                  >
                    <p className="mb-2 text-sm font-semibold text-gray-900">직접 입력하기</p>
                    <textarea
                      value={choice.custom}
                      onChange={(event) =>
                        setPendingChoice((prev) => ({
                          ...prev,
                          [type]: { ...(prev[type] || { custom: '' }), mode: 'custom', custom: event.target.value },
                        }))
                      }
                      placeholder="그림으로 만들 내용을 입력해주세요."
                      className="min-h-[64px] w-full resize-none rounded-md border border-gray-200 p-2 text-sm focus:outline-none"
                    />
                  </label>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => confirmPending(type)}
                      disabled={!isValid}
                      className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ backgroundColor: '#354d3f' }}
                    >
                      <Wand2 className="h-4 w-4" />
                      이미지 만들기
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {generated.length > 0 && (
        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 font-bold text-gray-900">생성된 이미지</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {generated.map((item, index) => (
              <article key={item.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="border-b border-gray-100 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                </div>
                {renderImageArea(item, index)}
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
