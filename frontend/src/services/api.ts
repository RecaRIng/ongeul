import { AnalysisRequest, ImageAnalysisRequest, AnalysisResponse } from '../types/analysis';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || '';

async function postJson<TBody>(path: string, body: TBody): Promise<AnalysisResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `API error: ${response.statusText}`);
  }

  return response.json() as Promise<AnalysisResponse>;
}

export async function analyzeText(request: AnalysisRequest): Promise<AnalysisResponse> {
  return postJson('/api/analyze/text', request);
}

export async function analyzeImage(request: ImageAnalysisRequest): Promise<AnalysisResponse> {
  return postJson('/api/analyze/image', request);
}
