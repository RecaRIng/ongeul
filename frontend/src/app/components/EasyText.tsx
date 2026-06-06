import { useMemo, useState } from 'react';
import WordTooltip from './WordTooltip';

interface Word {
  word: string;
  meaning: string;
  examples: string[];
}

interface EasyTextProps {
  content: string;
  easierContent?: string;
  detailedContent?: string;
  words: Word[];
  savedWords: Set<string>;
  onSaveWord: (word: string, meaning: string, examples: string[]) => void;
}

type Difficulty = 'easier' | 'basic' | 'detailed';

const difficulties: Array<{ id: Difficulty; label: string }> = [
  { id: 'easier', label: '아주 쉽게' },
  { id: 'basic', label: '기본' },
  { id: 'detailed', label: '조금 자세히' }
];

function splitReadableBlocks(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .flatMap((block) => {
      const trimmed = block.trim();
      if (!trimmed) return [];
      return trimmed.includes('\n') ? trimmed.split(/\n/).map((line) => line.trim()).filter(Boolean) : [trimmed];
    })
    .filter(Boolean);
}

export default function EasyText({ content, easierContent, detailedContent, words, savedWords, onSaveWord }: EasyTextProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('basic');

  const selectedContent = useMemo(() => {
    if (difficulty === 'easier') return easierContent || content;
    if (difficulty === 'detailed') return detailedContent || content;
    return content;
  }, [content, detailedContent, difficulty, easierContent]);

  const blocks = splitReadableBlocks(selectedContent);

  const renderTextWithTooltips = (text: string) => {
    const parts: React.ReactNode[] = [];
    let cursor = 0;

    const matches = words
      .map((wordData) => ({ wordData, index: text.indexOf(wordData.word) }))
      .filter((match) => match.index >= 0)
      .sort((a, b) => a.index - b.index);

    matches.forEach(({ wordData, index }, idx) => {
      if (index < cursor) return;
      if (index > cursor) parts.push(text.slice(cursor, index));
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
      cursor = index + wordData.word.length;
    });

    if (cursor < text.length) parts.push(text.slice(cursor));
    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {difficulties.map((item) => (
          <button
            key={item.id}
            onClick={() => setDifficulty(item.id)}
            className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
              difficulty === item.id ? 'text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
            }`}
            style={difficulty === item.id ? { backgroundColor: '#354d3f', borderColor: '#354d3f' } : undefined}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-gray-50 p-4 sm:p-5 space-y-3">
        {blocks.length === 0 ? (
          <p className="text-gray-500">쉬운글 결과가 없습니다.</p>
        ) : (
          blocks.map((block, index) => (
            <div key={`${block}-${index}`} className="flex gap-3 rounded-lg bg-white border border-gray-200 p-4">
              <span
                className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: '#354d3f' }}
              >
                {index + 1}
              </span>
              <p className="min-w-0 flex-1 text-[17px] leading-8 text-gray-900 break-keep">
                {renderTextWithTooltips(block)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
