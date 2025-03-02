export function extractTextFromADF(descrption: any): string {
  if (!descrption || typeof descrption !== 'object') {
    return '';
  }

  let text = '';

  if (descrption.type === 'text') {
    return descrption.text || '';
  }

  if (Array.isArray(descrption.content)) {
    for (const item of descrption.content) {
      text += extractTextFromADF(item) + ' ';
    }
  }

  return text.trim();
}
