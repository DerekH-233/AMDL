'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Link, FileText, Loader2, CheckCircle2, XCircle, Music4, ShieldCheck, ShieldAlert, Folder, ListMusic } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import DragOrder, { defaultOrder } from '@/components/DragOrder';
import type { Config } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [urlInput, setUrlInput] = useState('');
  const [cookiesPath, setCookiesPath] = useState('');
  const [outputPath, setOutputPath] = useState('');
  const [config, setConfig] = useState<Config | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [checkingCookies, setCheckingCookies] = useState(false);
  const [cookiesValid, setCookiesValid] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [cookiesMsg, setCookiesMsg] = useState('');
  const [appendYear, setAppendYear] = useState(false);
  const [folderStyle, setFolderStyle] = useState('artist_album');
  const [fileNameOrder, setFileNameOrder] = useState(defaultOrder);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<Config>('/api/config').then((cfg) => {
      setConfig(cfg);
      setOutputPath(localStorage.getItem('amdl_output_path') || cfg.output_path || './Apple Music');
      setFolderStyle(cfg.folder_style || 'artist_album');
      setFileNameOrder(cfg.file_name_order || defaultOrder);
      const saved = localStorage.getItem('amdl_cookies_path') || cfg.cookies_path;
      if (saved) setCookiesPath(saved);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (cookiesPath) {
      localStorage.setItem('amdl_cookies_path', cookiesPath);
      api.put('/api/config', { cookies_path: cookiesPath }).catch(() => {});
    }
    if (outputPath) {
      localStorage.setItem('amdl_output_path', outputPath);
      api.put('/api/config', { output_path: outputPath }).catch(() => {});
    }
    api.put('/api/config', {
      folder_style: folderStyle,
      file_name_order: fileNameOrder,
    }).catch(() => {});
  }, [cookiesPath, outputPath, folderStyle, fileNameOrder]);

  const handleDownload = useCallback(async () => {
    const urls = urlInput.split('\n').map((u) => u.trim()).filter((u) => u.length > 0);
    if (urls.length === 0) return;
    if (!cookiesPath) {
      setStatus('error');
      setStatusMsg(t('please_select_cookies'));
      return;
    }
    setDownloading(true);
    setStatus('idle');
    let latestConfig = config;
    try { latestConfig = await api.get<Config>('/api/config'); } catch { /* use cached */ }
    try {
      const res = await api.post<{ task_id: string }>('/api/tasks', {
        urls,
        cookies_path: cookiesPath,
        output_path: outputPath || latestConfig?.output_path || './Apple Music',
        codec_song: latestConfig?.codec_song || 'aac-web',
        save_cover: latestConfig?.save_cover ?? true,
        save_playlist: latestConfig?.save_playlist ?? true,
        overwrite: latestConfig?.overwrite ?? false,
        no_synced_lyrics: !(latestConfig?.download_lyrics ?? true),
        audio_format: latestConfig?.audio_format || null,
        video_format: latestConfig?.video_format || null,
        append_year: appendYear,
        folder_style: folderStyle,
        file_name_order: folderStyle === 'none' ? fileNameOrder : undefined,
      });
      setStatus('success');
      setStatusMsg(t('task_created', res.task_id));
    } catch (err) {
      setStatus('error');
      setStatusMsg(err instanceof Error ? err.message : t('download_failed'));
    } finally {
      setDownloading(false);
    }
  }, [urlInput, cookiesPath, config, outputPath, router, t, appendYear, folderStyle, fileNameOrder]);

  const handleCookieSelect = useCallback(async () => {
    try {
      const win = window as unknown as Record<string, unknown>;
      if (win.pywebview && (win.pywebview as Record<string, unknown>).api) {
        const api = (win.pywebview as Record<string, unknown>).api as Record<string, (...args: unknown[]) => Promise<string>>;
        const fullPath = await api.select_file('Select cookies.txt', '*.txt');
        if (fullPath) { setCookiesPath(fullPath); setCookiesValid('idle'); setCookiesMsg(''); return; }
      }
    } catch { /* fallback */ }
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const nativePath = (file as unknown as { path?: string }).path;
    if (nativePath) { setCookiesPath(nativePath); setCookiesValid('idle'); setCookiesMsg(''); return; }
    setCheckingCookies(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const base = api.getBase();
      const res = await fetch(`${base}/api/cookies/upload`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json() as { path: string };
      setCookiesPath(data.path);
      setCookiesValid('idle');
      setCookiesMsg('');
    } catch {
      setCookiesValid('invalid');
      setCookiesMsg(t('upload_failed'));
    } finally {
      setCheckingCookies(false);
    }
    e.target.value = '';
  }, [t]);

  const handleCheckCookies = useCallback(async () => {
    if (!cookiesPath) return;
    setCheckingCookies(true);
    setCookiesValid('idle');
    try {
      const res = await api.post<{
        valid: boolean; subscription: boolean; message: string | null; error: string | null;
        storefront: string | null; storefront_name: string | null; storefront_emoji: string | null;
      }>('/api/cookies/check', { cookies_path: cookiesPath });
      if (res.valid && res.subscription) {
        setCookiesValid('valid');
        const emoji = res.storefront_emoji ? ` ${res.storefront_emoji}` : '';
        const region = res.storefront_name ? ` (${res.storefront_name}${emoji})` : '';
        setCookiesMsg(t('cookies_valid_sub') + region);
      } else if (res.valid) {
        setCookiesValid('valid');
        setCookiesMsg(t('cookies_valid_nosub'));
      } else {
        setCookiesValid('invalid');
        setCookiesMsg(res.error || t('cookies_invalid'));
      }
    } catch (err) {
      setCookiesValid('invalid');
      setCookiesMsg(err instanceof Error ? err.message : t('check_failed'));
    } finally {
      setCheckingCookies(false);
    }
  }, [cookiesPath, t]);

  const urlLines = urlInput.split('\n').filter((u) => u.trim());
  const hasPlaylist = urlLines.some((u) => u.includes('playlist'));
  const hasAlbum = urlLines.some((u) => u.includes('album'));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">{t('download_title')}</h1>
        <p className="text-zinc-400">{t('download_desc')}</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-3">
          <Link className="w-4 h-4" />{t('url_label')}
        </label>
        <textarea className="w-full h-32 resize-none"
          placeholder={t('url_placeholder') + '\nhttps://music.apple.com/cn/album/xxx\nhttps://music.apple.com/cn/playlist/xxx'}
          value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-zinc-500">
            {urlLines.length > 0 ? t('url_count', urlLines.length) : t('url_hint')}
            {hasPlaylist && (
              <span className="ml-3 inline-flex items-center gap-1 text-yellow-400">
                <ListMusic className="w-3.5 h-3.5" />{t('playlist_detected')}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-3">
          <FileText className="w-4 h-4" />{t('cookies_label')}
        </label>
        <div className="flex gap-3">
          <input type="text" className="flex-1" placeholder={t('cookies_placeholder')} value={cookiesPath}
            onChange={(e) => { setCookiesPath(e.target.value); setCookiesValid('idle'); }} />
          <input ref={fileInputRef} type="file" accept=".txt" className="hidden" onChange={handleFileChange} />
          <button className="btn-ghost" onClick={handleCookieSelect}>{t('cookies_browse')}</button>
          <button className="btn-ghost flex items-center gap-1" onClick={handleCheckCookies} disabled={!cookiesPath || checkingCookies}>
            {checkingCookies ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {t('cookies_check')}
          </button>
        </div>
        {cookiesValid === 'valid' && (
          <p className="flex items-center gap-1 text-xs text-green-400 mt-2"><CheckCircle2 className="w-3.5 h-3.5" />{cookiesMsg}</p>
        )}
        {cookiesValid === 'invalid' && (
          <p className="flex items-center gap-1 text-xs text-red-400 mt-2"><XCircle className="w-3.5 h-3.5" />{cookiesMsg}</p>
        )}
        <p className="text-xs text-zinc-500 mt-2">{t('cookies_hint')}</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-3">
          <Folder className="w-4 h-4" />{t('output_label')}
        </label>
        <input type="text" className="w-full" placeholder="./Apple Music" value={outputPath} onChange={(e) => setOutputPath(e.target.value)} />
        <p className="text-xs text-zinc-500 mt-2">{t('output_hint')}</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <label className="text-sm font-medium text-zinc-300 block mb-3">{t('folder_structure')}</label>
        <select className="w-full mb-3" value={folderStyle} onChange={(e) => setFolderStyle(e.target.value)}>
          <option value="artist_album">{t('artist_first')}</option>
          <option value="album_artist">{t('album_first')}</option>
          <option value="none">{t('single_track')}</option>
        </select>
        {folderStyle === 'none' && (
          <div>
            <label className="text-xs text-zinc-400 block mb-2">{t('file_name_order')}</label>
            <DragOrder value={fileNameOrder} onChange={setFileNameOrder} />
            <p className="text-xs text-zinc-500 mt-1">{t('drag_hint')}</p>
          </div>
        )}
      </div>

      {hasAlbum && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm text-zinc-300">{t('append_year_label')}</span>
              <p className="text-xs text-zinc-500 mt-0.5">{t('append_year_desc')}</p>
            </div>
            <button
              className={`w-10 h-6 rounded-full transition-colors relative ${appendYear ? 'bg-blue-500' : 'bg-zinc-700'}`}
              onClick={() => setAppendYear(!appendYear)}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${appendYear ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </label>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button className="btn-primary flex items-center gap-2 px-8 py-3 text-base"
          onClick={handleDownload} disabled={downloading || urlLines.length === 0 || !cookiesPath}>
          {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          {downloading ? t('downloading_btn') : t('download_btn')}
        </button>
        {status === 'success' && (
          <span className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4" />{statusMsg}
            <a href="/tasks" className="text-blue-400 hover:underline ml-2">{t('go_to_tasks')}</a>
          </span>
        )}
        {status === 'error' && (
          <span className="flex items-center gap-2 text-red-400 text-sm"><XCircle className="w-4 h-4" />{statusMsg}</span>
        )}
      </div>

      <div className="mt-8 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">{t('supported_links')}</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: t('song'), url: 'music.apple.com/.../song/...' },
            { label: t('album'), url: 'music.apple.com/.../album/...' },
            { label: t('playlist'), url: 'music.apple.com/.../playlist/...' },
            { label: t('music_video'), url: 'music.apple.com/.../music-video/...' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              <Music4 className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <span className="text-zinc-400">{item.label}</span>
              <span className="text-zinc-600 text-xs truncate">{item.url}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
