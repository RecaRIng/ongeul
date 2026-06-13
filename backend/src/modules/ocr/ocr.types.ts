export interface ClovaOcrRequestImage {
  format: string;
  name: string;
  data: string;
}

export interface ClovaOcrVertex {
  x?: number;
  y?: number;
}

export interface ClovaOcrField {
  valueType?: string;
  inferText?: string;
  inferConfidence?: number;
  boundingPoly?: {
    vertices?: ClovaOcrVertex[];
  };
}

export interface ClovaOcrResponse {
  version?: string;
  requestId?: string;
  timestamp?: number;
  images?: Array<{
    uid?: string;
    name?: string;
    inferResult?: string;
    message?: string;
    fields?: ClovaOcrField[];
    validationResult?: unknown;
  }>;
}

export interface OcrToken {
  text: string;
  confidence: number;
  x: number;
  y: number;
  raw: ClovaOcrField;
}

export interface OcrQuality {
  avgConfidence: number;
  fieldCount: number;
  needsRetake: boolean;
  reasons: string[];
}

export interface NormalizedOcrResult {
  fullText: string;
  lines: string[];
  tokens: OcrToken[];
  quality: OcrQuality;
  raw: ClovaOcrResponse;
}

export interface ImageFileLike {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size?: number;
}

export interface Base64ImageInput {
  imageBase64: string;
  imageFormat: 'png' | 'jpg' | 'jpeg' | 'pdf';
  fileName?: string;
}
