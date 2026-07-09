'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, History, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { TaskInfo } from '@/types';

export default function HistoryPage() {
  const { t } = useI18n();
  const [history, setHistory] = useState<TaskInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try { const data = await api.get<TaskInfo[]>('/api/history'); setHistory(data || []); } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleClear = async () => {
    if (!confirm(t('confirm_clear_history'))) return;
    try { await api.del('/api/history'); setHistory([]); } catch { /* ignore */ }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'cancelled': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default: return <History className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('history_title')}</h1>
          <p className="text-zinc-400">{t('history_desc')}</p>
        </div>
        {history.length > 0 && (
          <button className="btn-ghost flex items-center gap-2" onClick={handleClear}>
            <Trash2 className="w-4 h-4" />{t('clear_history')}
          </button>
        )}
      </div>
      {loading ? (
        <div className="text-center py-20 text-zinc-500">{t('loading')}</div>
      ) : history.length === 0 ? (
        <div className="text-center py-20">
          <History className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 text-lg mb-2">{t('no_history')}</p>
          <p className="text-zinc-600 text-sm">{t('no_history_hint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center gap-4">
              {statusIcon(item.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-white font-mono">{item.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.status === 'completed' ? 'bg-green-400/10 text-green-400' :
                    item.status === 'failed' ? 'bg-red-400/10 text-red-400' : 'bg-yellow-400/10 text-yellow-400'
                  }`}>{t(item.status)}</span>
                </div>
                <p className="text-xs text-zinc-500 truncate">{item.urls?.join(', ') || '-'}</p>
              </div>
              <div className="text-right text-xs text-zinc-500">
                {item.total > 0 && <p>{item.total} {t('songs')}</p>}
                {item.error_count > 0 && <p className="text-red-400">{item.error_count} {t('errors')}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
