import type { ActivityMaterials, CoreFields, DocumentType } from '../../common/types';

export async function generateActivityMaterials(
  _rawText: string,
  documentType: DocumentType,
  coreFields: CoreFields
): Promise<ActivityMaterials> {
  const checklist = [...coreFields.materials, ...coreFields.actions.slice(0, 3)].filter((item) => item.length > 0);
  const actionName = documentType === 'learning-task' ? '활동' : '제출';

  const questions = [
    `언제 ${actionName}하나요?`,
    `어디에서 ${coreFields.place || actionName}하나요?`,
    '무엇을 준비해야 하나요?'
  ];

  const matchingCardIdeas = [
    coreFields.materials.length > 0 ? '준비물 카드와 행동 카드를 연결하기' : '행동 카드와 장소 카드를 연결하기',
    coreFields.date || coreFields.time ? '날짜/시간 카드와 장소 카드를 짝짓기' : '행동 카드와 목적 카드를 짝짓기'
  ];

  const coachingGuide = [
    `학생이 ${coreFields.materials.length > 0 ? `${coreFields.materials.join(', ')}을 미리 챙기도록` : '필요한 준비물을 확인하도록'} 도와주세요.`,
    coreFields.deadline ? `${coreFields.deadline} 기한을 다시 확인해 주세요.` : '',
    coreFields.submissionTarget ? `${coreFields.submissionTarget}에게 제출하는 방법을 설명해 주세요.` : ''
  ]
    .filter(Boolean)
    .join(' ');

  return {
    checklist,
    questions,
    matchingCardIdeas,
    coachingGuide
  };
}
