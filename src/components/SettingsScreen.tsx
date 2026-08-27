import { useState } from 'react';
import {
  ArrowLeft, Key, Cpu, Zap, Gamepad2, Check, Loader2, ExternalLink,
  Eye, EyeOff, Plus, Trash2, Save, AlertCircle, Lightbulb, Palette, Monitor
} from 'lucide-react';
import { useSettings } from '@/lib/settings';
import { PROVIDER_LIST, GENRE_PRESETS, DEFAULT_QUICK_ACTIONS } from '@/lib/providers';
import { testApiKey } from '@/lib/ai';
import type { ProviderId, QuickAction, ThemeId, OverlaySize } from '@/lib/types';

const THEME_OPTIONS: { id: ThemeId; label: string; preview: string }[] = [
  { id: 'dark', label: 'Dark', preview: 'linear-gradient(135deg, #070b14, #1a2a38)' },
  { id: 'midnight', label: 'Midnight', preview: 'linear-gradient(135deg, #050008, #220044)' },
  { id: 'light', label: 'Light', preview: 'linear-gradient(135deg, #f8fafc, #e2e8f0)' },
];

const SIZE_OPTIONS: { id: OverlaySize; label: string; desc: string }[] = [
  { id: 'small', label: 'Small', desc: '320px' },
  { id: 'medium', label: 'Medium', desc: '380px' },
  { id: 'large', label: 'Large', desc: '460px' },
];

interface SettingsScreenProps {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { settings, saveSettings, updateQuickActions } = useSettings();
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [newAction, setNewAction] = useState({ label: '', prompt: '' });

  const handleProviderChange = (provider: ProviderId) => {
    const firstModel = PROVIDER_LIST.find((p) => p.id === provider)?.models[0];
    saveSettings({ provider, model: firstModel?.id || '' });
    setTestResult(null);
  };

  const handleModelChange = (model: string) => {
    saveSettings({ model });
    setTestResult(null);
  };

  const handleGenreChange = (genre: string) => {
    saveSettings({ genre });
  };

  const handleKeyChange = (apiKey: string) => {
    saveSettings({ apiKey });
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testApiKey(settings.provider, settings.apiKey, settings.model);
    setTestResult(result);
    setTesting(false);
  };

  const handleSaveIndicator = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addAction = () => {
    if (!newAction.label.trim() || !newAction.prompt.trim()) return;
    const action: QuickAction = {
      id: `action-${Date.now()}`,
      label: newAction.label,
      prompt: newAction.prompt,
    };
    updateQuickActions([...settings.quickActions, action]);
    setNewAction({ label: '', prompt: '' });
  };

  const removeAction = (id: string) => {
    updateQuickActions(settings.quickActions.filter((a) => a.id !== id));
  };

  const resetActions = () => {
    updateQuickActions(DEFAULT_QUICK_ACTIONS);
  };

  const currentProvider = PROVIDER_LIST.find((p) => p.id === settings.provider);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-950)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 glass-strong border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Companion
          </button>
          <h1 className="text-lg font-semibold font-display flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Gamepad2 className="w-5 h-5" style={{ color: `rgb(var(--accent-r), var(--accent-g), var(--accent-b))` }} />
            Settings
          </h1>
          <div className="w-32 text-right">
            {saved && (
              <span className="text-xs text-accent-400 flex items-center gap-1 justify-end animate-fade-in">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Provider selection */}
        <section className="glass rounded-2xl p-5 animate-slide-up">
          <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary-400" />
            AI Provider
          </h2>
          <p className="text-xs text-slate-400 mb-4">Choose where your AI runs. OpenRouter gives you the most models with one key.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PROVIDER_LIST.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleProviderChange(provider.id)}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  settings.provider === provider.id
                    ? 'bg-primary-500/10 border-primary-500/40 ring-1 ring-primary-500/20'
                    : 'bg-base-800/40 border-base-700/40 hover:border-base-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">{provider.label}</span>
                  {settings.provider === provider.id && (
                    <Check className="w-4 h-4 text-primary-400" />
                  )}
                </div>
                <p className="text-xs text-slate-400">{provider.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* API Key */}
        <section className="glass rounded-2xl p-5 animate-slide-up">
          <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            <Key className="w-4 h-4 text-primary-400" />
            API Key
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Paste your {currentProvider?.label} key here. It is stored securely and only used to call the AI.
          </p>

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.apiKey}
              onChange={(e) => handleKeyChange(e.target.value)}
              placeholder={currentProvider?.keyPlaceholder}
              className="w-full bg-base-800/60 border border-base-700/40 rounded-xl pl-4 pr-12 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/20 transition-all font-mono"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center justify-between mt-3">
            <a
              href={currentProvider?.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              Get a key <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={handleTest}
              disabled={!settings.apiKey || testing}
              className="text-xs px-3 py-1.5 rounded-lg bg-base-800/60 hover:bg-base-700/60 text-slate-300 hover:text-white border border-base-700/40 transition-all disabled:opacity-40 flex items-center gap-1.5"
            >
              {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              Test Key
            </button>
          </div>

          {testResult && (
            <div
              className={`mt-3 flex items-start gap-2 text-sm rounded-xl px-3 py-2 animate-fade-in ${
                testResult.ok
                  ? 'bg-accent-500/10 border border-accent-500/20 text-accent-400'
                  : 'bg-error-500/10 border border-error-500/20 text-error-400'
              }`}
            >
              {testResult.ok ? <Check className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              <span>{testResult.ok ? `Connected! AI replied: "${testResult.message}"` : testResult.message}</span>
            </div>
          )}
        </section>

        {/* Model selection */}
        <section className="glass rounded-2xl p-5 animate-slide-up">
          <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary-400" />
            Model
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Pick which AI model to use. Models marked "Free" cost nothing on their provider.
          </p>

          <div className="space-y-2">
            {currentProvider?.models.map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelChange(model.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                  settings.model === model.id
                    ? 'bg-primary-500/10 border-primary-500/40 ring-1 ring-primary-500/20'
                    : 'bg-base-800/40 border-base-700/40 hover:border-base-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white">{model.label}</span>
                  {model.free && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-accent-500/20 text-accent-400 font-medium">Free</span>
                  )}
                  {!model.supportsVision && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-warning-500/20 text-warning-400 font-medium">Text only</span>
                  )}
                </div>
                {settings.model === model.id && <Check className="w-4 h-4 text-primary-400" />}
              </button>
            ))}
          </div>
        </section>

        {/* Game genre preset */}
        <section className="glass rounded-2xl p-5 animate-slide-up">
          <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-primary-400" />
            Game Genre
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Tell the companion what kind of game you're playing so it gives better advice.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GENRE_PRESETS.map((genre) => (
              <button
                key={genre.id}
                onClick={() => handleGenreChange(genre.id)}
                className={`p-3 rounded-xl border transition-all text-center ${
                  settings.genre === genre.id
                    ? 'bg-primary-500/10 border-primary-500/40 ring-1 ring-primary-500/20'
                    : 'bg-base-800/40 border-base-700/40 hover:border-base-600'
                }`}
              >
                <span className="text-sm text-white block">{genre.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Theme & Overlay Appearance */}
        <section className="glass rounded-2xl p-5 animate-slide-up">
          <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary-400" />
            Appearance
          </h2>
          <p className="text-xs text-slate-400 mb-4">Choose a theme and overlay size that fits your setup.</p>

          {/* Theme selector */}
          <div className="mb-5">
            <label className="text-xs font-medium text-slate-400 mb-2 block">Theme</label>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map((theme) => {
                const isActive = settings.theme === theme.id;
                return (
              <button
                key={theme.id}
                onClick={() => saveSettings({ theme: theme.id })}
                className={isActive ? 'relative p-3 rounded-xl border transition-all overflow-hidden border-primary-500/40 ring-1 ring-primary-500/20' : 'relative p-3 rounded-xl border transition-all overflow-hidden border-base-700/40 hover:border-base-600'}
              >
                <div className="absolute inset-0 opacity-60" style={{ background: theme.preview }} />
                <div className="relative flex items-center justify-center">
                    <span className="text-sm font-medium text-white drop-shadow-lg">{theme.label}</span>
                </div>
                {isActive && (
                  <div className="absolute top-1.5 right-1.5">
                    <Check className="w-3.5 h-3.5 text-primary-400 drop-shadow-lg" />
                  </div>
                )}
              </button>
                );
              })}
            </div>
          </div>

          {/* Overlay size */}
          <div className="mb-5">
            <label className="text-xs font-medium text-slate-400 mb-2 block">Overlay Size</label>
            <div className="grid grid-cols-3 gap-2">
              {SIZE_OPTIONS.map((size) => {
                const isActive = settings.overlaySize === size.id;
                return (
              <button
                key={size.id}
                onClick={() => saveSettings({ overlaySize: size.id })}
                className={isActive ? 'p-3 rounded-xl border transition-all text-center bg-primary-500/10 border-primary-500/40 ring-1 ring-primary-500/20' : 'p-3 rounded-xl border transition-all text-center bg-base-800/40 border-base-700/40 hover:border-base-600'}
              >
                <span className="text-sm text-white block">{size.label}</span>
                <span className="text-xs text-slate-400">{size.desc}</span>
              </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Economy mode */}
        <section className="glass rounded-2xl p-5 animate-slide-up">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary-400" />
                Economy Mode
              </h2>
              <p className="text-xs text-slate-400 max-w-md">
                Reduces screenshot quality and size before sending to the AI. Saves bandwidth and cost — ideal for free keys.
              </p>
            </div>
            <button
              onClick={() => saveSettings({ economyMode: !settings.economyMode })}
              className={`relative w-11 h-6 rounded-full transition-all flex-shrink-0 ${
                settings.economyMode ? 'bg-primary-500' : 'bg-base-700'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                  settings.economyMode ? 'left-5.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Quick actions editor */}
        <section className="glass rounded-2xl p-5 animate-slide-up">
          <h2 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary-400" />
            Quick Actions
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Custom buttons that appear in the overlay for one-tap questions.
          </p>

          <div className="space-y-2 mb-4">
            {settings.quickActions.map((action) => (
              <div key={action.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-base-800/40 border border-base-700/40">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium">{action.label}</div>
                  <div className="text-xs text-slate-400 truncate">{action.prompt}</div>
                </div>
                <button
                  onClick={() => removeAction(action.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-error-400 hover:bg-error-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl bg-base-800/40 border border-base-700/40">
            <input
              type="text"
              value={newAction.label}
              onChange={(e) => setNewAction({ ...newAction, label: e.target.value })}
              placeholder="Button label"
              className="flex-1 bg-base-900/60 border border-base-700/40 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/40"
            />
            <input
              type="text"
              value={newAction.prompt}
              onChange={(e) => setNewAction({ ...newAction, prompt: e.target.value })}
              placeholder="What should it ask?"
              className="flex-1 bg-base-900/60 border border-base-700/40 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/40"
            />
            <button
              onClick={addAction}
              disabled={!newAction.label.trim() || !newAction.prompt.trim()}
              className="px-3 py-2 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 border border-primary-500/30 transition-all disabled:opacity-40 flex items-center gap-1 text-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          <button
            onClick={resetActions}
            className="mt-3 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Reset to defaults
          </button>
        </section>

        <div className="pb-8" />
      </div>
    </div>
  );
}
