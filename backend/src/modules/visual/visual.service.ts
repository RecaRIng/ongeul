import type { ActionStep, CoreFields, VisualPrompt } from '../../common/types';

export async function generateVisualPrompts(coreFields: CoreFields, actionSteps: ActionStep[]): Promise<VisualPrompt[]> {
  const visuals: VisualPrompt[] = [];

  if (coreFields.materials.length > 0) {
    visuals.push({
      label: 'Ï§ÄÎπÑÎ¨º',
      target: coreFields.materials.join(', '),
      prompt: `?ôÏÉù??${coreFields.materials.join(', ')}??Ï§ÄÎπÑÌïò???•Î©¥`,
      imageUrl: ''
    });
  }

  if (coreFields.place) {
    visuals.push({
      label: '?•ÏÜå',
      target: coreFields.place,
      prompt: `${coreFields.place}?êÏÑú ?úÎèô?òÎäî ?ôÏÉù??Î™®Ïäµ`,
      imageUrl: ''
    });
  }

  if (visuals.length === 0 && actionSteps.length > 0) {
    visuals.push({
      label: '?âÎèô',
      target: actionSteps[0].action,
      prompt: `${actionSteps[0].action} ?•Î©¥`,
      imageUrl: ''
    });
  }

  return visuals;
}
