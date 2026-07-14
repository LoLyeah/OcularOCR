import { AISettings, StructuredOcrResult } from './storage';
import { normalizeStructuredOcrResult, STRUCTURED_OCR_VERSION, tablePlainText } from './structured-ocr';
import { GoogleGenAI } from '@google/genai';
import { assertAiRequestAllowed } from './ai-policy';

export class StructuredOcrUnsupportedError extends Error {
  constructor(message?: string) {
    super(message || 'Structured output not supported by this model');
    this.name = 'StructuredOcrUnsupportedError';
  }
}

export class VisionModelUnsupportedError extends Error {
  constructor(message?: string) {
    super(message || 'This model does not support image input. Please choose a vision-capable model.');
    this.name = 'VisionModelUnsupportedError';
  }
}

function isVisionModelError(err: any): boolean {
  const msg = (err?.message || err?.error?.message || '').toLowerCase();
  return msg.includes('does not support image') || msg.includes('image input') || msg.includes('does not support multimodal') || msg.includes('image not supported') || msg.includes('cannot read') && msg.includes('image');
}

function chunkText(text: string, maxChunkSize: number = 25000): string[] {
  const pageDelimiter = /--- PAGE (\d+) ---/g;
  const matches = [...text.matchAll(pageDelimiter)];
  
  if (matches.length === 0) {
    const chunks: string[] = [];
    let current = '';
    const words = text.split(/\s+/);
    for (const w of words) {
      if ((current + ' ' + w).length > maxChunkSize) {
        chunks.push(current.trim());
        current = w;
      } else {
        current += (current ? ' ' : '') + w;
      }
    }
    if (current) chunks.push(current.trim());
    return chunks;
  }

  const chunks: string[] = [];
  let lastIndex = 0;
  let currentChunk = '';

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const index = match.index!;
    const nextPageText = text.substring(lastIndex, index);
    
    if ((currentChunk + nextPageText).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = nextPageText;
    } else {
      currentChunk += nextPageText;
    }
    lastIndex = index;
  }
  
  const lastPageText = text.substring(lastIndex);
  if ((currentChunk + lastPageText).length > maxChunkSize && currentChunk) {
    chunks.push(currentChunk.trim());
    chunks.push(lastPageText.trim());
  } else {
    currentChunk += lastPageText;
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
  }

  return chunks;
}

async function callLlm(prompt: string, settings: AISettings, temp: number = 0.2): Promise<string> {
  assertAiRequestAllowed(settings);
  if (settings.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: settings.apiKey });
    const response = await ai.models.generateContent({
      model: settings.model || 'gemini-3.5-flash',
      contents: prompt,
      config: {
        temperature: temp
      }
    });
    return response.text || 'No response generated.';
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
      if (isVisionModelError({ message: errText })) {
        throw new VisionModelUnsupportedError(`Model "${settings.model}" does not support image input. Please choose a vision-capable model.`);
      }
      throw new Error(`API Error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response generated.';
  }
  
  throw new Error('Invalid AI provider configured.');
}

export async function summarizeText(text: string, settings: AISettings, tags?: string[]): Promise<string> {
  const maxLimit = 25000;
  
  if (text.length > maxLimit) {
    const chunks = chunkText(text, maxLimit);
    
    // Map phase: Summarize each chunk in parallel
    const mapPromises = chunks.map(async (chunk, idx) => {
      const chunkPrompt = `Below is part ${idx + 1} of ${chunks.length} from a larger document. Please provide a detailed bulleted summary of key points and facts in this section only:\n\n${chunk}`;
      return callLlm(chunkPrompt, settings, 0.1);
    });
    
    const chunkSummaries = await Promise.all(mapPromises);
    
    // Reduce phase: Synthesize summaries into a final global summary
    const combinedSummaryText = chunkSummaries
      .map((summary, idx) => `[Section ${idx + 1} Summary]:\n${summary}`)
      .join('\n\n');
      
    let finalPrompt = '';
    if (settings.customSummaryPrompt && settings.customSummaryPrompt.trim()) {
      finalPrompt = `${settings.customSummaryPrompt}\n\nHere are the intermediate section summaries:\n\n${combinedSummaryText}`;
    } else {
      finalPrompt = `Please synthesize the following intermediate section summaries into a single cohesive, highly professional global summary of the entire document. Maintain key names, dates, and crucial facts:\n\n${combinedSummaryText}`;
    }
    
    return callLlm(finalPrompt, settings, 0.2);
  }

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
  return callLlm(prompt, settings, temp);
}

export async function extractTextFromImages(imagesBase64: string[], settings: AISettings): Promise<string> {
  assertAiRequestAllowed(settings);
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
      if (isVisionModelError({ message: errText })) {
        throw new VisionModelUnsupportedError(`Model "${settings.model}" does not support image input. Please choose a vision-capable model.`);
      }
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
  table?: {
    rows: Array<{ cells: Array<{ text: string; isHeader: boolean; rowSpan: number; colSpan: number }> }>;
  } | null;
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
  assertAiRequestAllowed(settings);
  const structuredPrompt = `Extract text from these document images and return it as structured JSON.
For each page, identify text blocks and provide for each block:
- "text": the exact text content
- "type": one of "text", "heading", "table", "list"
- "normalized_bbox": [x0, y0, x1, y1] where coordinates are normalized 0-1 relative to image width/height
- "table": null for non-table blocks. For tables, return {"rows":[{"cells":[{"text":"...","isHeader":true,"rowSpan":1,"colSpan":1}]}]}

Preserve reading order by listing blocks top-to-bottom, left-to-right.
Preserve list markers, heading hierarchy, table headers, empty cells, and merged-cell spans.
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
                            items: { type: 'number' }
                          },
                          table: {
                            anyOf: [
                              { type: 'null' },
                              {
                                type: 'object',
                                properties: {
                                  rows: {
                                    type: 'array',
                                    items: {
                                      type: 'object',
                                      properties: {
                                        cells: {
                                          type: 'array',
                                          items: {
                                            type: 'object',
                                            properties: {
                                              text: { type: 'string' },
                                              isHeader: { type: 'boolean' },
                                              rowSpan: { type: 'integer' },
                                              colSpan: { type: 'integer' }
                                            },
                                            required: ['text', 'isHeader', 'rowSpan', 'colSpan'],
                                            additionalProperties: false
                                          }
                                        }
                                      },
                                      required: ['cells'],
                                      additionalProperties: false
                                    }
                                  }
                                },
                                required: ['rows'],
                                additionalProperties: false
                              }
                            ]
                          }
                        },
                        required: ['text', 'type', 'normalized_bbox', 'table'],
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
      if (isVisionModelError({ message: errText })) {
        throw new VisionModelUnsupportedError(`Model "${settings.model}" does not support image input. Please choose a vision-capable model.`);
      }
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
    const blocks = (p.blocks || []).map((b, blockIndex) => {
      const [nx0 = 0, ny0 = 0, nx1 = 0, ny1 = 0] = b.normalized_bbox || [];
      const table = b.type === 'table' && b.table?.rows?.length ? {
        id: `page-${pageNumber}-table-${blockIndex + 1}`,
        pageNumber,
        rows: b.table.rows.map((row) => ({
          cells: row.cells.map((cell) => ({
            text: cell.text,
            ...(cell.isHeader ? { isHeader: true } : {}),
            ...(cell.rowSpan > 1 ? { rowSpan: cell.rowSpan } : {}),
            ...(cell.colSpan > 1 ? { colSpan: cell.colSpan } : {}),
          })),
        })),
        source: 'provider' as const,
      } : undefined;
      const blockText = table ? tablePlainText(table) : b.text;
      pageText += blockText + '\n';
      return {
        id: `page-${pageNumber}-block-${blockIndex + 1}`,
        text: blockText,
        type: b.type as 'text' | 'heading' | 'table' | 'list',
        bbox: {
          x0: Math.round(nx0 * dim.width),
          y0: Math.round(ny0 * dim.height),
          x1: Math.round(nx1 * dim.width),
          y1: Math.round(ny1 * dim.height)
        },
        ...(table ? { table } : {})
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
      blocks,
      tables: blocks.map((block) => block.table).filter(Boolean),
      width: dim.width,
      height: dim.height,
    };
  });

  return normalizeStructuredOcrResult({ version: STRUCTURED_OCR_VERSION, text: concatenatedText.trim(), pages });
}

export async function correctOcrText(
  text: string,
  settings: AISettings,
  imageBase64?: string
): Promise<string> {
  assertAiRequestAllowed(settings);
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
      if (isVisionModelError({ message: errText })) {
        throw new VisionModelUnsupportedError(`Model "${settings.model}" does not support image input. Please choose a vision-capable model.`);
      }
      throw new Error(`API Error: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || text;
  }

  throw new Error('Invalid AI provider configured.');
}
