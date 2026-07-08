'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Download,
  ListTodo,
  History,
  Settings,
  Info,
  Music4,
} from 'lucide-react';

const navItems = [
  { href: '/', label: '下载', icon: Download },
  { href: '/tasks', label: '任务', icon: ListTodo },
  { href: '/history', label: '历史', icon: History },
  { href: '/settings', label: '设置', icon: Settings },
  { href: '/about', label: '关于', icon: Info },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 h-screen bg-zinc-900 border-r border-zinc-800 flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-zinc-800">
        <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
          <Music4 className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-white text-lg">AMDL</span>
      </div>

      {/* Nav */}
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

      {/* Footer */}
      <div className="px-5 py-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-500">AMDL v1.0.0</p>
      </div>
    </aside>
  );
}
