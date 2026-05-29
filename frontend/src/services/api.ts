import { AnalysisRequest, ImageAnalysisRequest, AnalysisResponse } from '../types/analysis.js';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export async function analyzeText(request: AnalysisRequest): Promise<AnalysisResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Text analysis failed:', error);
    throw error;
  }
}

export async function analyzeImage(request: ImageAnalysisRequest): Promise<AnalysisResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Image analysis failed:', error);
    throw error;
  }
}
