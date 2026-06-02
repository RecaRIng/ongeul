import fs from 'fs';
import path from 'path';

const VOCAB_PATH = path.join(__dirname, 'data', 'vocab.json');

export interface DictionaryResult {
  word: string;
  grade: string;
  definition: string;
  needsExplanation: boolean;
}

interface VocabEntry {
  grade: string;
  definition: string;
}

const vocabMap: Record<string, VocabEntry> = JSON.parse(fs.readFileSync(VOCAB_PATH, 'utf-8'));

const SUFFIXES = [
  '이었습니다', '이었어요', '습니다', '입니다', '있습니다', '없습니다',
  '해야해요', '해야 해요', '해요', '하세요', '합니다', '했어요',
  '이에요', '예요', '이고', '이며', '이랑', '이나',
  '에서는', '에서도', '으로는', '으로도', '에서', '에게', '으로', '까지', '부터',
  '을까요', '할까요',
  '을', '를', '이', '가', '은', '는', '의', '에', '로', '과', '와', '도', '만',
];

function findBaseWord(word: string): string | null {
  if (vocabMap[word]) return word;

  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix)) {
      const base = word.slice(0, word.length - suffix.length);
      if (base.length >= 2 && vocabMap[base]) return base;
    }
  }
  return null;
}

function needsExplanation(grade: string): boolean {
  return ['3', '4', '5'].includes(grade);
}

async function fetchKrdictDefinition(word: string): Promise<string | null> {
  const apiKey = process.env.KRDICT_API_KEY;
  if (!apiKey) return null;

  const url = `https://krdict.korean.go.kr/api/search?key=${apiKey}&q=${encodeURIComponent(word)}&sort=popular&part=word&num=1`;
  const res = await fetch(url);
  const xml = await res.text();

  const match = xml.match(/<definition>([\s\S]*?)<\/definition>/);
  return match ? match[1].trim() : null;
}

export async function explainWord(word: string): Promise<DictionaryResult | null> {
  const baseWord = findBaseWord(word);

  if (!baseWord || baseWord.length < 2) return null;

  const entry = vocabMap[baseWord];
  if (!entry) return null;

  const explain = needsExplanation(entry.grade);
  if (!explain) return { word: baseWord, grade: entry.grade, definition: '', needsExplanation: false };

  let definition = entry.definition;
  try {
    const apiDef = await fetchKrdictDefinition(baseWord);
    if (apiDef) definition = apiDef;
  } catch {
    // API 실패 시 vocab.json 뜻풀이 사용
  }

  return { word: baseWord, grade: entry.grade, definition, needsExplanation: true };
}