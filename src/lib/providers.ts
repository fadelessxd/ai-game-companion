import type { ProviderId, ProviderInfo, ModelInfo, GenrePreset } from './types';

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    description: 'One key unlocks Gemini, Claude, GPT, Llama, and 200+ models',
    keyPrefix: 'sk-or-',
    keyPlaceholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys',
    models: [
      { id: 'google/gemini-3.7-flash', label: 'Gemini 3.7 Flash', supportsVision: true, free: true },
      { id: 'google/gemini-3.6-flash', label: 'Gemini 3.6 Flash', supportsVision: true, free: true },
      { id: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', supportsVision: true, free: true },
      { id: 'google/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview', supportsVision: true },
      { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', supportsVision: true },
      { id: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku', supportsVision: true, free: true },
      { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini', supportsVision: true, free: true },
      { id: 'openai/gpt-4o', label: 'GPT-4o', supportsVision: true },
      { id: 'meta-llama/llama-3.2-90b-vision-instruct', label: 'Llama 3.2 90B Vision', supportsVision: true, free: true },
      { id: 'qwen/qwen-2-vl-72b-instruct', label: 'Qwen 2 VL 72B', supportsVision: true, free: true },
    ],
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini (Direct)',
    description: 'Use a Google AI Studio API key directly',
    keyPrefix: 'AI',
    keyPlaceholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/apikey',
    models: [
      { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash', supportsVision: true, free: true },
      { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', supportsVision: true, free: true },
      { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', supportsVision: true, free: true },
      { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview', supportsVision: true },
      { id: 'gemini-flash-latest', label: 'Gemini Flash (latest)', supportsVision: true, free: true },
    ],
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT-4o and GPT-4o mini with vision',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o', supportsVision: true },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini', supportsVision: true },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', supportsVision: true },
    ],
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic Claude',
    description: 'Claude 3.5 Sonnet and Haiku with vision',
    keyPrefix: 'sk-ant-',
    keyPlaceholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', supportsVision: true },
      { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', supportsVision: true, free: true },
      { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus', supportsVision: true },
    ],
  },
};

export const PROVIDER_LIST = Object.values(PROVIDERS);

export function getProvider(id: string): ProviderInfo | undefined {
  return PROVIDERS[id as ProviderId];
}

export function getModel(provider: ProviderId, modelId: string): ModelInfo | undefined {
  return PROVIDERS[provider]?.models.find((m) => m.id === modelId);
}

export const GENRE_PRESETS: GenrePreset[] = [
  {
    id: 'general',
    label: 'General',
    icon: 'Gamepad2',
    systemPrompt:
      'You are an expert gaming companion. The user shares a screenshot of whatever game they are playing. Analyze what is visible and provide helpful, concise guidance. If you cannot identify the game, ask. Keep answers short and actionable — the user is mid-game.',
  },
  {
    id: 'rpg',
    label: 'RPG',
    icon: 'Sword',
    systemPrompt:
      'You are an expert RPG gaming companion. The screenshot shows an RPG. Help with quests, character builds, item management, story choices, combat strategy, and exploration. Identify NPCs, quest markers, stats, and inventory items. Be concise but thorough on build advice.',
  },
  {
    id: 'strategy',
    label: 'Strategy',
    icon: 'Brain',
    systemPrompt:
      'You are an expert strategy game companion. The screenshot shows a strategy game. Analyze the map, resources, unit positions, tech trees, and enemy movements. Suggest optimal builds, timings, and tactical decisions. Be precise and analytical.',
  },
  {
    id: 'puzzle',
    label: 'Puzzle',
    icon: 'Puzzle',
    systemPrompt:
      'You are an expert puzzle game companion. The screenshot shows a puzzle game. Analyze the board state, identify patterns, and provide hints that guide without spoiling the solution unless directly asked. Suggest the next move or logical step.',
  },
  {
    id: 'shooter',
    label: 'Shooter / FPS',
    icon: 'Crosshair',
    systemPrompt:
      'You are an expert FPS/shooter companion. The screenshot shows a shooter game. Help with weapon choice, map awareness, positioning, objective play, and loadout optimization. Be concise — the user is in active combat.',
  },
  {
    id: 'mmo',
    label: 'MMO',
    icon: 'Users',
    systemPrompt:
      'You are an expert MMO companion. The screenshot shows an MMO. Help with rotations, gear, raid mechanics, market/trading, and progression. Identify UI elements, buffs, and cooldowns. Be concise and actionable.',
  },
];

export function getGenrePrompt(genreId: string): string {
  return GENRE_PRESETS.find((g) => g.id === genreId)?.systemPrompt ?? GENRE_PRESETS[0].systemPrompt;
}

export const DEFAULT_QUICK_ACTIONS = [
  { id: 'next', label: 'What next?', prompt: 'What should I do next? Look at the screenshot and give me a clear next step.', icon: 'ArrowRight' },
  { id: 'explain', label: 'Explain', prompt: 'Explain what is happening on screen and what this objective/quest means.', icon: 'HelpCircle' },
  { id: 'translate', label: 'Translate', prompt: 'Translate any visible text on screen to English. If already English, summarize key text.', icon: 'Languages' },
  { id: 'hint', label: 'Hint', prompt: 'Give me a hint for what I am stuck on. Do not spoil the full solution unless I ask.', icon: 'Lightbulb' },
];
