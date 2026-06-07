const { extractDocumentTitle } = require('../dist/common/document-title.js');

const cases = [
  {
    name: 'summer neulbom title beats image file name',
    rawText: [
      '철산교육통신',
      '2025학년도 여름방학 늘봄+ 맞춤형 프로그램 신청 안내',
      '학부모님 안녕하십니까?',
    ].join('\n'),
    fallbackTitle: 'image1.png',
    expected: '2025학년도 여름방학 늘봄+ 맞춤형 프로그램 신청 안내',
  },
  {
    name: 'winter reading title beats image file name',
    rawText: [
      '광명북 가정통신문',
      '겨울 독서교실 신청 안내',
      '학부모님 안녕하십니까?',
    ].join('\n'),
    fallbackTitle: 'image.png',
    expected: '겨울 독서교실 신청 안내',
  },
  {
    name: 'reject phone url date and principal lines',
    rawText: [
      '2025년 6월 23일',
      '문의 02-123-4567',
      'http://example.com',
      '광명북초등학교장',
    ].join('\n'),
    fallbackTitle: 'image.png',
    expected: '제목 없음',
  },
  {
    name: 'use explicit title when raw text has no better title',
    rawText: '6월 10일 현장체험학습을 갑니다. 오전 9시까지 학교 정문으로 모입니다.',
    fallbackTitle: '현장체험학습 안내',
    expected: '현장체험학습 안내',
  },
];

let failed = 0;

for (const testCase of cases) {
  const actual = extractDocumentTitle(testCase.rawText, testCase.fallbackTitle);
  const ok = actual === testCase.expected;
  if (!ok) failed += 1;
  console.log(`[${ok ? 'OK' : 'FAIL'}] ${testCase.name}`);
  console.log(`  expected: ${testCase.expected}`);
  console.log(`  actual:   ${actual}`);
}

if (failed > 0) {
  process.exitCode = 1;
}
