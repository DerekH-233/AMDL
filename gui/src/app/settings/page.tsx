'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, RotateCcw, Trash2, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import DragOrder, { defaultOrder } from '@/components/DragOrder';
import type { Config, ApiInfo } from '@/types';

export default function SettingsPage() {
  const { t } = useI18n();
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

  const updateField = useCallback((key: keyof Config, value: string | number | boolean | null | string[]) => {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try { await api.put('/api/config', config); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleSaveApiBase = () => { api.setBase(apiBase); localStorage.setItem('amdl_api_base', apiBase); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const handleReset = async () => { if (!confirm(t('confirm_reset'))) return; try { await api.put('/api/config', {}); const data = await api.get<Config>('/api/config'); setConfig(data); } catch { /* ignore */ } };

  const handleCleanup = async (action: string) => {
    const messages: Record<string, string> = {
      temp: t('confirm_clean_temp'),
      output: t('confirm_clean_output'),
      history: t('confirm_clean_history'),
    };
    if (!confirm(messages[action] || t('confirm_default'))) return;
    setCleaning(true); setCleanResult('');
    try {
      if (action === 'history') {
        await api.del('/api/history');
        setCleanResult(t('cleanup_history'));
      } else {
        const res = await api.post<{ success: boolean; temp_deleted: number; output_deleted: number }>(`/api/cleanup?clear_output=${action === 'output'}`);
        setCleanResult(action === 'temp' ? t('cleanup_done', res.temp_deleted) : t('cleanup_output_done', res.temp_deleted, res.output_deleted));
      }
    } catch (err) { setCleanResult(t('download_failed')); }
    finally { setCleaning(false); }
  };

  const codecLabels: Record<string, string> = {
    'aac-web': 'AAC 256kbps ' + t('recommended'),
    'aac-he-web': 'AAC-HE Web', 'alac': 'ALAC ' + t('lossless'),
    'atmos': 'Dolby Atmos', 'aac': 'AAC', 'aac-he': 'AAC-HE',
    'aac-binaural': 'AAC Binaural', 'aac-downmix': 'AAC Downmix',
    'aac-he-binaural': 'AAC-HE Binaural', 'aac-he-downmix': 'AAC-HE Downmix',
    'ac3': 'AC3', 'ask': t('ask_each'),
  };

  if (!config) return <div className="max-w-2xl mx-auto text-center py-20 text-zinc-500">{t('loading')}</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('settings_title')}</h1>
          <p className="text-zinc-400">{t('settings_desc')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-ghost flex items-center gap-2" onClick={handleReset}><RotateCcw className="w-4 h-4" />{t('reset')}</button>
          <button className="btn-primary flex items-center gap-2" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" />{saving ? t('saving') : saved ? t('saved') : t('save_settings')}
          </button>
        </div>
      </div>

      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-white mb-4">{t('backend_service')}</h2>
        <label className="text-xs text-zinc-400 block mb-1">{t('api_address')}</label>
        <div className="flex gap-3">
          <input type="text" className="flex-1" value={apiBase} onChange={(e) => setApiBase(e.target.value)} />
          <button className="btn-primary text-xs" onClick={handleSaveApiBase}>{t('connect_btn')}</button>
        </div>
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-white mb-4">{t('download_settings')}</h2>
        <div className="space-y-4">
          <div><label className="text-xs text-zinc-400 block mb-1">{t('download_dir')}</label>
            <input type="text" className="w-full" value={config.output_path} onChange={(e) => updateField('output_path', e.target.value)} /></div>
          <div><label className="text-xs text-zinc-400 block mb-1">{t('folder_structure')}</label>
            <select className="w-full" value={config.folder_style || 'artist_album'} onChange={(e) => updateField('folder_style' as keyof Config, e.target.value)}>
              <option value="artist_album">{t('artist_first')}</option>
              <option value="album_artist">{t('album_first')}</option>
              <option value="none">{t('single_track')}</option>
            </select></div>
          {(config.folder_style || 'artist_album') === 'none' && (
            <div><label className="text-xs text-zinc-400 block mb-2">{t('file_name_order')}</label>
              <DragOrder value={config.file_name_order || defaultOrder}
                onChange={(order) => updateField('file_name_order' as keyof Config, order as unknown as string)} />
              <p className="text-xs text-zinc-500 mt-1">{t('drag_hint')}</p></div>
          )}
          <div><label className="text-xs text-zinc-400 block mb-1">{t('temp_dir')}</label>
            <input type="text" className="w-full" value={config.temp_path} onChange={(e) => updateField('temp_path', e.target.value)} /></div>
          <div><label className="text-xs text-zinc-400 block mb-1">{t('audio_codec')}</label>
            <select className="w-full" value={config.codec_song} onChange={(e) => updateField('codec_song', e.target.value)}>
              {apiInfo?.supported_codecs_song.map((c) => <option key={c.value} value={c.value}>{codecLabels[c.value] || c.label}</option>)}
            </select></div>
          <div><label className="text-xs text-zinc-400 block mb-1">{t('video_codec')}</label>
            <select className="w-full" value={config.codec_music_video} onChange={(e) => updateField('codec_music_video', e.target.value)}>
              {apiInfo?.supported_codecs_music_video.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select></div>
          <div><label className="text-xs text-zinc-400 block mb-1">{t('convert_format')}</label>
            <select className="w-full" value={config.audio_format || ''} onChange={(e) => updateField('audio_format', e.target.value || null)}>
              <option value="">{t('keep_original')}</option>
              <option value="mp3">MP3 320kbps</option>
              <option value="flac">FLAC {t('lossless')}</option>
              <option value="wav">WAV</option>
              <option value="aac">AAC 256kbps</option>
              <option value="ogg">OGG Vorbis</option>
              <option value="alac">ALAC</option>
            </select></div>
          <div><label className="text-xs text-zinc-400 block mb-1">{t('lyrics_format')}</label>
            <select className="w-full" value={config.synced_lyrics_format} onChange={(e) => updateField('synced_lyrics_format', e.target.value)}>
              {apiInfo?.supported_synced_lyrics_formats.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select></div>
          <div><label className="text-xs text-zinc-400 block mb-1">{t('cover_size')}</label>
            <input type="number" className="w-full" value={config.cover_size} onChange={(e) => updateField('cover_size', parseInt(e.target.value) || 1200)} min={50} max={5000} /></div>
        </div>
        <div className="mt-6 space-y-3">
          {[
            { key: 'download_lyrics' as const, label: t('download_lyrics_label'), desc: t('download_lyrics_desc') },
            { key: 'save_cover' as const, label: t('save_cover_label') },
            { key: 'save_playlist' as const, label: t('save_playlist_label') },
            { key: 'overwrite' as const, label: t('overwrite_label') },
          ].map(({ key, label, desc }) => {
            const value = config ? (config[key] ?? true) : true;
            return (
              <label key={key} className="flex items-center justify-between py-2 cursor-pointer">
                <div><span className="text-sm text-zinc-300">{label}</span>{desc && <p className="text-xs text-zinc-500">{desc}</p>}</div>
                <button className={`w-10 h-6 rounded-full transition-colors relative ${value ? 'bg-blue-500' : 'bg-zinc-700'}`} onClick={() => updateField(key, !value)}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </label>
            );
          })}
        </div>
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Trash2 className="w-4 h-4 text-red-400" />{t('cleanup_section')}</h2>
        <div className="flex gap-3 flex-wrap">
          <button className="btn-ghost flex items-center gap-2" onClick={() => handleCleanup('temp')} disabled={cleaning}>
            {cleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}{t('cleanup_temp')}</button>
          <button className="btn-ghost flex items-center gap-2" onClick={() => handleCleanup('history')} disabled={cleaning}>
            {cleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}{t('cleanup_history')}</button>
          <button className="btn-danger flex items-center gap-2" onClick={() => handleCleanup('output')} disabled={cleaning}>
            {cleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}{t('cleanup_output')}</button>
        </div>
        {cleanResult && <p className="text-xs text-zinc-400 mt-2">{cleanResult}</p>}
      </section>
    </div>
  );
}
