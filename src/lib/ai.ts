import type { ProviderId, AskResult } from './types';
import { getProvider, getModel, getGenrePrompt } from './providers';

interface AskParams {
  provider: ProviderId;
  apiKey: string;
  model: string;
  prompt: string;
  screenshotDataUrl?: string;
  genre: string;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  economyMode?: boolean;
}

function stripDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error('Invalid screenshot data');
  return { mimeType: match[1], base64: match[2] };
}

function buildSystemPrompt(genre: string): string {
  return getGenrePrompt(genre);
}

export async function askAI(params: AskParams): Promise<string> {
  const { provider, apiKey, model, prompt, screenshotDataUrl, genre, conversationHistory, economyMode } = params;

  if (!apiKey) throw new Error('No API key set. Add one in Settings.');
  if (!model) throw new Error('No model selected. Pick one in Settings.');

  const systemPrompt = buildSystemPrompt(genre);
  const modelInfo = getModel(provider, model);
  const hasScreenshot = !!screenshotDataUrl;
  const useVision = hasScreenshot && modelInfo?.supportsVision !== false;

  switch (provider) {
    case 'openrouter':
      return askOpenRouter(params, systemPrompt, useVision);
    case 'gemini':
      return askGemini(params, systemPrompt, useVision);
    case 'openai':
      return askOpenAI(params, systemPrompt, useVision);
    case 'anthropic':
      return askAnthropic(params, systemPrompt, useVision);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

async function askOpenRouter(params: AskParams, systemPrompt: string, useVision: boolean): Promise<string> {
  const { apiKey, model, prompt, screenshotDataUrl, conversationHistory } = params;
  const messages: any[] = [];

  messages.push({ role: 'system', content: systemPrompt });

  if (conversationHistory) {
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  if (useVision && screenshotDataUrl) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: screenshotDataUrl } },
      ],
    });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'AI Game Companion',
    },
    body: JSON.stringify({ model, messages, max_tokens: 1024 }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenRouter error ${res.status}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from OpenRouter');
  return text;
}

async function askGemini(params: AskParams, systemPrompt: string, useVision: boolean): Promise<string> {
  const { apiKey, model, prompt, screenshotDataUrl, conversationHistory, economyMode } = params;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents: any[] = [];

  if (conversationHistory) {
    for (const msg of conversationHistory) {
      contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
    }
  }

  const userParts: any[] = [{ text: prompt }];
  if (useVision && screenshotDataUrl) {
    const { mimeType, base64 } = stripDataUrl(screenshotDataUrl);
    userParts.push({ inline_data: { mime_type: mimeType, data: base64 } });
  }
  contents.push({ role: 'user', parts: userParts });

  const body: any = {
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { maxOutputTokens: 1024 },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini error ${res.status}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

async function askOpenAI(params: AskParams, systemPrompt: string, useVision: boolean): Promise<string> {
  const { apiKey, model, prompt, screenshotDataUrl, conversationHistory } = params;
  const messages: any[] = [{ role: 'system', content: systemPrompt }];

  if (conversationHistory) {
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  if (useVision && screenshotDataUrl) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: screenshotDataUrl, detail: params.economyMode ? 'low' : 'high' } },
      ],
    });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, max_tokens: 1024 }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI error ${res.status}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from OpenAI');
  return text;
}

async function askAnthropic(params: AskParams, systemPrompt: string, useVision: boolean): Promise<string> {
  const { apiKey, model, prompt, screenshotDataUrl, conversationHistory } = params;
  const messages: any[] = [];

  if (conversationHistory && conversationHistory.length > 0) {
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  if (useVision && screenshotDataUrl) {
    const { mimeType, base64 } = stripDataUrl(screenshotDataUrl);
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
      ],
    });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model, system: systemPrompt, messages, max_tokens: 1024 }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic error ${res.status}`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Empty response from Anthropic');
  return text;
}

export async function testApiKey(provider: ProviderId, apiKey: string, model: string): Promise<{ ok: boolean; message: string }> {
  try {
    const text = await askAI({
      provider,
      apiKey,
      model,
      prompt: 'Reply with exactly: OK',
      genre: 'general',
      economyMode: true,
    });
    return { ok: true, message: text.trim().substring(0, 60) };
  } catch (e: any) {
    return { ok: false, message: e.message || 'Unknown error' };
  }
}
