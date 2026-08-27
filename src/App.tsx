import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { SettingsProvider } from '@/lib/settings';
import { ThemeApplier } from '@/lib/theme';
import { AuthScreen } from '@/components/AuthScreen';
import { CompanionView } from '@/components/CompanionView';
import { SettingsScreen } from '@/components/SettingsScreen';
import { HistoryScreen } from '@/components/HistoryScreen';
import { Loader2 } from 'lucide-react';

type View = 'companion' | 'settings' | 'history';

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>('companion');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('popout') === '1') {
      document.body.classList.add('popout-mode');
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-950">
        <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <SettingsProvider>
      <ThemeApplier>
        {view === 'companion' && (
          <CompanionView
            onOpenSettings={() => setView('settings')}
            onOpenHistory={() => setView('history')}
          />
        )}
        {view === 'settings' && <SettingsScreen onBack={() => setView('companion')} />}
        {view === 'history' && <HistoryScreen onBack={() => setView('companion')} />}
      </ThemeApplier>
    </SettingsProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
