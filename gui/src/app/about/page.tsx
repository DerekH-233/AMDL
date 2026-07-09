'use client';

import { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

export default function AboutPage() {
  const { t } = useI18n();
  const [checking, setChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'up-to-date' | 'update-available' | 'error'>('idle');
  const [updateMsg, setUpdateMsg] = useState('');
  const [updateUrl, setUpdateUrl] = useState('');

  const handleCheckUpdate = async () => {
    setChecking(true);
    setUpdateStatus('idle');
    try {
      const res = await api.get<{
        current: string;
        latest: string | null;
        has_update: boolean;
        error: string | null;
        release_url: string | null;
      }>('/api/update/check');

      if (res.error) {
        setUpdateStatus('error');
        setUpdateMsg(res.error);
      } else if (res.has_update) {
        setUpdateStatus('update-available');
        setUpdateMsg(t('new_version', res.latest || '', res.current));
        setUpdateUrl(res.release_url || '');
      } else {
        setUpdateStatus('up-to-date');
        setUpdateMsg(t('up_to_date', res.current));
      }
    } catch {
      setUpdateStatus('error');
      setUpdateMsg(t('check_failed'));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">{t('about_title')}</h1>
      <p className="text-zinc-400 mb-8">Apple Music Downloader v1.0.3</p>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">{t('update_section')}</h2>
        <div className="flex items-center gap-4">
          <button
            className="btn-primary flex items-center gap-2"
            onClick={handleCheckUpdate}
            disabled={checking}
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? t('checking') : t('check_update')}
          </button>

          {updateStatus === 'up-to-date' && (
            <span className="flex items-center gap-1 text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              {updateMsg}
            </span>
          )}
          {updateStatus === 'update-available' && (
            <span className="flex items-center gap-2 text-yellow-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {updateMsg}
              {updateUrl && (
                <a href={updateUrl} target="_blank" rel="noopener noreferrer"
                  className="text-blue-400 hover:underline inline-flex items-center gap-1">
                  {t('go_download')} <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </span>
          )}
          {updateStatus === 'error' && (
            <span className="flex items-center gap-1 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {updateMsg}
            </span>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">{t('project_info')}</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">{t('version')}</span>
            <span className="text-white font-mono">1.0.2</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">{t('backend')}</span>
            <span className="text-white">FastAPI + gamdl</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">{t('frontend')}</span>
            <span className="text-white">Next.js + TypeScript + Tailwind</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">{t('desktop_shell')}</span>
            <span className="text-white">pywebview</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">{t('platform')}</span>
            <span className="text-white">Windows</span>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">{t('acknowledgments')}</h2>
        <p className="text-sm text-zinc-400 mb-3">{t('ack_desc')}</p>
        <ul className="space-y-2 text-sm">
          <li>
            <a href="https://github.com/glomatico/gamdl" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">glomatico/gamdl</a>
            <span className="text-zinc-500"> — {t('ack_gamdl')}</span>
          </li>
          <li>
            <a href="https://github.com/yt-dlp/yt-dlp" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">yt-dlp/yt-dlp</a>
            <span className="text-zinc-500"> — {t('ack_ytdlp')}</span>
          </li>
          <li>
            <a href="https://github.com/wenfeng110402/AppleMusic-Downloader" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">wenfeng110402/AppleMusic-Downloader</a>
            <span className="text-zinc-500"> — {t('ack_wenfeng')}</span>
          </li>
        </ul>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-3">{t('disclaimer')}</h2>
        <p className="text-sm text-zinc-400 leading-relaxed">{t('disclaimer_text')}</p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-6 text-sm text-zinc-500">
        <a href="https://github.com/DerekH-233/AMDL" className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors" target="_blank" rel="noopener noreferrer">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
          DerekH-233/AMDL
        </a>
      </div>
    </div>
  );
}
