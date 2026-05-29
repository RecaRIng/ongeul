import { useState } from 'react';
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

export default function EasyText({ content, easierContent, detailedContent, words, savedWords, onSaveWord }: EasyTextProps) {
  const [difficulty, setDifficulty] = useState<'easier' | 'basic' | 'detailed'>('basic');

  const difficulties = [
    { id: 'easier', label: '더 쉽게' },
    { id: 'basic', label: '기본' },
    { id: 'detailed', label: '더 어렵게' }
  ];

  // 단어를 WordTooltip 컴포넌트로 변환하고 굵은 글씨 처리
  const renderTextWithTooltips = (text: string) => {
    // 먼저 **텍스트** 형식을 찾아서 임시 마커로 변환
    const boldPattern = /\*\*([^*]+)\*\*/g;
    const boldMatches: Array<{ text: string; index: number; length: number }> = [];
    let match;

    while ((match = boldPattern.exec(text)) !== null) {
      boldMatches.push({
        text: match[1],
        index: match.index,
        length: match[0].length
      });
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let partKey = 0;

    // 텍스트를 순회하며 굵은 글씨와 단어 툴팁 처리
    const processSegment = (segment: string, startOffset: number, isBold: boolean = false) => {
      const segmentParts: React.ReactNode[] = [];
      let segmentLastIndex = 0;

      // 단어를 찾아서 치환
      words.forEach((wordData) => {
        let searchStart = 0;
        while (true) {
          const index = segment.indexOf(wordData.word, searchStart);
          if (index === -1) break;

          // 앞부분 텍스트 추가
          if (index > segmentLastIndex) {
            const textPart = segment.substring(segmentLastIndex, index);
            segmentParts.push(
              isBold ? <strong key={`bold-${partKey++}`}>{textPart}</strong> : textPart
            );
          }

          // WordTooltip 추가
          segmentParts.push(
            <WordTooltip
              key={`word-${partKey++}`}
              word={wordData.word}
              meaning={wordData.meaning}
              examples={wordData.examples}
              onSave={onSaveWord}
              isSaved={savedWords.has(wordData.word)}
            />
          );

          segmentLastIndex = index + wordData.word.length;
          searchStart = segmentLastIndex;
          break; // 한 번만 치환
        }
      });

      // 남은 텍스트 추가
      if (segmentLastIndex < segment.length) {
        const textPart = segment.substring(segmentLastIndex);
        segmentParts.push(
          isBold ? <strong key={`bold-${partKey++}`}>{textPart}</strong> : textPart
        );
      }

      return segmentParts.length > 0 ? segmentParts : (isBold ? <strong key={`bold-${partKey++}`}>{segment}</strong> : segment);
    };

    // boldMatches를 포함하여 텍스트 처리
    boldMatches.forEach((boldMatch) => {
      // 굵은 글씨 앞부분 처리
      if (boldMatch.index > lastIndex) {
        const normalText = text.substring(lastIndex, boldMatch.index);
        parts.push(...(Array.isArray(processSegment(normalText, lastIndex)) ? processSegment(normalText, lastIndex) : [processSegment(normalText, lastIndex)]));
      }

      // 굵은 글씨 부분 처리
      parts.push(...(Array.isArray(processSegment(boldMatch.text, boldMatch.index, true)) ? processSegment(boldMatch.text, boldMatch.index, true) : [processSegment(boldMatch.text, boldMatch.index, true)]));

      lastIndex = boldMatch.index + boldMatch.length;
    });

    // 남은 텍스트 추가
    if (lastIndex < text.length) {
      const normalText = text.substring(lastIndex);
      parts.push(...(Array.isArray(processSegment(normalText, lastIndex)) ? processSegment(normalText, lastIndex) : [processSegment(normalText, lastIndex)]));
    }

    return parts.length > 0 ? parts : text;
  };

  const getDifficultyContent = () => {
    switch (difficulty) {
      case 'easier':
        return easierContent || content;
      case 'detailed':
        return detailedContent || content;
      default:
        return content;
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-6 bg-gray-50 rounded-xl leading-relaxed text-gray-900 relative">
        {getDifficultyContent().split('\n').map((line, idx) => {
          // 빈 줄이면 문단 구분을 위한 공백
          if (line.trim() === '') {
            return <div key={idx} className="h-3" />;
          }
          return (
            <p key={idx} className="mb-1">
              {renderTextWithTooltips(line)}
            </p>
          );
        })}

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
          <span className="text-xs text-gray-600 mr-2 self-center">난이도 조절</span>
          {difficulties.map((d) => (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id as any)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                difficulty === d.id
                  ? 'text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
              style={difficulty === d.id ? { backgroundColor: '#354d3f' } : {}}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
