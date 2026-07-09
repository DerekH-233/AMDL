'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { TaskInfo } from '@/types';
import TaskCard from '@/components/TaskCard';

export default function TasksPage() {
  const { t } = useI18n();
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await api.get<TaskInfo[]>('/api/tasks');
      setTasks(data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleCancel = async (taskId: string) => {
    try { await api.post(`/api/tasks/${taskId}/cancel`); fetchTasks(); } catch { /* ignore */ }
  };
  const handleDelete = async (taskId: string) => {
    try { await api.del(`/api/tasks/${taskId}`); setTasks((prev) => prev.filter((t) => t.id !== taskId)); } catch { /* ignore */ }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('task_list')}</h1>
          <p className="text-zinc-400">{t('task_list_desc')}</p>
        </div>
        <button className="btn-ghost flex items-center gap-2" onClick={fetchTasks}>
          <RefreshCw className="w-4 h-4" />{t('refresh_btn')}
        </button>
      </div>
      {loading ? (
        <div className="text-center py-20 text-zinc-500">{t('loading')}</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-zinc-500 text-lg mb-2">{t('no_tasks')}</p>
          <p className="text-zinc-600 text-sm">
            <a href="/" className="text-blue-400 hover:underline mx-1">{t('go_to_download')}</a>{t('create_new_task')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onCancel={handleCancel} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
