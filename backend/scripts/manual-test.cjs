const cases = [
  {
    name: '실행 안내형',
    input: {
      title: '현장체험학습 안내',
      text: '6월 10일 현장체험학습을 갑니다. 오전 9시까지 학교 정문으로 모입니다. 준비물은 도시락, 물, 운동화입니다.',
    },
    expectedType: 'execution-guide',
  },
  {
    name: '작성·제출형',
    input: {
      title: '체험학습 신청서',
      text: '체험학습 참가 신청서는 6월 5일까지 담임선생님께 제출하세요.',
    },
    expectedType: 'submission-form',
  },
  {
    name: '학습 수행형 - 독서록',
    input: {
      title: '독서록 과제',
      text: '다음 국어 시간까지 독서록을 써 오세요. 책 제목, 줄거리, 느낀 점을 적어야 합니다.',
    },
    expectedType: 'learning-task',
  },
  {
    name: '학습 수행형 - 조사/발표',
    input: {
      title: '공공기관 조사 발표',
      text: '우리 동네 공공기관을 조사하여 발표 자료를 만들어 오세요. 사진을 1장 이상 붙여 오세요. 3분 발표를 준비합니다.',
    },
    expectedType: 'learning-task',
  },
];

async function run() {
  for (const testCase of cases) {
    const res = await fetch('http://127.0.0.1:4000/api/analyze/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(testCase.input),
    });

    if (!res.ok) {
      console.log(`\n[FAIL] ${testCase.name}: HTTP ${res.status}`);
      console.log(await res.text());
      continue;
    }

    const data = await res.json();
    const actualType = data.document?.documentType;
    const okType = actualType === testCase.expectedType ? 'OK' : `FAIL expected ${testCase.expectedType}`;

    console.log(`\n[${okType}] ${testCase.name}`);
    console.log('documentType:', actualType);
    console.log('coreFields:', JSON.stringify(data.coreFields, null, 2));
    console.log('actionSteps:', (data.actionSteps ?? []).map(step => step.action).join(' | '));
    console.log('easyText.level1:', data.easyText?.level1?.text);
    console.log('visuals length:', data.visuals?.length ?? 0);
    console.log('visual cardTypes:', (data.visuals ?? []).map(visual => visual.cardType).join(' | '));
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
