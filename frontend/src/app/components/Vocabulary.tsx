import { X, BookMarked } from 'lucide-react';

interface VocabularyWord {
  word: string;
  meaning: string;
  examples: string[];
}

interface VocabularyProps {
  words: VocabularyWord[];
  isOpen: boolean;
  onClose: () => void;
  onRemove: (word: string) => void;
}

export default function Vocabulary({ words, isOpen, onClose, onRemove }: VocabularyProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-96 bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5" style={{ color: '#354d3f' }} />
            <h2 className="text-lg font-bold text-gray-900">내 단어장</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {words.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookMarked className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>저장된 단어가 없어요</p>
              <p className="text-sm mt-1">쉬운글에서 단어를 클릭하여 저장해보세요</p>
            </div>
          ) : (
            <div className="space-y-4">
              {words.map((wordData, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 relative">
                  <button
                    onClick={() => onRemove(wordData.word)}
                    className="absolute top-2 right-2 p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                  <div className="font-bold text-gray-900 mb-2 pr-6">{wordData.word}</div>
                  <div className="text-sm text-gray-700 mb-3">
                    <span className="font-semibold">뜻:</span> {wordData.meaning}
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="font-semibold text-gray-900">예문:</div>
                    {wordData.examples.map((example, exIdx) => (
                      <div key={exIdx} className="text-gray-700 pl-2 border-l-2" style={{ borderColor: '#82987f' }}>
                        {example}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
