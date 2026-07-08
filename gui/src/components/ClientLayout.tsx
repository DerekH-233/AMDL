'use client';

import { I18nProvider } from '@/lib/i18n';
import Sidebar from './Sidebar';
import type { ReactNode } from 'react';

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <Sidebar />
      <main className="ml-56 flex-1 min-h-screen p-8">
        {children}
      </main>
    </I18nProvider>
  );
}
