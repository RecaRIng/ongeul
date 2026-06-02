import type { ActionStep, CoreFields } from '../../common/types';

function getReason(action: string): string {
  if (action.includes('제출')) {
    return '정해진 기한과 제출처를 지키기 위해';
  }

  if (action.includes('준비') || action.includes('가져')) {
    return '활동에 필요한 준비물을 빠뜨리지 않기 위해';
  }

  return '문서의 안내를 차례대로 실행하기 위해';
}

export async function generateActionSteps(_rawText: string, coreFields: CoreFields): Promise<ActionStep[]> {
  const rawActions = coreFields.actions.length > 0 ? coreFields.actions : ['문서 내용을 확인하기'];

  return rawActions.slice(0, 5).map((action, index) => ({
    step: index + 1,
    action,
    reason: getReason(action),
    visualTarget: coreFields.place || coreFields.materials.join(', ') || action
  }));
}
