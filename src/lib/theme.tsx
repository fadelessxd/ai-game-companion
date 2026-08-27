import { useEffect, type ReactNode } from 'react';
import { useSettings } from './settings';

export function ThemeApplier({ children }: { children: ReactNode }) {
  const { settings } = useSettings();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  return <>{children}</>;
}
