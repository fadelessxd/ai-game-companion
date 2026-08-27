import { useState, useEffect, useRef } from 'react';
import {
  Gamepad2, Monitor, MonitorOff, LogOut, Settings as SettingsIcon,
  History as HistoryIcon, Camera, Sparkles, Zap, Eye, Keyboard,
  ArrowRight, Play
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useSettings } from '@/lib/settings';
import { screenCapture } from '@/lib/screenCapture';
import { OverlayPanel } from './OverlayPanel';

interface CompanionViewProps {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

export function CompanionView({ onOpenSettings, onOpenHistory }: CompanionViewProps) {
  const { user, signOut } = useAuth();
  const { settings } = useSettings();
  const [captureActive, setCaptureActive] = useState(false);
  const [showHotkeys, setShowHotkeys] = useState(false);
  const captureVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const checkCapture = setInterval(() => {
      setCaptureActive(screenCapture.isCaptureActive());
    }, 1000);
    return () => clearInterval(checkCapture);
  }, []);

  const handleStartCapture = async () => {
    try {
      await screenCapture.start();
      setCaptureActive(screenCapture.isCaptureActive());
    } catch {
      // user cancelled or denied
    }
  };

  const handleStopCapture = () => {
    screenCapture.stop();
    setCaptureActive(false);
  };

  const openPopout = () => {
    const features = 'width=400,height=600,alwaysOnTop=yes,menubar=no,toolbar=no,location=no';
    window.open(window.location.href + '?popout=1', 'companion_popout', features);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-950)' }}>
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[150px]" style={{ background: `rgba(var(--accent-r), var(--accent-g), var(--accent-b), 0.15)` }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[150px]" style={{ background: 'rgba(163, 230, 53, 0.08)' }} />
      </div>

      {/* Top bar */}
      <header className="relative z-10 glass-strong border-b border-base-700/60">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, rgb(var(--accent-r), var(--accent-g), var(--accent-b)), rgb(var(--accent-r), var(--accent-g), var(--accent-b, 0.7)))`, boxShadow: `0 4px 12px rgba(var(--accent-r), var(--accent-g), var(--accent-b), 0.2)` }}>
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold font-display" style={{ color: 'var(--text-primary)' }}>AI Game Companion</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openPopout}
              className="text-xs px-3 py-1.5 rounded-lg bg-base-800/60 hover:bg-base-700/60 text-slate-300 hover:text-white border border-base-700/40 transition-all flex items-center gap-1.5"
              title="Open companion in a separate window"
            >
              <Monitor className="w-3.5 h-3.5" />
              Pop Out
            </button>
            <button
              onClick={onOpenHistory}
              className="p-2 rounded-lg bg-base-800/60 hover:bg-base-700/60 text-slate-400 hover:text-white border border-base-700/40 transition-colors"
              title="History"
            >
              <HistoryIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg bg-base-800/60 hover:bg-base-700/60 text-slate-400 hover:text-white border border-base-700/40 transition-colors"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
            <button
              onClick={signOut}
              className="p-2 rounded-lg bg-base-800/60 hover:bg-base-700/60 text-slate-400 hover:text-error-400 border border-base-700/40 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Hero / status */}
        <div className="text-center mb-8 animate-slide-up">
          <h2 className="text-3xl sm:text-4xl font-bold font-display mb-2" style={{ color: 'var(--text-primary)' }}>
            Your <span className="text-gradient">AI Gaming Companion</span>
          </h2>
          <p className="max-w-lg mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Share your game screen, ask questions, and get instant AI-powered hints — without leaving your game.
          </p>
        </div>

        {/* Screen capture card */}
        <div className="glass-strong rounded-2xl p-6 mb-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold font-display flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Monitor className="w-4 h-4" style={{ color: `rgb(var(--accent-r), var(--accent-g), var(--accent-b))` }} />
                Screen Capture
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Share the window or tab where your game is running. The AI only sees it when you ask.
              </p>
            </div>
            <span
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                captureActive
                  ? 'bg-accent-500/10 text-accent-400 border-accent-500/30'
                  : 'bg-base-800/60 text-slate-400 border-base-700/40'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${captureActive ? 'bg-accent-400 animate-pulse' : 'bg-slate-500'}`} />
              {captureActive ? 'Capturing' : 'Inactive'}
            </span>
          </div>

          {captureActive ? (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <div className="bg-base-850/60 rounded-xl p-4 border border-accent-500/20 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center flex-shrink-0">
                    <Eye className="w-5 h-5 text-accent-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">Screen is being shared</p>
                    <p className="text-xs text-slate-400">Screenshots are taken only when you ask the AI a question.</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleStopCapture}
                className="px-4 py-2.5 rounded-xl bg-error-500/10 hover:bg-error-500/20 text-error-400 border border-error-500/30 transition-all flex items-center gap-2 text-sm whitespace-nowrap"
              >
                <MonitorOff className="w-4 h-4" />
                Stop Sharing
              </button>
            </div>
          ) : (
            <button
              onClick={handleStartCapture}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-primary-500/20 to-primary-600/20 hover:from-primary-500/30 hover:to-primary-600/30 border border-primary-500/30 text-primary-300 transition-all flex items-center justify-center gap-2 group"
            >
              <Play className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Start Screen Capture</span>
            </button>
          )}
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <FeatureCard
            icon={<Camera className="w-5 h-5" />}
            title="Screenshot Context"
            description="The AI sees your game only when you ask — no continuous recording."
          />
          <FeatureCard
            icon={<Sparkles className="w-5 h-5" />}
            title="Genre Presets"
            description={`Currently set to: ${settings.genre}. Change it in Settings.`}
          />
          <FeatureCard
            icon={<Zap className="w-5 h-5" />}
            title="Economy Mode"
            description={settings.economyMode ? 'On — reduced screenshot quality to save cost.' : 'Off — full quality screenshots.'}
          />
        </div>

        {/* Hotkeys */}
        <div className="glass rounded-2xl p-5 mb-6">
          <button
            onClick={() => setShowHotkeys(!showHotkeys)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-medium text-white">Hotkeys</span>
            </div>
            <ArrowRight className={`w-4 h-4 text-slate-400 transition-transform ${showHotkeys ? 'rotate-90' : ''}`} />
          </button>

          {showHotkeys && (
            <div className="mt-4 space-y-2 animate-slide-down">
              <HotkeyRow keys="Ctrl + Shift + Q" description="Quick ask — open the overlay and focus the question box" />
              <HotkeyRow keys="Ctrl + Shift + H" description="Hide / show the overlay completely" />
              <HotkeyRow keys="Esc" description="Collapse the overlay back to the circle widget" />
              <HotkeyRow keys="Enter" description="Send question to AI" />
              <HotkeyRow keys="Shift + Enter" description="New line in the question box" />
            </div>
          )}
        </div>

        {/* Getting started */}
        {!settings.apiKey && (
          <div className="glass rounded-2xl p-5 border-warning-500/20 bg-warning-500/5 animate-slide-up">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-warning-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-warning-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-white font-medium mb-1">Almost ready!</p>
                <p className="text-xs text-slate-400 mb-3">
                  Add an API key in Settings to start asking questions. OpenRouter is recommended — one key gives you access to Gemini, Claude, GPT, and more.
                </p>
                <button
                  onClick={onOpenSettings}
                  className="text-xs px-3 py-1.5 rounded-lg bg-primary-500/20 hover:bg-primary-500/30 text-primary-300 border border-primary-500/30 transition-all flex items-center gap-1.5"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                  Open Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating overlay panel */}
      <OverlayPanel onOpenSettings={onOpenSettings} onOpenHistory={onOpenHistory} />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="glass rounded-2xl p-4 transition-all" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `rgba(var(--accent-r), var(--accent-g), var(--accent-b), 0.1)`, color: `rgb(var(--accent-r), var(--accent-g), var(--accent-b))` }}>
        {icon}
      </div>
      <h4 className="text-sm font-medium font-display mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h4>
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{description}</p>
    </div>
  );
}

function HotkeyRow({ keys, description }: { keys: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{description}</span>
      <kbd className="text-xs font-mono px-2 py-1 rounded-lg border" style={{ background: 'var(--bg-800)', borderColor: 'var(--border-main)', color: 'var(--text-primary)' }}>
        {keys}
      </kbd>
    </div>
  );
}
