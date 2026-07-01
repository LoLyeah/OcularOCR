import { AISettings } from './storage';
import { GoogleGenAI } from '@google/genai';

export async function summarizeText(text: string, settings: AISettings): Promise<string> {
  const prompt = `Please provide a concise summary and extract key data points from the following document text:\n\n${text}`;

  if (settings.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: settings.apiKey });
    const response = await ai.models.generateContent({
      model: settings.model || 'gemini-3.5-flash',
      contents: prompt,
    });
    return response.text || 'No summary generated.';
  } else if (settings.provider === 'openai' || settings.provider === 'ollama') {
    const isOllama = settings.provider === 'ollama';
    let endpoint = settings.endpoint || (isOllama ? 'http://localhost:11434/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions');
    if (endpoint && !endpoint.includes('/chat/completions') && !endpoint.includes('/completions')) {
      endpoint = endpoint.endsWith('/') ? `${endpoint}chat/completions` : `${endpoint}/chat/completions`;
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (settings.apiKey) {
      headers['Authorization'] = `Bearer ${settings.apiKey}`;
    }

    const body = {
      model: settings.model || (isOllama ? 'llama3' : 'gpt-4o'),
      messages: [{ role: 'user', content: prompt }]
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
  const prompt = "Please extract all the text exactly as it appears in these document images. Only output the extracted text, no introductory or conversational remarks.";

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
    });
    return response.text || '';
  } else if (settings.provider === 'openai' || settings.provider === 'ollama') {
    const isOllama = settings.provider === 'ollama';
    let endpoint = settings.endpoint || (isOllama ? 'http://localhost:11434/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions');
    if (endpoint && !endpoint.includes('/chat/completions') && !endpoint.includes('/completions')) {
      endpoint = endpoint.endsWith('/') ? `${endpoint}chat/completions` : `${endpoint}/chat/completions`;
    }
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
      model: settings.model || (isOllama ? 'llama3' : 'gpt-4o'),
      messages: [{ role: 'user', content: contentArray }]
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
