import { useState } from 'react';
import { BookmarkPlus, BookmarkCheck } from 'lucide-react';

interface WordTooltipProps {
  word: string;
  meaning: string;
  examples: string[];
  onSave: (word: string, meaning: string, examples: string[]) => void;
  isSaved: boolean;
}

export default function WordTooltip({ word, meaning, examples, onSave, isSaved }: WordTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="underline decoration-dotted cursor-pointer"
        style={{ color: '#354d3f' }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#2a3d32'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#354d3f'}
      >
        {word}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-2 w-80 p-4 bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="font-bold text-gray-900 mb-2">{word}</div>
            <div className="text-sm text-gray-700 mb-3">
              <span className="font-semibold">뜻:</span> {meaning}
            </div>
            <div className="text-sm space-y-2 mb-3">
              <div className="font-semibold text-gray-900">예문:</div>
              {examples.map((example, idx) => (
                <div key={idx} className="text-gray-700 pl-2 border-l-2" style={{ borderColor: '#82987f' }}>
                  {example}
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                onSave(word, meaning, examples);
                setIsOpen(false);
              }}
              className={`w-full py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors border`}
              style={
                isSaved
                  ? { backgroundColor: '#f9f3ef', color: '#354d3f', borderColor: '#e0bda5' }
                  : { backgroundColor: '#f9f3ef', color: '#354d3f', borderColor: '#82987f' }
              }
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="w-4 h-4" />
                  단어장에 저장됨
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-4 h-4" />
                  단어장에 저장
                </>
              )}
            </button>
          </div>
        </>
      )}
    </span>
  );
}
