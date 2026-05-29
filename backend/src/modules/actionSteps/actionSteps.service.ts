import type { ActionStep, CoreFields } from '../../common/types.js';

function getReason(action: string): string {
  if (action.includes('제출')) {
    return '정해진 기한과 제출처를 지키기 위해';
  }
  if (action.includes('준비')) {
    return '활동을 잘하기 위해 준비물을 챙기기 위해';
  }
  return '올바르게 활동을 진행하기 위해';
}

export async function generateActionSteps(_rawText: string, coreFields: CoreFields): Promise<ActionStep[]> {
  const rawActions = coreFields.actions.length > 0 ? coreFields.actions : [];

  return rawActions.slice(0, 5).map((action, index) => ({
    step: index + 1,
    action,
    reason: getReason(action),
    visualTarget: coreFields.place || coreFields.materials.join(', ') || action
  }));
}
