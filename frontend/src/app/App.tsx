import { useEffect, useState } from 'react';
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

interface DifficultWord {
  word: string;
  grade: string;
  definition: string;
}

interface EasyTextLevel {
  text: string;
  difficultWords: DifficultWord[];
}

interface BackendAnalysis {
  document: {
    rawText: string;
    documentType: string;
    title: string;
  };
  coreFields: {
    date: string;
    time: string;
    place: string;
    materials: string[];
    deadline: string;
    submissionTarget: string;
    actions: string[];
    warnings: string[];
  };
  easyText: {
    level1: EasyTextLevel;
    level2: EasyTextLevel;
    level3: EasyTextLevel;
  };
  actionSteps: Array<{
    step: number;
    action: string;
    reason: string;
    visualTarget: string;
  }>;
  activityMaterials: {
    checklist: string[];
    questions: string[];
    matchingCardIdeas: string[];
    coachingGuide: string;
  };
}

function getImageFormat(file: File): 'png' | 'jpg' | 'jpeg' {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'png' || extension === 'jpg' || extension === 'jpeg') return extension;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/jpeg') return 'jpg';
  throw new Error('jpg, jpeg, png 이미지만 업로드할 수 있습니다.');
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('이미지를 읽지 못했습니다.'));
      }
    };
    reader.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  useEffect(() => {
    const head = document.head;
    head.querySelectorAll("link[rel*='icon']").forEach((el) => el.parentNode?.removeChild(el));
    const href = `${faviconUrl}?v=${Date.now()}`;

    (['icon', 'shortcut icon', 'apple-touch-icon'] as const).forEach((rel) => {
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
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mapBackendResponse = (analysis: BackendAnalysis) => {
    const summaryLines = [
      `문서 유형: ${analysis.document.documentType}`,
      `제목: ${analysis.document.title}`,
      analysis.coreFields.date ? `- 날짜: ${analysis.coreFields.date}` : '',
      analysis.coreFields.time ? `- 시간: ${analysis.coreFields.time}` : '',
      analysis.coreFields.place ? `- 장소: ${analysis.coreFields.place}` : '',
      analysis.coreFields.materials.length ? `- 준비물: ${analysis.coreFields.materials.join(', ')}` : '',
      analysis.coreFields.deadline ? `- 제출기한: ${analysis.coreFields.deadline}` : '',
      analysis.coreFields.submissionTarget ? `- 제출처: ${analysis.coreFields.submissionTarget}` : ''
    ].filter(Boolean);

    const activities: Array<any> = [];

    if (analysis.activityMaterials.checklist.length) {
      activities.push({ type: 'checklist', title: '체크리스트', items: analysis.activityMaterials.checklist });
    }

    if (analysis.activityMaterials.questions.length) {
      activities.push({ type: 'questions', title: '확인 질문', items: analysis.activityMaterials.questions, answers: [] });
    }

    if (analysis.activityMaterials.matchingCardIdeas.length) {
      const ideas = analysis.activityMaterials.matchingCardIdeas;
      const half = Math.ceil(ideas.length / 2);
      activities.push({ type: 'matching', title: '카드 선잇기 활동', leftCards: ideas.slice(0, half), rightCards: ideas.slice(half), items: [] });
    }

    if (analysis.actionSteps.length) {
      activities.push({ type: 'steps', title: '행동 단계', items: analysis.actionSteps.map((step) => `${step.step}. ${step.action}`) });
    }

    return {
      guideSummary: summaryLines.join('\n'),
      easyText: analysis.easyText.level2.text || '',
      easierText: analysis.easyText.level1.text,
      detailedText: analysis.easyText.level3.text,
      originalText: analysis.document.rawText,
      words: [],
      activities
    };
  };

  const submitAnalysis = async (url: string, body: unknown) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'API 호출에 실패했습니다.');
      }

      const analysis = (await response.json()) as BackendAnalysis;
      setResult(mapBackendResponse(analysis));
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : '문서 분석 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (text: string, _types: string[]) => {
    void submitAnalysis('/api/analyze/text', { text });
  };

  const handleImageSubmit = async (file: File, _types: string[]) => {
    try {
      const imageBase64 = await readFileAsDataUrl(file);
      await submitAnalysis('/api/analyze/image', {
        imageBase64,
        imageFormat: getImageFormat(file),
        fileName: file.name,
        title: file.name
      });
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : '이미지 업로드 중 오류가 발생했습니다.');
    }
  };

  const handleSaveWord = (word: string, meaning: string, examples: string[]) => {
    if (!savedWords.has(word)) {
      setSavedWords(new Set([...savedWords, word]));
      setVocabularyWords([...vocabularyWords, { word, meaning, examples }]);
    }
  };

  const handleRemoveWord = (word: string) => {
    const nextSavedWords = new Set(savedWords);
    nextSavedWords.delete(word);
    setSavedWords(nextSavedWords);
    setVocabularyWords(vocabularyWords.filter((item) => item.word !== word));
  };

  if (isVisualView && result) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <OngleHeader />
        <main className="flex-1 overflow-y-auto pb-20">
          <VisualView onBack={() => setIsVisualView(false)} originalText={result.originalText} easyText={result.easyText} />
        </main>
      </div>
    );
  }

  if (isActivityView && result) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <OngleHeader />
        <main className="flex-1 overflow-y-auto pb-20">
          <ActivityView activities={result.activities} onBack={() => setIsActivityView(false)} />
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
        {errorMessage && (
          <div className="max-w-5xl mx-auto px-4 py-4 text-sm text-white bg-red-500 rounded-xl mt-4">
            {errorMessage}
          </div>
        )}
        {isLoading && (
          <div className="max-w-5xl mx-auto px-4 py-4 text-sm text-gray-700 bg-yellow-100 rounded-xl mt-4">
            문서를 분석하는 중입니다. 잠시만 기다려 주세요.
          </div>
        )}
        {!result ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <InputArea onSubmit={handleSubmit} onImageSubmit={handleImageSubmit} disabled={isLoading} />
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

      <button
        onClick={() => setIsVocabOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 text-white rounded-full shadow-lg transition-all flex items-center justify-center group"
        style={{ backgroundColor: '#354d3f' }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2a3d32'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#354d3f'; }}
      >
        <BookMarked className="w-6 h-6" />
        {vocabularyWords.length > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {vocabularyWords.length}
          </span>
        )}
      </button>

      <Vocabulary words={vocabularyWords} isOpen={isVocabOpen} onClose={() => setIsVocabOpen(false)} onRemove={handleRemoveWord} />
    </div>
  );
}
