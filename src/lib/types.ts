export type ProviderId = 'openrouter' | 'gemini' | 'openai' | 'anthropic';

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  description: string;
  keyPrefix: string;
  keyPlaceholder: string;
  docsUrl: string;
  models: ModelInfo[];
}

export interface ModelInfo {
  id: string;
  label: string;
  supportsVision: boolean;
  free?: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
}

export interface GenrePreset {
  id: string;
  label: string;
  systemPrompt: string;
  icon: string;
}

export type ThemeId = 'dark' | 'light' | 'midnight';
export type OverlaySize = 'small' | 'medium' | 'large';

export interface UserSettings {
  provider: ProviderId;
  apiKey: string;
  model: string;
  economyMode: boolean;
  genre: string;
  quickActions: QuickAction[];
  theme: ThemeId;
  overlaySize: OverlaySize;
  overlayOpacity: number;
  bubbleSize: number;
  overlayWidth: number;
}

export interface Conversation {
  id: string;
  title: string;
  genre: string;
  provider: string;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  screenshot_url: string | null;
  created_at: string;
}

export interface AskResult {
  text: string;
  screenshotDataUrl?: string;
}
