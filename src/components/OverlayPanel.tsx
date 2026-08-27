import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Gamepad2, Send, X, Camera, Loader2,
  Settings, History, Sparkles, AlertCircle, Copy, Check,
  Minus, Maximize2, Minimize2, GripHorizontal, Eye, EyeOff, SlidersHorizontal
} from 'lucide-react';
import { useSettings } from '@/lib/settings';
import { screenCapture } from '@/lib/screenCapture';
import { askAI } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

interface OverlayPanelProps {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  screenshotDataUrl?: string;
}

const SIZE_CONFIG = {
  small: { width: 320, maxHeight: 280, inputRows: 1 },
  medium: { width: 380, maxHeight: 360, inputRows: 1 },
  large: { width: 460, maxHeight: 480, inputRows: 2 },
};

export function OverlayPanel({ onOpenSettings, onOpenHistory }: OverlayPanelProps) {
  const { settings, saveSettings } = useSettings();
  const { user } = useAuth();

  // Panel state
  const [mode, setMode] = useState<'circle' | 'panel' | 'hidden'>('circle');
  const [morphing, setMorphing] = useState(false);
  const [circleAnimation, setCircleAnimation] = useState<'expand' | 'collapse' | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captureActive, setCaptureActive] = useState(false);
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Position (shared by circle and panel)
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [dragging, setDragging] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const dragPosRef = useRef<{ x: number; y: number }>({ x: 24, y: 24 });
  const panelRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-hide: circle becomes semi-transparent when not hovered
  const [circleHovered, setCircleHovered] = useState(false);

  const sizeConfig = SIZE_CONFIG[settings.overlaySize];
  const overlayWidth = settings.overlayWidth || sizeConfig.width;
  const bubbleSize = settings.bubbleSize || 48;

  // Close popover when clicking outside
  useEffect(() => {
    if (!showPopover) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [showPopover]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Hotkeys
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ctrl+Shift+Q — quick ask (open panel + focus input)
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyQ') {
        e.preventDefault();
        if (mode === 'hidden') {
          setMode('panel');
        } else if (mode === 'circle') {
          expandPanel();
        }
        setTimeout(() => textareaRef.current?.focus(), 350);
      }
      // Ctrl+Shift+H — toggle hide
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyH') {
        e.preventDefault();
        setMode((prev) => (prev === 'hidden' ? 'circle' : 'hidden'));
      }
      // Escape — collapse to circle
      if (e.key === 'Escape' && mode === 'panel') {
        collapseToCircle();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mode]);

  const expandPanel = () => {
    setCircleAnimation('expand');
    setMorphing(true);
    setMode('panel');
    window.setTimeout(() => {
      setMorphing(false);
      setCircleAnimation(null);
    }, 350);
  };

  const collapseToCircle = () => {
    setCircleAnimation('collapse');
    setMorphing(true);
    setMode('circle');
    window.setTimeout(() => {
      setMorphing(false);
      setCircleAnimation(null);
    }, 300);
  };

  // Dragging logic (works for both circle and panel header)
  // Uses requestAnimationFrame for smooth, jank-free tracking
  const handleDragStart = (e: React.MouseEvent) => {
    setDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: position.x, origY: position.y };
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const maxX = window.innerWidth - 60;
      const maxY = window.innerHeight - 60;
      const newX = Math.max(0, Math.min(maxX, dragRef.current.origX + dx));
      const newY = Math.max(0, Math.min(maxY, dragRef.current.origY + dy));
      dragPosRef.current = { x: newX, y: newY };
      if (dragRafRef.current === null) {
        dragRafRef.current = requestAnimationFrame(() => {
          setPosition(dragPosRef.current);
          dragRafRef.current = null;
        });
      }
    };
    const handleUp = () => {
      if (dragRafRef.current !== null) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      setDragging(false);
      dragRef.current = null;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging]);

  const startCapture = async () => {
    try {
      await screenCapture.start();
      setCaptureActive(screenCapture.isCaptureActive());
    } catch (e: any) {
      setError(e.message || 'Failed to start screen capture');
    }
  };

  const captureScreenshot = useCallback((): string | null => {
    if (!screenCapture.isCaptureActive()) return null;
    const screenshot = screenCapture.captureScreenshot(settings.economyMode);
    setLastScreenshot(screenshot);
    return screenshot;
  }, [settings.economyMode]);

  const ensureConversation = async (): Promise<string> => {
    if (conversationId) return conversationId;
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user!.id,
        title: `Session ${new Date().toLocaleString()}`,
        genre: settings.genre,
        provider: settings.provider,
        model: settings.model,
      })
      .select('id')
      .single();
    if (error) throw new Error('Failed to create conversation');
    setConversationId(data.id);
    return data.id;
  };

  const saveMessage = async (convId: string, role: 'user' | 'assistant', content: string, screenshotUrl: string | null) => {
    await supabase.from('messages').insert({
      conversation_id: convId,
      role,
      content,
      screenshot_url: screenshotUrl,
    });
  };

  const sendQuestion = async (promptText?: string) => {
    const text = (promptText || input).trim();
    if (!text || loading) return;

    if (!settings.apiKey) {
      setError('No API key set. Open Settings to add one.');
      return;
    }

    setError(null);
    setInput('');

    const screenshot = captureScreenshot();
    const userMsg: ChatMessage = { role: 'user', content: text, screenshotDataUrl: screenshot ?? undefined };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const convId = await ensureConversation();
      await saveMessage(convId, 'user', text, screenshot ?? null);

      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const response = await askAI({
        provider: settings.provider,
        apiKey: settings.apiKey,
        model: settings.model,
        prompt: text,
        screenshotDataUrl: screenshot ?? undefined,
        genre: settings.genre,
        conversationHistory: history,
        economyMode: settings.economyMode,
      });

      const assistantMsg: ChatMessage = { role: 'assistant', content: response };
      setMessages((prev) => [...prev, assistantMsg]);
      await saveMessage(convId, 'assistant', response, null);

      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId);
    } catch (e: any) {
      setError(e.message || 'Failed to get AI response');
    } finally {
      setLoading(false);
    }
  };

  const copyLastAnswer = () => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (lastAssistant) {
      navigator.clipboard.writeText(lastAssistant.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const newSession = () => {
    setMessages([]);
    setConversationId(null);
    setLastScreenshot(null);
    setError(null);
  };

  const cycleSize = () => {
    const sizes: Array<'small' | 'medium' | 'large'> = ['small', 'medium', 'large'];
    const currentIdx = sizes.indexOf(settings.overlaySize);
    const next = sizes[(currentIdx + 1) % sizes.length];
    saveSettings({ overlaySize: next });
  };

  // === HIDDEN MODE ===
  if (mode === 'hidden') {
    return (
      <button
        onClick={() => setMode('circle')}
        className="fixed z-[9999] bottom-6 right-6 px-3 py-2 rounded-xl text-xs font-medium border transition-all hover:scale-105"
        style={{
          position: 'fixed',
          background: 'var(--btn-bg)',
          borderColor: 'var(--btn-border)',
          color: 'var(--text-secondary)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Eye className="w-3.5 h-3.5 inline mr-1.5" style={{ color: 'rgb(var(--accent-r), var(--accent-g), var(--accent-b))' }} />
        Show Companion
      </button>
    );
  }

  // === CIRCLE WIDGET MODE ===
  if (mode === 'circle') {
    const opacity = circleHovered ? 1 : 0.25;
    return (
      <div
        onMouseDown={handleDragStart}
        onMouseEnter={() => setCircleHovered(true)}
        onMouseLeave={() => setCircleHovered(false)}
        onClick={(e) => {
          if (!dragging) expandPanel();
          e.stopPropagation();
        }}
        className="fixed z-[9999] cursor-pointer select-none"
        style={{
          left: position.x,
          top: position.y,
          position: 'fixed',
          width: bubbleSize,
          height: bubbleSize,
          opacity,
          transition: dragging ? 'none' : 'opacity 300ms ease, width 200ms ease, height 200ms ease',
          animation: circleAnimation === 'collapse' ? 'morphCollapse 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : circleAnimation === 'expand' ? 'morphExpand 0.35s cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
        }}
      >
        <div
          className="relative w-full h-full rounded-full flex items-center justify-center transition-all duration-300 ripple"
          style={{
            background: `linear-gradient(135deg, rgb(var(--accent-r), var(--accent-g), var(--accent-b)), rgb(var(--accent-r), var(--accent-g), var(--accent-b, 0.7)))`,
            boxShadow: circleHovered ? `0 8px 32px rgba(var(--accent-r), var(--accent-g), var(--accent-b), 0.5)` : `0 4px 16px rgba(var(--accent-r), var(--accent-g), var(--accent-b), 0.2)`,
          }}
        >
          <Gamepad2 className="text-white" style={{ width: bubbleSize * 0.42, height: bubbleSize * 0.42 }} />
          {messages.length > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ background: '#a3e635', color: 'var(--bg-950)' }}
            >
              {messages.length}
            </span>
          )}
          {loading && (
            <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/60 animate-spin" />
          )}
        </div>
      </div>
    );
  }

  // === EXPANDED PANEL MODE ===
  return (
    <div
      ref={panelRef}
      className="fixed z-[9999] flex flex-col overflow-hidden shadow-2xl"
      style={{
        left: position.x,
        top: position.y,
        position: 'fixed',
        width: overlayWidth,
        background: `var(--overlay-bg)`,
        borderColor: 'var(--overlay-border)',
        backdropFilter: `blur(32px)`,
        WebkitBackdropFilter: `blur(32px)`,
        border: '1px solid var(--overlay-border)',
        borderRadius: 16,
        boxShadow: `0 16px 48px var(--shadow-color), 0 0 0 1px var(--overlay-border)`,
        animation: morphing ? 'morphExpand 0.35s cubic-bezier(0.16, 1, 0.3, 1)' : undefined,
        transition: dragging ? 'none' : 'width 200ms ease',
        transformOrigin: 'bottom right',
      }}
    >
      {/* Header / drag handle */}
      <div
        onMouseDown={handleDragStart}
        className="flex items-center justify-between px-3 py-2.5 cursor-move select-none border-b"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-850)' }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={collapseToCircle}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform hover:scale-110"
            style={{
              background: `linear-gradient(135deg, rgb(var(--accent-r), var(--accent-g), var(--accent-b)), rgb(var(--accent-r), var(--accent-g), var(--accent-b, 0.7)))`,
            }}
            title="Collapse into bubble"
            aria-label="Collapse into bubble"
          >
            <Gamepad2 className="w-4 h-4 text-white" />
          </button>
          <span className="text-sm font-semibold font-display" style={{ color: 'var(--text-primary)' }}>
            Companion
          </span>
          {captureActive && (
            <span className="flex items-center gap-1 text-xs" style={{ color: '#a3e635' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#a3e635' }} />
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={cycleSize}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            title={`Size: ${settings.overlaySize}`}
          >
            {settings.overlaySize === 'small' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={newSession}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            title="New session"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onOpenHistory}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            title="History"
          >
            <History className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setShowPopover(!showPopover)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: showPopover ? `rgb(var(--accent-r), var(--accent-g), var(--accent-b))` : 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = showPopover ? `rgb(var(--accent-r), var(--accent-g), var(--accent-b))` : 'var(--text-muted)'; }}
            title="Panel settings"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setMode('hidden')}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            title="Hide (Ctrl+Shift+H)"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={collapseToCircle}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            title="Collapse (Esc)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* In-panel settings popover */}
      {showPopover && (
        <div
          ref={popoverRef}
          className="absolute right-3 top-12 z-50 w-64 rounded-xl border p-3 space-y-3 animate-fade-in shadow-xl"
          style={{
            background: 'var(--bg-850)',
            borderColor: 'var(--overlay-border)',
            backdropFilter: 'blur(20px)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold font-display" style={{ color: 'var(--text-primary)' }}>
              Panel Settings
            </span>
            <button
              onClick={() => setShowPopover(false)}
              className="p-1 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Overlay width slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Panel width</label>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{overlayWidth}px</span>
            </div>
            <input
              type="range"
              min={280}
              max={560}
              step={10}
              value={overlayWidth}
              onChange={(e) => saveSettings({ overlayWidth: Number(e.target.value) })}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, rgb(var(--accent-r), var(--accent-g), var(--accent-b)) ${(overlayWidth - 280) / 280 * 100}%, var(--bg-700) ${(overlayWidth - 280) / 280 * 100}%)`,
              }}
            />
          </div>

          {/* Bubble size slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Bubble size</label>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{bubbleSize}px</span>
            </div>
            <input
              type="range"
              min={32}
              max={72}
              step={2}
              value={bubbleSize}
              onChange={(e) => saveSettings({ bubbleSize: Number(e.target.value) })}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, rgb(var(--accent-r), var(--accent-g), var(--accent-b)) ${(bubbleSize - 32) / 40 * 100}%, var(--bg-700) ${(bubbleSize - 32) / 40 * 100}%)`,
              }}
            />
          </div>

          {/* Overlay opacity slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Opacity</label>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{settings.overlayOpacity}%</span>
            </div>
            <input
              type="range"
              min={30}
              max={100}
              step={5}
              value={settings.overlayOpacity}
              onChange={(e) => saveSettings({ overlayOpacity: Number(e.target.value) })}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, rgb(var(--accent-r), var(--accent-g), var(--accent-b)) ${(settings.overlayOpacity - 30) / 70 * 100}%, var(--bg-700) ${(settings.overlayOpacity - 30) / 70 * 100}%)`,
              }}
            />
          </div>

          {/* Quick size presets */}
          <div className="flex gap-1.5 pt-1">
            {(['small', 'medium', 'large'] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  const w = s === 'small' ? 320 : s === 'medium' ? 380 : 460;
                  saveSettings({ overlaySize: s, overlayWidth: w });
                }}
                className="flex-1 text-xs py-1.5 rounded-lg border transition-all"
                style={{
                  background: settings.overlaySize === s ? `rgba(var(--accent-r), var(--accent-g), var(--accent-b), 0.15)` : 'var(--btn-bg)',
                  borderColor: settings.overlaySize === s ? `rgba(var(--accent-r), var(--accent-g), var(--accent-b), 0.3)` : 'var(--btn-border)',
                  color: settings.overlaySize === s ? `rgb(var(--accent-r), var(--accent-g), var(--accent-b))` : 'var(--text-secondary)',
                }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3"
        style={{ maxHeight: sizeConfig.maxHeight, minHeight: 100 }}
      >
        {messages.length === 0 && !loading && (
          <div className="text-center py-6 animate-fade-in">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--bg-800)' }}
            >
              <Sparkles className="w-5 h-5" style={{ color: `rgb(var(--accent-r), var(--accent-g), var(--accent-b))` }} />
            </div>
            <p className="text-sm font-display font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Ask me anything
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {captureActive ? 'Screenshot ready — I can see your screen' : 'Start screen capture so I can see your game'}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            <div className="max-w-[88%]">
              {msg.screenshotDataUrl && (
                <div className="mb-1.5 rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
                  <img src={msg.screenshotDataUrl} alt="Screenshot" className="w-full h-auto max-h-28 object-cover" />
                </div>
              )}
              <div
                className="rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words"
                style={{
                  background: msg.role === 'user' ? 'var(--msg-user-bg)' : 'var(--msg-ai-bg)',
                  border: `1px solid ${msg.role === 'user' ? 'var(--msg-user-border)' : 'var(--msg-ai-border)'}`,
                  color: 'var(--text-primary)',
                }}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div
              className="rounded-xl px-3.5 py-2.5 border"
              style={{ background: 'var(--msg-ai-bg)', borderColor: 'var(--msg-ai-border)' }}
            >
              <div className="flex items-center gap-2">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>Analyzing...</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            className="flex items-start gap-2 text-sm rounded-xl px-3 py-2 animate-fade-in"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Copy bar */}
      {messages.length > 0 && (
        <div className="px-3 pb-1.5 flex items-center gap-1.5 border-t pt-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={copyLastAnswer}
            className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            {copied ? <Check className="w-3 h-3" style={{ color: '#a3e635' }} /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy last answer'}
          </button>
        </div>
      )}

      {/* Quick action buttons */}
      <div className="px-3 pt-1.5 pb-2 flex items-center gap-1.5 flex-wrap">
        {settings.quickActions.map((action) => (
          <button
            key={action.id}
            onClick={() => sendQuestion(action.prompt)}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded-lg border transition-all disabled:opacity-40"
            style={{
              background: 'var(--btn-bg)',
              borderColor: 'var(--btn-border)',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `rgba(var(--accent-r), var(--accent-g), var(--accent-b), 0.15)`;
              e.currentTarget.style.borderColor = `rgba(var(--accent-r), var(--accent-g), var(--accent-b), 0.3)`;
              e.currentTarget.style.color = `rgb(var(--accent-r), var(--accent-g), var(--accent-b))`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--btn-bg)';
              e.currentTarget.style.borderColor = 'var(--btn-border)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-850)' }}>
        <div className="flex items-end gap-2">
          <button
            onClick={startCapture}
            className="flex-shrink-0 p-2 rounded-xl transition-all border"
            style={{
              background: captureActive ? 'rgba(163,230,53,0.15)' : 'var(--btn-bg)',
              borderColor: captureActive ? 'rgba(163,230,53,0.3)' : 'var(--btn-border)',
              color: captureActive ? '#a3e635' : 'var(--text-muted)',
            }}
            title={captureActive ? 'Screen captured — click to re-share' : 'Start screen capture'}
          >
            <Camera className="w-4 h-4" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendQuestion();
              }
            }}
            placeholder="Ask about your game..."
            rows={sizeConfig.inputRows}
            className="flex-1 rounded-xl px-3 py-2 text-sm transition-all resize-none max-h-24 scrollbar-thin focus:outline-none"
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = `rgba(var(--accent-r), var(--accent-g), var(--accent-b), 0.4)`;
              e.currentTarget.style.boxShadow = `0 0 0 1px rgba(var(--accent-r), var(--accent-g), var(--accent-b), 0.2)`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--input-border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={() => sendQuestion()}
            disabled={loading || !input.trim()}
            className="flex-shrink-0 p-2 rounded-xl text-white transition-all disabled:opacity-30"
            style={{
              background: `linear-gradient(135deg, rgb(var(--accent-r), var(--accent-g), var(--accent-b)), rgb(var(--accent-r), var(--accent-g), var(--accent-b, 0.7)))`,
              boxShadow: `0 4px 12px rgba(var(--accent-r), var(--accent-g), var(--accent-b), 0.2)`,
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {lastScreenshot && (
          <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <img src={lastScreenshot} alt="Last capture" className="w-8 h-8 rounded object-cover border" style={{ borderColor: 'var(--border-subtle)' }} />
            <span>Screenshot attached to last question</span>
          </div>
        )}
      </div>
    </div>
  );
}
