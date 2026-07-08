'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, RotateCcw, Settings, Trash2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Config, ApiInfo } from '@/types';

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [apiInfo, setApiInfo] = useState<ApiInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiBase, setApiBase] = useState(api.getBase());
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState('');

  useEffect(() => {
    api.get<Config>('/api/config').then(setConfig).catch(() => {});
    api.get<ApiInfo>('/api/info').then(setApiInfo).catch(() => {});
  }, []);

  const updateField = useCallback(
    (key: keyof Config, value: string | number | boolean | null) => {
      setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
      setSaved(false);
    },
    []
  );

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.put('/api/config', config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleSaveApiBase = () => {
    api.setBase(apiBase);
    localStorage.setItem('amdl_api_base', apiBase);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCleanup = async (action: string) => {
    const messages: Record<string, string> = {
      temp: '确定清除所有临时文件？',
      output: '确定清除所有已下载的文件？此操作不可恢复！',
      history: '确定清空所有下载任务和历史记录？',
    };
    if (!confirm(messages[action] || '确定？')) return;
    setCleaning(true);
    setCleanResult('');
    try {
      if (action === 'history') {
        await api.del('/api/history');
        setCleanResult('下载列表和历史已清空');
      } else {
        const res = await api.post<{ success: boolean; temp_deleted: number; output_deleted: number }>(
          `/api/cleanup?clear_output=${action === 'output'}`
        );
        setCleanResult(action === 'temp'
          ? `已清理 ${res.temp_deleted} 个临时文件`
          : `已清理 ${res.temp_deleted} 个临时文件，${res.output_deleted} 个下载文件`);
      }
    } catch (err) {
      setCleanResult('清理失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setCleaning(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('确定恢复默认设置？')) return;
    try {
      await api.put('/api/config', {});
      const data = await api.get<Config>('/api/config');
      setConfig(data);
    } catch {
      // ignore
    }
  };

  if (!config) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 text-zinc-500">
        加载中...
      </div>
    );
  }

  const codecLabels: Record<string, string> = {
    'aac-web': 'AAC 256kbps (推荐)',
    'aac-he-web': 'AAC-HE Web',
    'alac': 'ALAC 无损',
    'atmos': 'Dolby Atmos',
    'aac': 'AAC',
    'aac-he': 'AAC-HE',
    'aac-binaural': 'AAC 双耳',
    'aac-downmix': 'AAC 缩混',
    'aac-he-binaural': 'AAC-HE 双耳',
    'aac-he-downmix': 'AAC-HE 缩混',
    'ac3': 'AC3',
    'ask': '每次询问',
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">设置</h1>
          <p className="text-zinc-400">自定义下载行为和外观</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-ghost flex items-center gap-2" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
            恢复默认
          </button>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : saved ? '已保存' : '保存设置'}
          </button>
        </div>
      </div>

      {/* API 地址 */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          后端服务
        </h2>
        <label className="text-xs text-zinc-400 block mb-1">API 地址</label>
        <div className="flex gap-3">
          <input
            type="text"
            className="flex-1"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
          />
          <button className="btn-primary text-xs" onClick={handleSaveApiBase}>
            连接
          </button>
        </div>
      </section>

      {/* 下载设置 */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-white mb-4">下载设置</h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">下载目录</label>
            <input
              type="text"
              className="w-full"
              value={config.output_path}
              onChange={(e) => updateField('output_path', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">文件夹结构</label>
            <select
              className="w-full"
              value={config.folder_style || 'artist_album'}
              onChange={(e) => updateField('folder_style' as keyof Config, e.target.value)}
            >
              <option value="artist_album">歌手/专辑/歌曲</option>
              <option value="album_artist">专辑/歌手/歌曲</option>
              <option value="none">仅单曲</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">临时目录</label>
            <input
              type="text"
              className="w-full"
              value={config.temp_path}
              onChange={(e) => updateField('temp_path', e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">音频编码</label>
            <select
              className="w-full"
              value={config.codec_song}
              onChange={(e) => updateField('codec_song', e.target.value)}
            >
              {apiInfo?.supported_codecs_song.map((c) => (
                <option key={c.value} value={c.value}>
                  {codecLabels[c.value] || c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">
              音乐视频编码
            </label>
            <select
              className="w-full"
              value={config.codec_music_video}
              onChange={(e) => updateField('codec_music_video', e.target.value)}
            >
              {apiInfo?.supported_codecs_music_video.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">转换格式</label>
            <select
              className="w-full"
              value={config.audio_format || ''}
              onChange={(e) =>
                updateField('audio_format', e.target.value || null)
              }
            >
              <option value="">不转换（保持原始格式）</option>
              <option value="mp3">MP3 320kbps</option>
              <option value="flac">FLAC 无损</option>
              <option value="wav">WAV</option>
              <option value="aac">AAC 256kbps</option>
              <option value="ogg">OGG Vorbis</option>
              <option value="alac">ALAC</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">
              同步歌词格式
            </label>
            <select
              className="w-full"
              value={config.synced_lyrics_format}
              onChange={(e) => updateField('synced_lyrics_format', e.target.value)}
            >
              {apiInfo?.supported_synced_lyrics_formats.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">封面尺寸</label>
            <input
              type="number"
              className="w-full"
              value={config.cover_size}
              onChange={(e) => updateField('cover_size', parseInt(e.target.value) || 1200)}
              min={50}
              max={5000}
            />
          </div>
        </div>

        {/* 开关选项 */}
        <div className="mt-6 space-y-3">
          {[
            { key: 'download_lyrics' as const, label: '同时下载歌词（LRC）', desc: '关闭可减少资源占用' },
            { key: 'save_cover' as const, label: '保存封面图片' },
            { key: 'save_playlist' as const, label: '保存播放列表文件' },
            { key: 'overwrite' as const, label: '覆盖已有文件' },
          ].map(({ key, label, desc }) => {
            const value = config ? (config[key] ?? true) : true;
            return (
            <label
              key={key}
              className="flex items-center justify-between py-2 cursor-pointer"
            >
              <div>
                <span className="text-sm text-zinc-300">{label}</span>
                {desc && <p className="text-xs text-zinc-500">{desc}</p>}
              </div>
              <button
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  value ? 'bg-blue-500' : 'bg-zinc-700'
                }`}
                onClick={() => updateField(key as keyof Config, !value)}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    value ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </label>
          )})}
        </div>
      </section>

      {/* 清理 */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-400" />
          清理
        </h2>
        <div className="flex gap-3 flex-wrap">
          <button
            className="btn-ghost flex items-center gap-2"
            onClick={() => handleCleanup('temp')}
            disabled={cleaning}
          >
            {cleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            清除临时文件
          </button>
          <button
            className="btn-ghost flex items-center gap-2"
            onClick={() => handleCleanup('history')}
            disabled={cleaning}
          >
            {cleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            清空下载列表
          </button>
          <button
            className="btn-danger flex items-center gap-2"
            onClick={() => handleCleanup('output')}
            disabled={cleaning}
          >
            {cleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            清空已下载文件
          </button>
        </div>
        {cleanResult && (
          <p className="text-xs text-zinc-400 mt-2">{cleanResult}</p>
        )}
      </section>
    </div>
  );
}
