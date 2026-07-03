import { AISettings, StructuredOcrResult } from './storage';
import { GoogleGenAI } from '@google/genai';

export class StructuredOcrUnsupportedError extends Error {
  constructor(message?: string) {
    super(message || 'Structured output not supported by this model');
    this.name = 'StructuredOcrUnsupportedError';
  }
}

export async function summarizeText(text: string, settings: AISettings, tags?: string[]): Promise<string> {
  let prompt = '';
  if (settings.customSummaryPrompt && settings.customSummaryPrompt.trim()) {
    prompt = settings.customSummaryPrompt;
    if (prompt.includes('{{tags}}')) {
      prompt = prompt.replace('{{tags}}', tags && tags.length > 0 ? tags.join(', ') : 'None');
    } else if (tags && tags.length > 0) {
      prompt = `Document Tags/Categories: ${tags.join(', ')}\n\n${prompt}`;
    }
    
    if (prompt.includes('{{text}}')) {
      prompt = prompt.replace('{{text}}', text);
    } else if (prompt.includes('{{document_text}}')) {
      prompt = prompt.replace('{{document_text}}', text);
    } else {
      prompt = `${prompt}\n\n${text}`;
    }
  } else {
    prompt = `Please provide a concise summary and extract key data points from the following document text:\n\n${text}`;
    if (tags && tags.length > 0) {
      prompt = `Document Tags/Categories: ${tags.join(', ')}\n\nPlease provide a concise summary and extract key data points from the following document text, utilizing the tags to provide more accurate context and focus for the analysis:\n\n${text}`;
    }
  }

  const temp = settings.temperature !== undefined ? settings.temperature : 0.2;

  if (settings.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: settings.apiKey });
    const response = await ai.models.generateContent({
      model: settings.model || 'gemini-3.5-flash',
      contents: prompt,
      config: {
        temperature: temp
      }
    });
    return response.text || 'No summary generated.';
  } else if (settings.provider === 'openai' || settings.provider === 'ollama') {
    const isOllama = settings.provider === 'ollama';
    let defaultEndpoint = isOllama ? 'http://localhost:11434/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
    
    let endpoint = settings.endpoint || defaultEndpoint;
    if (endpoint && !endpoint.includes('/chat/completions') && !endpoint.includes('/completions')) {
      endpoint = endpoint.endsWith('/') ? `${endpoint}chat/completions` : `${endpoint}/chat/completions`;
    }
    const isGroq = endpoint.includes('groq.com');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (settings.apiKey) {
      headers['Authorization'] = `Bearer ${settings.apiKey}`;
    }

    const body = {
      model: settings.model || (isOllama ? 'llama3' : isGroq ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'gpt-4o'),
      messages: [{ role: 'user', content: prompt }],
      temperature: temp
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API Error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No summary generated.';
  }
  
  throw new Error('Invalid AI provider configured.');
}

export async function extractTextFromImages(imagesBase64: string[], settings: AISettings): Promise<string> {
  let defaultPrompt = "Please extract all the text exactly as it appears in these document images. For each page/image, please prepend a line matching exactly '--- PAGE X ---' where X is the page number (starting from 1), followed by the text of that page. Do not include any other introductory or conversational remarks.";
  
  if (settings.handwritingMode) {
    defaultPrompt = "These images contain handwritten text. Transcribe all handwritten content faithfully, preserving line breaks and reading order. For each page/image, please prepend a line matching exactly '--- PAGE X ---' where X is the page number (starting from 1), followed by the text of that page. Do not include any other introductory or conversational remarks.";
  }

  const prompt = settings.customOcrPrompt && settings.customOcrPrompt.trim()
    ? settings.customOcrPrompt
    : defaultPrompt;

  const temp = settings.temperature !== undefined ? settings.temperature : 0.1;

  if (settings.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: settings.apiKey });
    const contents: any[] = [prompt];
    for (const imgUrl of imagesBase64) {
      const mimeType = imgUrl.split(';')[0].split(':')[1];
      const data = imgUrl.split(',')[1];
      contents.push({ inlineData: { mimeType, data } });
    }
    const response = await ai.models.generateContent({
      model: settings.model || 'gemini-3.5-flash',
      contents,
      config: {
        temperature: temp
      }
    });
    return response.text || '';
  } else if (settings.provider === 'openai' || settings.provider === 'ollama') {
    const isOllama = settings.provider === 'ollama';
    let defaultEndpoint = isOllama ? 'http://localhost:11434/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';

    let endpoint = settings.endpoint || defaultEndpoint;
    if (endpoint && !endpoint.includes('/chat/completions') && !endpoint.includes('/completions')) {
      endpoint = endpoint.endsWith('/') ? `${endpoint}chat/completions` : `${endpoint}/chat/completions`;
    }
    const isGroq = endpoint.includes('groq.com');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (settings.apiKey) {
      headers['Authorization'] = `Bearer ${settings.apiKey}`;
    }

    const contentArray: any[] = [{ type: 'text', text: prompt }];
    for (const url of imagesBase64) {
      contentArray.push({ type: 'image_url', image_url: { url } });
    }

    const body = {
      model: settings.model || (isOllama ? 'llama3' : isGroq ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'gpt-4o'),
      messages: [{ role: 'user', content: contentArray }],
      temperature: temp
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API Error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  throw new Error('Invalid AI provider configured.');
}

interface AiBlock {
  text: string;
  type: 'text' | 'heading' | 'table' | 'list';
  normalized_bbox: [number, number, number, number];
}

interface AiPageBlocks {
  pageNumber: number;
  blocks: AiBlock[];
}

interface AiStructuredResponse {
  pages: AiPageBlocks[];
}

export async function extractStructuredFromImages(
  imagesBase64: string[],
  settings: AISettings,
  pageDimensions: { width: number; height: number }[]
): Promise<StructuredOcrResult> {
  const structuredPrompt = `Extract text from these document images and return it as structured JSON.
For each page, identify text blocks and provide for each block:
- "text": the exact text content
- "type": one of "text", "heading", "table", "list"
- "normalized_bbox": [x0, y0, x1, y1] where coordinates are normalized 0-1 relative to image width/height

Preserve reading order by listing blocks top-to-bottom, left-to-right.
Do not include any text outside the JSON structure.
Return exactly: {"pages": [{"pageNumber": 1, "blocks": [...]}]}`;

  const temp = settings.temperature !== undefined ? settings.temperature : 0.1;

  if (settings.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: settings.apiKey });
    const contents: any[] = [structuredPrompt];
    for (const imgUrl of imagesBase64) {
      const mimeType = imgUrl.split(';')[0].split(':')[1];
      const data = imgUrl.split(',')[1];
      contents.push({ inlineData: { mimeType, data } });
    }
    const response = await ai.models.generateContent({
      model: settings.model || 'gemini-3.5-flash',
      contents,
      config: {
        temperature: temp,
        responseMimeType: 'application/json'
      }
    });
    const raw = response.text || '{}';
    const parsed: AiStructuredResponse = JSON.parse(raw);
    return structuredResponseToOcrResult(parsed, pageDimensions, imagesBase64);
  } else if (settings.provider === 'openai' || settings.provider === 'ollama') {
    const isOllama = settings.provider === 'ollama';
    let defaultEndpoint = isOllama ? 'http://localhost:11434/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
    let endpoint = settings.endpoint || defaultEndpoint;
    if (endpoint && !endpoint.includes('/chat/completions') && !endpoint.includes('/completions')) {
      endpoint = endpoint.endsWith('/') ? `${endpoint}chat/completions` : `${endpoint}/chat/completions`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (settings.apiKey) {
      headers['Authorization'] = `Bearer ${settings.apiKey}`;
    }

    const contentArray: any[] = [{ type: 'text', text: structuredPrompt }];
    for (const url of imagesBase64) {
      contentArray.push({ type: 'image_url', image_url: { url } });
    }

    const body: any = {
      model: settings.model || (isOllama ? 'llama3.2-vision' : 'gpt-4o'),
      messages: [{ role: 'user', content: contentArray }],
      temperature: temp
    };

    if (!isOllama) {
      body.response_format = {
        type: 'json_schema',
        json_schema: {
          name: 'ocr_result',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              pages: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    pageNumber: { type: 'integer' },
                    blocks: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          text: { type: 'string' },
                          type: { type: 'string', enum: ['text', 'heading', 'table', 'list'] },
                          normalized_bbox: {
                            type: 'array',
                            items: { type: 'number' },
                            minItems: 4,
                            maxItems: 4
                          }
                        },
                        required: ['text', 'type', 'normalized_bbox'],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ['pageNumber', 'blocks'],
                  additionalProperties: false
                }
              }
            },
            required: ['pages'],
            additionalProperties: false
          }
        }
      };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API Error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    // For Ollama, response_format may be ignored; try to parse JSON anyway
    let parsed: AiStructuredResponse;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new StructuredOcrUnsupportedError(
        isOllama
          ? 'Structured output not supported by this Ollama model. Falling back to text-only OCR.'
          : 'Failed to parse structured JSON from provider response.'
      );
    }

    if (!parsed.pages || parsed.pages.length === 0) {
      throw new StructuredOcrUnsupportedError('Provider returned empty structured output. Falling back to text-only OCR.');
    }

    return structuredResponseToOcrResult(parsed, pageDimensions, imagesBase64);
  }

  throw new Error('Invalid AI provider configured.');
}

function structuredResponseToOcrResult(
  response: AiStructuredResponse,
  pageDimensions: { width: number; height: number }[],
  imagesBase64: string[]
): StructuredOcrResult {
  let concatenatedText = '';

  const pages = (response.pages || []).map((p) => {
    const pageNumber = p.pageNumber;
    const dim = pageDimensions[p.pageNumber - 1] || { width: 0, height: 0 };

    let pageText = '';
    const blocks = (p.blocks || []).map((b) => {
      const [nx0, ny0, nx1, ny1] = b.normalized_bbox;
      const blockText = b.text;
      pageText += blockText + '\n';
      return {
        text: blockText,
        type: b.type as 'text' | 'heading' | 'table' | 'list',
        bbox: {
          x0: Math.round(nx0 * dim.width),
          y0: Math.round(ny0 * dim.height),
          x1: Math.round(nx1 * dim.width),
          y1: Math.round(ny1 * dim.height)
        }
      };
    });

    if (imagesBase64.length > 1 || (response.pages || []).length > 1) {
      concatenatedText += `--- PAGE ${pageNumber} ---\n${pageText}\n\n`;
    } else {
      concatenatedText = pageText;
    }

    return {
      pageNumber,
      text: pageText.trim(),
      words: [],
      blocks
    };
  });

  return { text: concatenatedText.trim(), pages };
}

export async function correctOcrText(
  text: string,
  settings: AISettings,
  imageBase64?: string
): Promise<string> {
  const prompt = settings.postOcrCorrectionPrompt && settings.postOcrCorrectionPrompt.trim()
    ? settings.postOcrCorrectionPrompt.replace('{{text}}', text)
    : `Fix any OCR errors in the following text. Preserve line breaks, paragraphs, and reading order. Output only the corrected text without any introductory remarks or explanations:\n\n${text}`;

  const temp = settings.temperature !== undefined ? settings.temperature : 0.1;

  if (settings.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: settings.apiKey });
    const contents: any[] = [prompt];
    if (imageBase64) {
      const mimeType = imageBase64.split(';')[0].split(':')[1];
      const data = imageBase64.split(',')[1];
      contents.unshift({ inlineData: { mimeType, data } });
    }
    const response = await ai.models.generateContent({
      model: settings.model || 'gemini-3.5-flash',
      contents,
      config: { temperature: temp }
    });
    return response.text || text;
  } else if (settings.provider === 'openai' || settings.provider === 'ollama') {
    const isOllama = settings.provider === 'ollama';
    let defaultEndpoint = isOllama ? 'http://localhost:11434/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
    let endpoint = settings.endpoint || defaultEndpoint;
    if (endpoint && !endpoint.includes('/chat/completions') && !endpoint.includes('/completions')) {
      endpoint = endpoint.endsWith('/') ? `${endpoint}chat/completions` : `${endpoint}/chat/completions`;
    }
    const isGroq = endpoint.includes('groq.com');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (settings.apiKey) {
      headers['Authorization'] = `Bearer ${settings.apiKey}`;
    }

    const contentArray: any[] = [{ type: 'text', text: prompt }];
    if (imageBase64) {
      contentArray.unshift({ type: 'image_url', image_url: { url: imageBase64 } });
    }

    const body = {
      model: settings.model || (isOllama ? 'llama3' : isGroq ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'gpt-4o'),
      messages: [{ role: 'user', content: contentArray }],
      temperature: temp
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API Error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || text;
  }

  throw new Error('Invalid AI provider configured.');
}
