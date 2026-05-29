export async function explainWord(word: string): Promise<string> {
  return `국립국어원 사전 API 연결 전: ${word}에 대한 쉬운 설명을 준비합니다.`;
}
