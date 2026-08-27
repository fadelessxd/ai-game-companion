import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, History as HistoryIcon, Search, MessageSquare, Image as ImageIcon,
  Trash2, Loader2, ChevronRight, X, Copy, Check, RotateCcw, Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Conversation, Message } from '@/lib/types';

interface HistoryScreenProps {
  onBack: () => void;
}

interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export function HistoryScreen({ onBack }: HistoryScreenProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithMessages[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ConversationWithMessages | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('History load error:', error);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convIds = data.map((c) => c.id);
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: true });

    const grouped: ConversationWithMessages[] = data.map((conv) => ({
      ...conv,
      messages: (msgs || []).filter((m) => m.conversation_id === conv.id),
    }));

    setConversations(grouped);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('conversations').delete().eq('id', id);
    if (error) {
      console.error('Delete error:', error);
      return;
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = conversations.filter((conv) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      conv.title.toLowerCase().includes(q) ||
      conv.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-950)' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 glass-strong border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Companion
          </button>
          <h1 className="text-lg font-semibold font-display flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <HistoryIcon className="w-5 h-5" style={{ color: `rgb(var(--accent-r), var(--accent-g), var(--accent-b))` }} />
            History
          </h1>
          <div className="w-32" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations and messages..."
            className="w-full bg-base-800/60 border border-base-700/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/40 focus:ring-1 focus:ring-primary-500/20 transition-all"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-base-800/60 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-slate-400 text-sm">
              {search ? 'No conversations match your search' : 'No conversations yet. Start asking questions from the overlay!'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((conv) => {
              const lastMsg = conv.messages[conv.messages.length - 1];
              const userMsgs = conv.messages.filter((m) => m.role === 'user');
              const hasScreenshots = conv.messages.some((m) => m.screenshot_url);
              const date = new Date(conv.updated_at);

              return (
                <div
                  key={conv.id}
                  className="glass rounded-2xl p-4 hover:border-primary-500/30 transition-all cursor-pointer group animate-slide-up"
                  onClick={() => setSelected(conv)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white truncate">{conv.title}</span>
                        {hasScreenshots && (
                          <ImageIcon className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                        )}
                      </div>
                      {lastMsg && (
                        <p className="text-xs text-slate-400 truncate">
                          {lastMsg.role === 'assistant' ? 'AI: ' : 'You: '}{lastMsg.content}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>{userMsgs.length} question{userMsgs.length !== 1 ? 's' : ''}</span>
                        <span className="px-1.5 py-0.5 rounded bg-base-800/60 text-slate-400">{conv.genre}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(conv.id); }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-error-400 hover:bg-error-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-[100] bg-base-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelected(null)}
        >
          <div
            className="glass-strong rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-base-700/60">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">{selected.title}</h3>
                <p className="text-xs text-slate-500">
                  {new Date(selected.created_at).toLocaleString()} · {selected.genre} · {selected.provider}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-base-700/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4">
              {selected.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[85%]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-slate-500">
                        {msg.role === 'user' ? 'You' : 'AI'}
                      </span>
                      <span className="text-xs text-slate-600">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.screenshot_url && (
                        <ImageIcon className="w-3 h-3 text-primary-400" />
                      )}
                    </div>
                    {msg.screenshot_url && (
                      <div className="mb-1.5 rounded-lg overflow-hidden border border-base-700/40">
                        <img src={msg.screenshot_url} alt="Screenshot" className="w-full max-h-48 object-cover" />
                      </div>
                    )}
                    <div
                      className={`rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words ${
                        msg.role === 'user'
                          ? 'bg-primary-500/20 text-slate-100 border border-primary-500/20'
                          : 'bg-base-800/60 text-slate-200 border border-base-700/40'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => copyMessage(msg.id, msg.content)}
                        className="mt-1 text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-accent-400" /> : <Copy className="w-3 h-3" />}
                        {copiedId === msg.id ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
