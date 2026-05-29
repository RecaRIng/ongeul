import { useState, useEffect } from 'react';
import { BookMarked } from 'lucide-react';
import OngleHeader from './components/OngleHeader';
import InputArea from './components/InputArea';
import ResultView from './components/ResultView';
import Vocabulary from './components/Vocabulary';
import ChildView from './components/ChildView';
import ActivityView from './components/ActivityView';
import VisualView from './components/VisualView';
import faviconUrl from '../imports/__.png';

interface VocabularyWord {
  word: string;
  meaning: string;
  examples: string[];
}

export default function App() {
  useEffect(() => {
    const head = document.head;
    head.querySelectorAll("link[rel*='icon']").forEach(el => el.parentNode?.removeChild(el));
    const href = `${faviconUrl}?v=${Date.now()}`;
    (['icon', 'shortcut icon', 'apple-touch-icon'] as const).forEach(rel => {
      const link = document.createElement('link');
      link.rel = rel;
      link.type = 'image/png';
      link.href = href;
      head.appendChild(link);
    });
    document.title = '온글';
  }, []);

  const [result, setResult] = useState<any>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [vocabularyWords, setVocabularyWords] = useState<VocabularyWord[]>([]);
  const [isVocabOpen, setIsVocabOpen] = useState(false);
  const [isChildView, setIsChildView] = useState(false);
  const [isActivityView, setIsActivityView] = useState(false);
  const [isVisualView, setIsVisualView] = useState(false);

  const handleSubmit = (text: string, types: string[]) => {
    // 실제로는 AI API를 호출하겠지만, 여기서는 목업 데이터 생성
    // 타입이 여러 개면 첫 번째를 사용, 없으면 execution 기본값
    const primaryType = types.length > 0 ? types[0] : 'execution';
    const mockResult = generateMockResult(text, primaryType);
    mockResult.originalText = mockResult.originalText || text;
    setResult(mockResult);
  };

  const handleSaveWord = (word: string, meaning: string, examples: string[]) => {
    if (!savedWords.has(word)) {
      setSavedWords(new Set([...savedWords, word]));
      setVocabularyWords([...vocabularyWords, { word, meaning, examples }]);
    }
  };

  const handleRemoveWord = (word: string) => {
    const newSaved = new Set(savedWords);
    newSaved.delete(word);
    setSavedWords(newSaved);
    setVocabularyWords(vocabularyWords.filter(w => w.word !== word));
  };

  if (isVisualView && result) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <OngleHeader />
        <main className="flex-1 overflow-y-auto pb-20">
          <VisualView
            onBack={() => setIsVisualView(false)}
            originalText={result.originalText}
            easyText={result.easyText}
          />
        </main>
      </div>
    );
  }

  if (isActivityView && result) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <OngleHeader />
        <main className="flex-1 overflow-y-auto pb-20">
          <ActivityView
            activities={result.activities}
            onBack={() => setIsActivityView(false)}
          />
        </main>
      </div>
    );
  }

  if (isChildView && result) {
    return (
      <ChildView
        content={result.easyText}
        originalText={result.originalText || '원문이 없습니다.'}
        words={result.words}
        savedWords={savedWords}
        activities={result.activities}
        onSaveWord={handleSaveWord}
        onClose={() => setIsChildView(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <OngleHeader />

      <main className="flex-1 overflow-y-auto pb-20">
        {!result ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <InputArea onSubmit={handleSubmit} />
          </div>
        ) : (
          <>
            <ResultView
              data={result}
              savedWords={savedWords}
              onSaveWord={handleSaveWord}
              onShowChildView={() => setIsChildView(true)}
              onShowActivities={() => setIsActivityView(true)}
              onShowVisuals={() => setIsVisualView(true)}
            />
            <div className="max-w-5xl mx-auto px-4 mt-6">
              <button
                onClick={() => setResult(null)}
                className="w-full py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
              >
                새 문서 분석하기
              </button>
            </div>
          </>
        )}
      </main>

      {/* 단어장 버튼 */}
      <button
        onClick={() => setIsVocabOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 text-white rounded-full shadow-lg transition-all flex items-center justify-center group"
        style={{ backgroundColor: '#354d3f' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a3d32'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#354d3f'}
      >
        <BookMarked className="w-6 h-6" />
        {vocabularyWords.length > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {vocabularyWords.length}
          </span>
        )}
      </button>

      <Vocabulary
        words={vocabularyWords}
        isOpen={isVocabOpen}
        onClose={() => setIsVocabOpen(false)}
        onRemove={handleRemoveWord}
      />
    </div>
  );
}

// 목업 데이터 생성 함수
function generateMockResult(text: string, type: string) {
  const baseWords = [
    { word: '지참', meaning: '필요한 물건을 가지고 오는 것이에요.', examples: ['내일 미술 시간에 색연필을 지참해요. → 내일 색연필을 가지고 와요.', '체험학습 날에는 물통을 지참해요. → 체험학습 날에는 물통을 가져가요.'] },
    { word: '제출', meaning: '다 한 종이나 숙제를 선생님께 내는 것이에요.', examples: ['숙제를 제출해요. → 숙제를 선생님께 내요.', '신청서를 제출해요. → 신청서를 선생님께 드려요.'] },
    { word: '집합', meaning: '정해진 시간에 정해진 장소에 모이는 것이에요.', examples: ['아침 8시에 교문 앞에 집합해요. → 아침 8시에 교문 앞에 모여요.'] },
    { word: '참가', meaning: '활동이나 행사에 함께하는 것이에요.', examples: ['현장학습에 참가해요. → 현장학습에 같이 가요.'] },
    { word: '신청서', meaning: '무언가를 하고 싶다고 신청하는 종이예요.', examples: ['체험학습 신청서를 써요. → 체험학습에 가고 싶다는 종이를 써요.'] },
    { word: '현장체험학습', meaning: '학교 밖에 나가서 직접 보고 배우는 활동이에요.', examples: ['현장체험학습으로 박물관에 가요. → 학교 밖 박물관에 가서 배워요.'] },
    { word: '담임선생님', meaning: '우리 반을 담당하시는 선생님이에요.', examples: ['담임선생님께 알림장을 보여드려요.'] }
  ];

  if (type === 'execution') {
    return {
      guideSummary: '**문서 유형:** 현장체험학습 안내문\n\n**핵심 정보:**\n- **일정:** 5월 10일 금요일\n- **집합:** 오전 8시 30분까지, 학교 교문 앞\n- **준비물:** 도시락, 물, 운동화\n- **제출:** 참가 신청서\n- **기한:** 5월 3일 금요일까지\n- **제출처:** 담임선생님',
      originalText: `2026학년도 1학기 현장체험학습 실시 안내

본교에서는 학생들의 다양한 체험 기회 제공 및 교육과정과 연계한 현장 학습을 위하여 아래와 같이 현장체험학습을 실시하고자 합니다.

참가를 희망하는 학생은 안내문 하단의 참가 신청서를 작성하여 5월 3일 금요일까지 담임교사에게 제출해 주시기 바랍니다.

현장체험학습 당일 학생들은 5월 10일 금요일 오전 8시 30분까지 학교 교문 앞에 집합해야 하며, 정해진 시간 이후 도착할 경우 안전한 인솔에 어려움이 있을 수 있으므로 시간을 반드시 지켜 주시기 바랍니다.

학생 개인 준비물로는 도시락, 물, 운동화가 필요하며, 활동 중 이동이 많을 예정이므로 편안한 복장을 착용할 수 있도록 가정에서도 협조 부탁드립니다.

기타 세부 일정 및 유의사항은 추후 담임교사를 통해 다시 안내드릴 예정입니다.`,
      easyText: `**5월 10일 금요일**에는 **현장체험학습**을 가요.
**아침 8시 30분까지** **학교 교문 앞**에 모여요.

가져가야 할 것은 **도시락, 물, 운동화**예요.
많이 걸을 수 있으니 **편한 옷**을 입는 것이 좋아요.

체험학습에 가려면 **참가 신청서**를 내야 해요.
참가 신청서는 **5월 3일 금요일까지** **담임선생님께** 내요.`,
      easierText: `**5월 10일**에 밖으로 공부하러 가요.
**아침 8시 30분까지** 학교 앞에 와요.

가방에는:
- **도시락**
- **물**
- **운동화**
를 넣어요.

많이 걸어요.
**편한 옷**을 입어요.

가려면 **신청서**를 내야 해요.
신청서는 **5월 3일까지** 선생님께 내요.`,
      detailedText: `**5월 10일 금요일**에는 학교에서 진행하는 **현장체험학습**이 있습니다.
학생들은 당일 **아침 8시 30분까지 학교 교문 앞**에 도착해야 하며, 늦지 않도록 미리 준비하는 것이 중요합니다.

체험학습에서는 이동과 야외 활동이 포함되어 있어 오래 걸을 수 있습니다.
따라서 활동하기 편한 **운동화**와 **편한 옷차림**을 준비하는 것이 좋습니다.

또한 점심시간에 먹을 **도시락**과 마실 **물**도 꼭 챙겨야 합니다.
준비물을 빠뜨리지 않도록 전날 미리 확인하는 것이 좋습니다.

현장체험학습에 참여하려면 반드시 **참가 신청서**를 제출해야 합니다.
신청서는 **5월 3일 금요일까지 담임선생님께** 제출하면 됩니다.
신청서를 제출하지 않으면 체험학습에 참여하기 어려울 수 있으니 제출 날짜를 꼭 확인해야 합니다.`,
      words: baseWords,
      activities: [
        {
          type: 'checklist',
          title: '준비·제출 체크리스트',
          description: '체험학습 전에 꼭 확인해야 할 일을 체크해요.',
          items: [
            '참가 신청서를 썼어요.',
            '참가 신청서를 5월 3일까지 냈어요.',
            '도시락을 준비했어요.',
            '물을 준비했어요.',
            '운동화를 준비했어요.',
            '5월 10일 오전 8시 30분까지 교문 앞에 가요.'
          ]
        },
        {
          type: 'matching',
          title: '카드 선 잇기',
          description: '중요한 정보와 내용을 알맞게 연결해요.',
          leftCards: [
            '체험학습 가는 날',
            '모이는 시간',
            '모이는 장소',
            '준비물',
            '제출할 것',
            '제출 기한',
            '제출할 곳'
          ],
          rightCards: [
            '5월 10일 금요일',
            '오전 8시 30분',
            '학교 교문 앞',
            '도시락, 물, 운동화',
            '참가 신청서',
            '5월 3일 금요일',
            '담임선생님'
          ]
        },
        {
          type: 'questions',
          title: '확인 질문',
          description: '문서 내용을 잘 이해했는지 질문으로 확인해요.',
          items: [
            '현장체험학습은 언제 가나요?',
            '아침 몇 시까지 모여야 하나요?',
            '어디에 모여야 하나요?',
            '무엇을 가져가야 하나요?',
            '참가 신청서는 언제까지 내야 하나요?'
          ],
          answers: [
            '5월 10일 금요일',
            '오전 8시 30분까지',
            '학교 교문 앞',
            '도시락, 물, 운동화',
            '5월 3일 금요일까지'
          ]
        }
      ]
    };
  } else if (type === 'submission') {
    return {
      guideSummary: '**문서 유형:** 현장체험학습 안내문\n\n**핵심 정보:**\n- **일정:** 5월 10일 금요일\n- **집합:** 오전 8시 30분까지, 학교 교문 앞\n- **준비물:** 도시락, 물, 운동화\n- **제출:** 참가 신청서\n- **기한:** 5월 3일 금요일까지\n- **제출처:** 담임선생님',
      originalText: `2026학년도 1학기 현장체험학습 실시 안내

본교에서는 학생들의 다양한 체험 기회 제공 및 교육과정과 연계한 현장 학습을 위하여 아래와 같이 현장체험학습을 실시하고자 합니다.

참가를 희망하는 학생은 안내문 하단의 참가 신청서를 작성하여 5월 3일 금요일까지 담임교사에게 제출해 주시기 바랍니다.

현장체험학습 당일 학생들은 5월 10일 금요일 오전 8시 30분까지 학교 교문 앞에 집합해야 하며, 정해진 시간 이후 도착할 경우 안전한 인솔에 어려움이 있을 수 있으므로 시간을 반드시 지켜 주시기 바랍니다.

학생 개인 준비물로는 도시락, 물, 운동화가 필요하며, 활동 중 이동이 많을 예정이므로 편안한 복장을 착용할 수 있도록 가정에서도 협조 부탁드립니다.

기타 세부 일정 및 유의사항은 추후 담임교사를 통해 다시 안내드릴 예정입니다.`,
      easyText: `**체험학습 신청서**를 작성해서 선생님께 내야 해요.

신청서에는 **이름, 참가 여부, 보호자 서명**이 필요해요.

**5월 3일까지** **담임선생님께** 제출해요.`,
      words: baseWords,
      activities: [
        {
          type: 'checklist',
          title: '제출 전 확인',
          items: [
            '이름을 썼나요?',
            '참가 여부를 골랐나요?',
            '보호자 서명이 있나요?',
            '담임선생님께 내야 하는 것을 알고 있나요?'
          ]
        },
        {
          type: 'questions',
          title: '아이에게 물어보기',
          items: [
            '이 종이는 누구에게 내야 하나요?',
            '언제까지 내야 하나요?'
          ],
          answers: [
            '담임선생님',
            '5월 3일'
          ]
        }
      ]
    };
  } else {
    return {
      guideSummary: '**문서 유형:** 현장체험학습 안내문\n\n**핵심 정보:**\n- **일정:** 5월 10일 금요일\n- **집합:** 오전 8시 30분까지, 학교 교문 앞\n- **준비물:** 도시락, 물, 운동화\n- **제출:** 참가 신청서\n- **기한:** 5월 3일 금요일까지\n- **제출처:** 담임선생님',
      originalText: `2026학년도 1학기 현장체험학습 실시 안내

본교에서는 학생들의 다양한 체험 기회 제공 및 교육과정과 연계한 현장 학습을 위하여 아래와 같이 현장체험학습을 실시하고자 합니다.

참가를 희망하는 학생은 안내문 하단의 참가 신청서를 작성하여 5월 3일 금요일까지 담임교사에게 제출해 주시기 바랍니다.

현장체험학습 당일 학생들은 5월 10일 금요일 오전 8시 30분까지 학교 교문 앞에 집합해야 하며, 정해진 시간 이후 도착할 경우 안전한 인솔에 어려움이 있을 수 있으므로 시간을 반드시 지켜 주시기 바랍니다.

학생 개인 준비물로는 도시락, 물, 운동화가 필요하며, 활동 중 이동이 많을 예정이므로 편안한 복장을 착용할 수 있도록 가정에서도 협조 부탁드립니다.

기타 세부 일정 및 유의사항은 추후 담임교사를 통해 다시 안내드릴 예정입니다.`,
      easyText: `**독서록**을 작성해야 해요.

**책 제목**을 먼저 써요.
그다음 **기억에 남는 장면**을 골라요.
왜 그 장면이 기억에 남았는지 생각해봐요.

**한 문장**으로 써봐요.`,
      words: baseWords,
      activities: [
        {
          type: 'steps',
          title: '과제 단계',
          items: [
            '책 제목 쓰기',
            '기억나는 장면 고르기',
            '왜 기억나는지 말하기',
            '한 문장으로 쓰기'
          ]
        },
        {
          type: 'questions',
          title: '아이에게 물어보기',
          items: [
            '먼저 무엇을 써야 하나요?',
            '기억에 남는 장면을 어떻게 하나요?'
          ],
          answers: [
            '책 제목',
            '기억에 남는 장면을 골라요'
          ]
        }
      ]
    };
  }
}
