'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

const allBlocks = [
  { id: 'track', labelZh: '曲序号', labelEn: 'Track #' },
  { id: 'title', labelZh: '歌曲名（必选）', labelEn: 'Title (required)' },
  { id: 'artist', labelZh: '歌手名', labelEn: 'Artist' },
  { id: 'album', labelZh: '专辑名', labelEn: 'Album' },
  { id: 'sep', labelZh: '分隔符 —', labelEn: 'Separator —' },
];

function SortableBlock({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const isSep = id === 'sep';
  const isTitle = id === 'title';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg select-none ${
        isSep
          ? 'bg-zinc-700 text-zinc-300 font-bold justify-center cursor-grab active:cursor-grabbing'
          : isTitle
          ? 'bg-green-500/20 text-green-300 border border-green-500/30 cursor-grab active:cursor-grabbing'
          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30 cursor-grab active:cursor-grabbing'
      }`}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
      <span className="text-sm whitespace-nowrap">{label}</span>
    </div>
  );
}

interface DragOrderProps {
  value: string[];
  onChange: (order: string[]) => void;
}

export default function DragOrder({ value, onChange }: DragOrderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const selected = value; // items in "已选择"
  const available = allBlocks.filter((b) => !selected.includes(b.id)).map((b) => b.id);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const activeIdStr = active.id as string;
      const overIdStr = over.id as string;

      // title is mandatory — can't move to available
      if (activeIdStr === 'title' && available.includes(overIdStr)) return;

      if (activeIdStr !== overIdStr) {
        const activeInSelected = selected.includes(activeIdStr);
        const overInSelected = selected.includes(overIdStr);

        if (activeInSelected && overInSelected) {
          // Both in selected: reorder
          const oldIdx = selected.indexOf(activeIdStr);
          const newIdx = selected.indexOf(overIdStr);
          const newOrder = [...selected];
          newOrder.splice(oldIdx, 1);
          newOrder.splice(newIdx, 0, activeIdStr);
          onChange(newOrder);
        } else if (activeInSelected && !overInSelected) {
          // Active is in selected, dropping on available → move to available
          onChange(selected.filter((id) => id !== activeIdStr));
        } else if (!activeInSelected && overInSelected) {
          // Active is in available, dropping on selected → move to selected
          const newIdx = selected.indexOf(overIdStr);
          const newOrder = [...selected];
          newOrder.splice(newIdx, 0, activeIdStr);
          onChange(newOrder);
        } else if (!activeInSelected && !overInSelected) {
          // Both in available: just reorder available (internal, no change needed)
        }
      }
    },
    [selected, available, onChange]
  );

  const draggingToAvailable = activeId && selected.includes(activeId);

  const labels = allBlocks.reduce(
    (acc, b) => ({ ...acc, [b.id]: b.labelZh }),
    {} as Record<string, string>
  );

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* 已选择区域 */}
        <div>
          <p className="text-xs text-zinc-500 mb-1.5">已选择（排列顺序 = 文件名顺序）</p>
          <SortableContext items={selected} strategy={verticalListSortingStrategy}>
            <div className="flex flex-wrap gap-2 p-3 bg-zinc-800/50 rounded-lg min-h-[44px] items-center">
              {selected.map((id) => (
                <SortableBlock key={id} id={id} label={labels[id] || id} />
              ))}
              {selected.length === 0 && (
                <p className="text-xs text-zinc-600 w-full text-center">拖入方块到此区域</p>
              )}
            </div>
          </SortableContext>
        </div>

        {/* 待选区域 */}
        <div>
          <p className="text-xs text-zinc-500 mb-1.5">待选（拖到上方加入，从上方向下拖移出）</p>
          <SortableContext items={available} strategy={verticalListSortingStrategy}>
            <div
              className={`flex flex-wrap gap-2 p-3 rounded-lg min-h-[44px] items-center border border-dashed transition-colors ${
                draggingToAvailable
                  ? 'bg-red-500/5 border-red-500/30'
                  : 'bg-zinc-800/20 border-zinc-700'
              }`}
            >
              {available.map((id) => (
                <SortableBlock key={id} id={id} label={labels[id] || id} />
              ))}
              {available.length === 0 && (
                <p className="text-xs text-zinc-600 w-full text-center">无更多选项</p>
              )}
            </div>
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
}

export function orderToTemplate(order: string[]): string {
  const parts: string[] = [];
  for (const id of order) {
    if (id === 'track') parts.push('{track:02d}');
    else if (id === 'title') parts.push('{title}');
    else if (id === 'artist') parts.push('{artist}');
    else if (id === 'album') parts.push('{album}');
    else if (id === 'sep') parts.push(' - ');
  }
  return parts.join(' ').replace(/\s*-\s*/g, ' - ');
}

export const defaultOrder = ['track', 'title', 'artist'];
