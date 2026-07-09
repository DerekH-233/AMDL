'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Download, ListTodo, History, Settings, Info, Music4, Languages } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api';

export default function Sidebar() {
  const pathname = usePathname();
  const { t, lang, setLang } = useI18n();
  const [version, setVersion] = useState('');

  useEffect(() => {
    api.get<{ version: string }>('/api/version').then(r => setVersion(r.version)).catch(() => {});
  }, []);

  const navItems = [
    { href: '/', label: t('download'), icon: Download },
    { href: '/tasks', label: t('tasks'), icon: ListTodo },
    { href: '/history', label: t('history'), icon: History },
    { href: '/settings', label: t('settings'), icon: Settings },
    { href: '/about', label: t('about'), icon: Info },
  ];

  return (
    <aside className="w-56 h-screen bg-zinc-900 border-r border-zinc-800 flex flex-col fixed left-0 top-0">
      <div className="h-16 flex items-center gap-3 px-5 border-b border-zinc-800">
        <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
          <Music4 className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-white text-lg">{t('app_name')}</span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 语言切换 + 版本 */}
      <div className="px-3 py-3 border-t border-zinc-800 space-y-2">
        <button
          onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
        >
          <Languages className="w-4 h-4" />
          {lang === 'zh' ? 'English' : '中文'}
        </button>
        <p className="text-xs text-zinc-500 px-3">AMDL v{version || '---'}</p>
      </div>
    </aside>
  );
}
