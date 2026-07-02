import { AISettings } from './storage';
import { GoogleGenAI, Type } from '@google/genai';

// Document categories list for suggestion
export const STANDARD_CATEGORIES = [
  'Invoice',
  'Receipt',
  'Contract',
  'ID/License',
  'Statement',
  'Report',
  'Letter',
  'Manual',
  'Resume',
  'Medical',
  'Tax'
];

/**
 * Local rule-based offline tagging heuristics using keywords & filename parsing.
 */
export function suggestTagsLocal(text: string, filename: string): string[] {
  const normalizedText = text.toLowerCase();
  const normalizedFilename = filename.toLowerCase();
  const suggestions = new Set<string>();

  // Helper to check keywords
  const hasKeyword = (keywords: string[]) => 
    keywords.some(kw => normalizedText.includes(kw) || normalizedFilename.includes(kw));

  // 1. Receipt
  if (hasKeyword(['receipt', 'merchant', 'cashier', 'sale receipt', 'change due', 'store #', 'subtotal', 'visa', 'mastercard', 'amex', 'cash register', 'items purchased'])) {
    suggestions.add('Receipt');
  }

  // 2. Invoice
  if (hasKeyword(['invoice', 'bill to', 'invoice to', 'invoice #', 'due date', 'purchase order', 'remit to', 'total due', 'balance due', 'invoice date', 'payment terms', 'po number'])) {
    suggestions.add('Invoice');
  }

  // 3. Contract
  if (hasKeyword(['contract', 'agreement', 'terms of service', 'memorandum', 'nda', 'terms & conditions', 'lease agreement', 'employment contract', 'signatures', 'hereby agree', 'witnesseth', 'party of the first part'])) {
    suggestions.add('Contract');
  }

  // 4. ID / License
  if (hasKeyword(['driver license', 'drivers license', 'passport', 'identification', 'birth certificate', 'state id', 'national id', 'date of birth', 'dob', 'lic. no.', 'lic#', 'cardholders signature'])) {
    suggestions.add('ID/License');
  }

  // 5. Statement
  if (hasKeyword(['bank statement', 'account statement', 'statement of account', 'ending balance', 'deposits', 'withdrawals', 'statement period', 'transaction history', 'account number', 'opening balance', 'credit card statement'])) {
    suggestions.add('Statement');
  }

  // 6. Report
  if (hasKeyword(['executive summary', 'methodology', 'conclusion', 'table of contents', 'annual report', 'financial report', 'project description', 'section 1', 'analysis report'])) {
    suggestions.add('Report');
  }

  // 7. Letter
  if (hasKeyword(['dear ', 'sincerely', 'best regards', 'yours truly', 'respectfully', 'to whom it may concern', 'recipient name', 'sender name', 'salutation'])) {
    suggestions.add('Letter');
  }

  // 8. Manual
  if (hasKeyword(['user guide', 'user manual', 'instruction manual', 'troubleshooting', 'getting started', 'installation guide', 'warranty information', 'technical specifications'])) {
    suggestions.add('Manual');
  }

  // 9. Resume
  if (hasKeyword(['resume', 'curriculum vitae', 'work experience', 'education background', 'professional experience', 'skills summary', 'references available', 'academic history'])) {
    suggestions.add('Resume');
  }

  // 10. Medical
  if (hasKeyword(['medical prescription', 'prescription', 'patient name', 'doctor name', 'clinical note', 'laboratory report', 'vaccination record', 'health insurance', 'hospital billing', 'medical record'])) {
    suggestions.add('Medical');
  }

  // 11. Tax
  if (hasKeyword(['w-2', 'w2', '1099', 'form 1040', 'tax return', 'tax year', 'internal revenue', 'irs', 'withholding tax', 'taxpayer ID', 'filer'])) {
    suggestions.add('Tax');
  }

  return Array.from(suggestions);
}

/**
 * AI-based tag classification using the configured AI provider.
 */
export async function suggestTagsAI(text: string, filename: string, settings: AISettings): Promise<string[]> {
  const prompt = `You are an intelligent document classification system. 
Analyze the following document text and filename, then suggest 1 to 4 relevant category labels or tags for this document (e.g., 'Invoice', 'Receipt', 'Contract', 'ID/License', 'Statement', 'Letter', 'Resume', 'Report', 'Manual', 'Medical', 'Tax', or other fitting highly specific categories).

Return ONLY a JSON array of strings containing the suggested tags. Do not include any explanation or markdown formatting blocks.

Filename: "${filename}"
Document text:
${text.substring(0, 3000)}`;

  if (settings.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: settings.apiKey });
    const response = await ai.models.generateContent({
      model: settings.model || 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '[]');
    if (Array.isArray(parsed)) {
      return parsed.map(t => String(t).trim()).filter(Boolean);
    }
    return [];
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
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" }
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
    const content = data.choices?.[0]?.message?.content || '{}';
    // The model might return { "tags": ["Invoice", "Receipt"] } or an array directly
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    } else if (parsed && typeof parsed === 'object') {
      const firstArray = Object.values(parsed).find(v => Array.isArray(v)) as string[];
      if (firstArray) return firstArray;
    }
    return [];
  }

  throw new Error('Invalid AI provider configured.');
}

/**
 * Hybrid suggestion function. Tries AI first if settings are configured, and falls back to local.
 */
export async function suggestTags(text: string, filename: string, settings?: AISettings): Promise<string[]> {
  if (!text || !text.trim()) {
    return suggestTagsLocal('', filename);
  }

  const strategy = settings?.autoTagStrategy ?? 'hybrid';

  if (strategy === 'none') {
    return [];
  }

  if (strategy === 'local') {
    return suggestTagsLocal(text, filename);
  }

  // strategy is 'hybrid'
  const canUseAI = settings && (settings.apiKey || settings.provider === 'ollama');

  if (canUseAI) {
    try {
      const aiTags = await suggestTagsAI(text, filename, settings);
      if (aiTags && aiTags.length > 0) {
        return aiTags;
      }
    } catch (e) {
      console.warn('AI tag suggestion failed, falling back to local heuristics:', e);
    }
  }

  return suggestTagsLocal(text, filename);
}
