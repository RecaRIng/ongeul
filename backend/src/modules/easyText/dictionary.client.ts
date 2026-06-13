import type { CoreFields } from '../../common/types.js';

export interface WordClassification {
  word: string;
  grade: string;
  meaning: string;
  example: string;
  displayMode: {
    level1: 'inline' | 'tooltip' | 'none';
    level2: 'tooltip' | 'none';
    level3: 'tooltip' | 'none';
  };
}

const SCHOOL_CORE_TERM_MEANINGS: Record<string, string> = {
  제출: '다 한 숙제나 서류를 선생님께 내는 것이에요.',
  신청서: '무엇을 하고 싶다고 적어서 내는 종이예요.',
  참가: '활동이나 행사에 함께하는 것이에요.',
  준비물: '활동을 하기 전에 미리 챙겨야 하는 물건이에요.',
  마감: '꼭 지켜야 하는 마지막 날짜나 시간이예요.',
  기한: '꼭 지켜야 하는 마지막 날짜나 시간이예요.',
  장소: '활동이나 일이 이루어지는 곳이에요.',
  대상: '안내나 활동에 해당하는 사람이에요.',
  출결: '학교에 왔는지, 빠졌는지, 일찍 갔는지를 확인하는 것이에요.',
  조퇴: '정해진 시간보다 일찍 학교에서 나가는 것이에요.',
  결석: '학교나 수업에 나오지 않는 것이에요.',
  담임: '우리 반을 맡아 돌봐 주시는 선생님이에요.',
  담임교사: '우리 반을 맡아 돌봐 주시는 선생님이에요.',
  보호자: '아이를 돌보고 책임지는 어른이에요.',
  동의서: '해도 된다고 허락하는 내용을 적는 종이예요.',
  집합: '정해진 시간과 장소에 함께 모이는 것이에요.',
  인솔: '선생님이나 어른이 아이들을 데리고 안내하는 것이에요.',
  학부모: '학생의 부모님이나 보호자예요.',
  간담회: '서로 이야기하고 의견을 나누는 자리예요.',
  일시: '날짜와 시간을 함께 말하는 표현이에요.',
  문의: '궁금한 것을 물어보는 것이에요.',
  담당자: '그 일을 맡아서 처리하는 사람이에요.',
  납부: '내야 하는 돈을 내는 것이에요.',
  참가비: '행사나 활동에 함께하기 위해 내는 돈이에요.',
  가정통신문: '학교에서 집으로 보내는 안내문이에요.',
  제출기한: '서류나 숙제를 꼭 내야 하는 마지막 날짜나 시간이예요.',
  신청: '무엇을 하고 싶다고 알리고 부탁하는 것이에요.',
  작성: '글이나 서류를 쓰는 것이에요.',
  서명: '내 이름을 직접 쓰거나 표시하는 것이에요.',
  진로체험: '앞으로 하고 싶은 일이나 직업을 직접 알아보는 활동이에요.',
  프로그램: '정해진 순서에 따라 진행되는 활동이나 계획이에요.',
};

const SCHOOL_CORE_TERMS = Array.from(new Set([
  '출결', '조퇴', '결석', '제출', '신청서', '담임', '담임교사',
  '보호자', '동의서', '참가', '집합', '인솔', '학부모', '간담회',
  '일시', '문의', '담당자', '납부', '참가비', '가정통신문',
  '준비물', '제출기한', '신청', '작성', '서명', '진로체험', '프로그램',
  ...Object.keys(SCHOOL_CORE_TERM_MEANINGS),
]));

const JOSA_AND_ENDINGS = [
  '하시기바랍니다', '하시기',
  '이었습니다', '이었어요', '되었습니다', '되었어요',
  '합니다', '해요', '해야', '하여야', '하여', '하고자', '하고',
  '하기로', '하기', '하는지', '하는', '하며', '한다', '했어요', '했습니다',
  '에게는', '에게도', '에게서', '에게',
  '으로부터', '으로는', '으로도', '으로',
  '에서는', '에서도', '에서',
  '이라는', '이라고', '이라', '이지만', '이지',
  '이랑', '이나', '이며', '이고',
  '까지는', '까지도', '까지',
  '부터는', '부터도', '부터',
  '에는', '에도', '에만', '에',
  '을까요', '할까요',
  '을', '를', '이', '가', '은', '는', '도', '만',
  '과', '와', '의',
];

function getDisplayMode(grade: string): { level1: 'inline' | 'tooltip' | 'none'; level2: 'tooltip' | 'none'; level3: 'tooltip' | 'none' } {
  if (grade === '초급') return { level1: 'none', level2: 'none', level3: 'none' };
  if (grade === '중급') return { level1: 'none', level2: 'tooltip', level3: 'tooltip' };
  return { level1: 'inline', level2: 'tooltip', level3: 'tooltip' };
}

async function searchKrdict(word: string): Promise<{ targetCode: string; grade: string; definition: string } | null> {
  const apiKey = process.env.KRDICT_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://krdict.korean.go.kr/api/search?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(word)}&part=word&sort=popular&num=10`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const xml = await res.text();

    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let firstItem: { targetCode: string; grade: string; definition: string } | null = null;
    let exactMatch: { targetCode: string; grade: string; definition: string } | null = null;

    let m;
    while ((m = itemRegex.exec(xml)) !== null) {
      const itemXml = m[1];
      const wordMatch = itemXml.match(/<word>([^<]+)<\/word>/);
      const codeMatch = itemXml.match(/<target_code>([^<]+)<\/target_code>/);
      const gradeMatch = itemXml.match(/<word_grade>([^<]+)<\/word_grade>/);
      const defMatch = itemXml.match(/<definition>([^<]+)<\/definition>/);

      if (!codeMatch) continue;
      const item = {
        targetCode: codeMatch[1].trim(),
        grade: gradeMatch?.[1].trim() || 'unknown',
        definition: defMatch?.[1].trim() || '',
      };

      if (!firstItem) firstItem = item;
      if (wordMatch?.[1].trim() === word) {
        exactMatch = item;
        break;
      }
    }

    return exactMatch || firstItem;
  } catch {
    return null;
  }
}

async function fetchKrdictExample(targetCode: string): Promise<string> {
  const apiKey = process.env.KRDICT_API_KEY;
  if (!apiKey) return '';

  try {
    const url = `https://krdict.korean.go.kr/api/view?key=${encodeURIComponent(apiKey)}&method=target_code&q=${targetCode}`;
    const res = await fetch(url);
    if (!res.ok) return '';
    const xml = await res.text();
    const blockRegex = /<example_info>([\s\S]*?)<\/example_info>/g;
    let firstExample = '';
    let sentenceExample = '';
    let block;
    while ((block = blockRegex.exec(xml)) !== null) {
      const info = block[1];
      const typeMatch = info.match(/<type>([^<]+)<\/type>/);
      const exampleMatch = info.match(/<example>([^<]+)<\/example>/);
      if (!exampleMatch) continue;
      const text = exampleMatch[1].trim();
      if (!firstExample) firstExample = text;
      if (typeMatch?.[1].trim() === '문장' && !sentenceExample) sentenceExample = text;
    }
    return sentenceExample || firstExample;
  } catch {
    return '';
  }
}

function extractCoreValues(coreFields: CoreFields): Set<string> {
  const values = new Set<string>();
  const add = (v: unknown) => { if (typeof v === 'string' && v.trim()) values.add(v.trim()); };
  add(coreFields.date);
  add(coreFields.time);
  add(coreFields.place);
  add(coreFields.deadline);
  add(coreFields.submissionTarget);
  if (Array.isArray(coreFields.materials)) coreFields.materials.forEach(add);
  return values;
}

function isCoreValue(word: string, coreValues: Set<string>): boolean {
  for (const v of coreValues) {
    if (word === v) return true;
    if (v.length >= 2 && (v.includes(word) || word.includes(v))) return true;
  }
  return false;
}

function stripJosa(word: string): string {
  for (const suffix of JOSA_AND_ENDINGS) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 2) {
      return word.slice(0, word.length - suffix.length);
    }
  }
  return word;
}

function makeFallbackMeaning(word: string): string {
  return SCHOOL_CORE_TERM_MEANINGS[word] || `${word}의 뜻은 원문과 함께 확인해 주세요.`;
}

function extractWords(rawText: string, coreFields: CoreFields): string[] {
  const coreValues = extractCoreValues(coreFields);
  const found: string[] = [];
  const seen = new Set<string>();

  for (const term of SCHOOL_CORE_TERMS) {
    if (rawText.includes(term) && !seen.has(term) && !isCoreValue(term, coreValues)) {
      found.push(term);
      seen.add(term);
    }
  }

  const eojeols = rawText
    .replace(/[.,!?~。·]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !/^\d/.test(w));

  for (const raw of eojeols) {
    const word = stripJosa(raw);
    if (word.length < 2) continue;
    if (seen.has(word)) continue;
    if (isCoreValue(word, coreValues)) continue;
    found.push(word);
    seen.add(word);
  }

  return found.slice(0, 40);
}

export async function classifyWords(rawText: string, coreFields: CoreFields): Promise<WordClassification[]> {
  const words = extractWords(rawText, coreFields);

  const results = await Promise.all(
    words.map(async (word): Promise<WordClassification> => {
      if (SCHOOL_CORE_TERMS.includes(word)) {
        return {
          word,
          grade: 'school_core',
          meaning: makeFallbackMeaning(word),
          example: '',
          displayMode: getDisplayMode('school_core'),
        };
      }

      const found = await searchKrdict(word);
      if (!found) {
        return { word, grade: 'unknown', meaning: makeFallbackMeaning(word), example: '', displayMode: getDisplayMode('unknown') };
      }

      const example = await fetchKrdictExample(found.targetCode);
      return {
        word,
        grade: found.grade,
        meaning: found.definition || makeFallbackMeaning(word),
        example,
        displayMode: getDisplayMode(found.grade),
      };
    })
  );

  return results.filter(w => w.grade !== '초급');
}
