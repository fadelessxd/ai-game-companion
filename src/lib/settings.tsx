import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { DEFAULT_QUICK_ACTIONS } from './providers';
import type { UserSettings, QuickAction, ThemeId, OverlaySize } from './types';

const DEFAULT_SETTINGS: UserSettings = {
  provider: 'openrouter',
  apiKey: '',
  model: '',
  economyMode: false,
  genre: 'general',
  quickActions: DEFAULT_QUICK_ACTIONS,
  theme: 'dark',
  overlaySize: 'medium',
  overlayOpacity: 90,
  bubbleSize: 48,
  overlayWidth: 380,
};

interface SettingsContextValue {
  settings: UserSettings;
  loading: boolean;
  saveSettings: (partial: Partial<UserSettings>) => Promise<void>;
  updateQuickActions: (actions: QuickAction[]) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Settings load error:', error);
        setLoading(false);
        return;
      }

      if (data) {
        setSettings({
          provider: data.provider,
          apiKey: data.api_key_enc || '',
          model: data.model || '',
          economyMode: data.economy_mode ?? false,
          genre: data.genre || 'general',
          quickActions: (data.quick_actions as QuickAction[]) || DEFAULT_QUICK_ACTIONS,
          theme: (data.theme as ThemeId) || 'dark',
          overlaySize: (data.overlay_size as OverlaySize) || 'medium',
          overlayOpacity: data.overlay_opacity ?? 90,
          bubbleSize: data.bubble_size ?? 48,
          overlayWidth: data.overlay_width ?? 380,
        });
      } else {
        const { error: insertError } = await supabase.from('settings').insert({
          user_id: user.id,
          provider: 'openrouter',
          api_key_enc: '',
          model: '',
          economy_mode: false,
          genre: 'general',
          quick_actions: DEFAULT_QUICK_ACTIONS,
          theme: 'dark',
          overlay_size: 'medium',
          overlay_opacity: 90,
          bubble_size: 48,
          overlay_width: 380,
        });
        if (insertError) console.error('Settings insert error:', insertError);
      }
      setLoading(false);
    })();
  }, [user]);

  const persist = async (partial: Partial<UserSettings>) => {
    if (!user) return;
    const updated = { ...settings, ...partial };
    setSettings(updated);

    const { error } = await supabase.from('settings').upsert({
      user_id: user.id,
      provider: updated.provider,
      api_key_enc: updated.apiKey,
      model: updated.model,
      economy_mode: updated.economyMode,
      genre: updated.genre,
      quick_actions: updated.quickActions,
      theme: updated.theme,
      overlay_size: updated.overlaySize,
      overlay_opacity: updated.overlayOpacity,
      bubble_size: updated.bubbleSize,
      overlay_width: updated.overlayWidth,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (error) console.error('Settings save error:', error);
  };

  const saveSettings = async (partial: Partial<UserSettings>) => {
    await persist(partial);
  };

  const updateQuickActions = async (actions: QuickAction[]) => {
    await persist({ quickActions: actions });
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, saveSettings, updateQuickActions }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
