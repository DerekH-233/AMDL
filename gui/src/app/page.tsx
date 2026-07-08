'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Link, FileText, Loader2, CheckCircle2, XCircle, Music4, ShieldCheck, ShieldAlert, Folder, ListMusic } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载配置 & 恢复上次的值
  useEffect(() => {
    api.get<Config>('/api/config').then((cfg) => {
      setConfig(cfg);
      setOutputPath(localStorage.getItem('amdl_output_path') || cfg.output_path || './Apple Music');
      // 优先 localStorage，其次后端配置（跨重启持久化）
      const saved = localStorage.getItem('amdl_cookies_path') || cfg.cookies_path;
      if (saved) setCookiesPath(saved);
    }).catch(() => {});
  }, []);

  // 自动保存到 localStorage + 后端配置
  useEffect(() => {
    if (cookiesPath) {
      localStorage.setItem('amdl_cookies_path', cookiesPath);
      // 同时保存到后端配置，确保重启不丢失
      api.put('/api/config', { cookies_path: cookiesPath }).catch(() => {});
    }
    if (outputPath) {
      localStorage.setItem('amdl_output_path', outputPath);
      api.put('/api/config', { output_path: outputPath }).catch(() => {});
    }
  }, [cookiesPath, outputPath]);



  const handleDownload = useCallback(async () => {
    const urls = urlInput
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (urls.length === 0) return;
    if (!cookiesPath) {
      setStatus('error');
      setStatusMsg(t('please_select_cookies'));
      return;
    }

    setDownloading(true);
    setStatus('idle');

    // 实时拉取最新配置（确保设置页面的修改生效）
    let latestConfig = config;
    try {
      latestConfig = await api.get<Config>('/api/config');
    } catch { /* use cached */ }

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
      });

      setStatus('success');
      setStatusMsg(t('task_created', res.task_id));
    } catch (err) {
      setStatus('error');
      setStatusMsg(err instanceof Error ? err.message : '下载请求失败');
    } finally {
      setDownloading(false);
    }
  }, [urlInput, cookiesPath, config, outputPath, router]);

  // 浏览按钮：优先用 pywebview 原生对话框（返回完整路径），浏览器则上传文件
  const handleCookieSelect = useCallback(async () => {
    try {
      // 方式1: pywebview 桌面环境 → 拿到完整文件路径
      const win = window as unknown as Record<string, unknown>;
      if (win.pywebview && (win.pywebview as Record<string, unknown>).api) {
        const api = (win.pywebview as Record<string, unknown>).api as Record<string, (...args: unknown[]) => Promise<string>>;
        const fullPath = await api.select_file("选择 cookies.txt 文件", "*.txt");
        if (fullPath) {
          setCookiesPath(fullPath);
          setCookiesValid('idle');
          setCookiesMsg('');
          return;
        }
      }
    } catch {
      // pywebview API 不可用时走方式2
    }

    // 方式2: 浏览器环境 → 使用文件选择器 + 上传
    fileInputRef.current?.click();
  }, []);

  // 浏览器文件选择后的上传处理
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 尝试获取完整路径（Electron/部分浏览器支持）
    const nativePath = (file as unknown as { path?: string }).path;
    if (nativePath) {
      setCookiesPath(nativePath);
      setCookiesValid('idle');
      setCookiesMsg('');
      return;
    }

    // 不支持完整路径 → 上传到后端
    setCheckingCookies(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const base = api.getBase();
      const res = await fetch(`${base}/api/cookies/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('上传失败');
      const data = await res.json() as { path: string };
      setCookiesPath(data.path);
      setCookiesValid('idle');
      setCookiesMsg('');
    } catch (err) {
      setCookiesValid('invalid');
      setCookiesMsg('文件上传失败，请手动输入完整路径');
    } finally {
      setCheckingCookies(false);
    }

    // 重置 input 以允许重复选择同一文件
    e.target.value = '';
  }, []);

  // 检测 cookies 有效性
  const handleCheckCookies = useCallback(async () => {
    if (!cookiesPath) return;
    setCheckingCookies(true);
    setCookiesValid('idle');
    try {
      const res = await api.post<{ valid: boolean; subscription: boolean; message: string; error: string | null }>(
        '/api/cookies/check',
        { cookies_path: cookiesPath }
      );
      if (res.valid && res.subscription) {
        setCookiesValid('valid');
        setCookiesMsg(res.message || 'cookies 有效，已订阅 Apple Music');
      } else if (res.valid) {
        setCookiesValid('valid');
        setCookiesMsg(res.message || 'cookies 有效，但未检测到订阅');
      } else {
        setCookiesValid('invalid');
        setCookiesMsg(res.error || 'cookies 无效');
      }
    } catch (err) {
      setCookiesValid('invalid');
      setCookiesMsg(err instanceof Error ? err.message : '检测失败');
    } finally {
      setCheckingCookies(false);
    }
  }, [cookiesPath]);

  const urlLines = urlInput.split('\n').filter((u) => u.trim());
  const hasPlaylist = urlLines.some((u) => u.includes('playlist'));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">{t('download_title')}</h1>
        <p className="text-zinc-400">{t('download_desc')}</p>
      </div>

      {/* URL 输入区 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-3">
          <Link className="w-4 h-4" />
          Apple Music 链接
        </label>
        <textarea
          className="w-full h-32 resize-none"
          placeholder={`粘贴 Apple Music 链接，每行一个：\nhttps://music.apple.com/cn/album/xxx\nhttps://music.apple.com/cn/playlist/xxx`}
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
        />
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-zinc-500">
            {urlLines.length > 0
              ? `已输入 ${urlLines.length} 个链接`
              : '支持歌曲、专辑、播放列表、MV 链接'}
            {hasPlaylist && (
              <span className="ml-3 inline-flex items-center gap-1 text-yellow-400">
                <ListMusic className="w-3.5 h-3.5" />
                检测到歌单 — 将以歌单名建文件夹
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Cookies 文件选择 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-3">
          <FileText className="w-4 h-4" />
          Cookies 文件
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            className="flex-1"
            placeholder="cookies.txt 文件路径..."
            value={cookiesPath}
            onChange={(e) => {
              setCookiesPath(e.target.value);
              setCookiesValid('idle');
            }}
          />
          {/* 隐藏的文件选择器 */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={handleFileChange}
          />
          <button className="btn-ghost" onClick={handleCookieSelect}>
            浏览...
          </button>
          <button
            className="btn-ghost flex items-center gap-1"
            onClick={handleCheckCookies}
            disabled={!cookiesPath || checkingCookies}
          >
            {checkingCookies ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            检测
          </button>
        </div>

        {/* Cookies 验证结果 */}
        {cookiesValid === 'valid' && (
          <p className="flex items-center gap-1 text-xs text-green-400 mt-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {cookiesMsg}
          </p>
        )}
        {cookiesValid === 'invalid' && (
          <p className="flex items-center gap-1 text-xs text-red-400 mt-2">
            <XCircle className="w-3.5 h-3.5" />
            {cookiesMsg}
          </p>
        )}

        <p className="text-xs text-zinc-500 mt-2">
          导出浏览器 cookies 为 Netscape 格式，或直接输入路径。建议先点击「检测」验证有效性。
        </p>
      </div>

      {/* 输出路径 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-3">
          <Folder className="w-4 h-4" />
          保存路径
        </label>
        <input
          type="text"
          className="w-full"
          placeholder="./Apple Music"
          value={outputPath}
          onChange={(e) => setOutputPath(e.target.value)}
        />
        <p className="text-xs text-zinc-500 mt-2">
          下载文件的保存目录，可填写相对路径或绝对路径
        </p>
      </div>

      {/* 下载按钮 */}
      <div className="flex items-center gap-4">
        <button
          className="btn-primary flex items-center gap-2 px-8 py-3 text-base"
          onClick={handleDownload}
          disabled={downloading || urlLines.length === 0 || !cookiesPath}
        >
          {downloading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Download className="w-5 h-5" />
          )}
          {downloading ? '正在创建任务...' : '开始下载'}
        </button>

        {status === 'success' && (
          <span className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            {statusMsg}
            <a href="/tasks" className="text-blue-400 hover:underline ml-2">
              前往任务页查看进度 →
            </a>
          </span>
        )}
        {status === 'error' && (
          <span className="flex items-center gap-2 text-red-400 text-sm">
            <XCircle className="w-4 h-4" />
            {statusMsg}
          </span>
        )}
      </div>

      {/* 支持的链接类型提示 */}
      <div className="mt-8 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">支持的链接类型</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Music4, label: '歌曲', url: 'music.apple.com/.../song/...' },
            { icon: Music4, label: '专辑', url: 'music.apple.com/.../album/...' },
            { icon: Music4, label: '播放列表', url: 'music.apple.com/.../playlist/...' },
            { icon: Music4, label: '音乐视频', url: 'music.apple.com/.../music-video/...' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 text-sm text-zinc-500"
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
              <span className="text-zinc-600 text-xs truncate">{item.url}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
