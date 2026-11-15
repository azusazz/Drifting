import React, { useState } from 'react';
import { BookOpen, PenLine, RefreshCw, Trash2, X } from 'lucide-react';
import { TIME_OF_DAY_LABELS, WEATHER_LABELS } from '../constants/buildings';
import { GameHudSnapshot, JournalEntry } from '../types/game';

export const JOURNAL_QUOTES: string[] = [
  '海浪不会记住昨天的风，但木板会记住你钉下的每一颗钉子。',
  '哪怕最初只有脚下一块木板，只要还愿意向远处抛钩，海岸就不会太远。',
  '暴风雨过后，海面反而清澈得像刚擦亮的玻璃。',
  '生活或许就像海上漂流——大部分时候只是把散落的碎片一点点拼成家。',
  '夜晚亮起的那盏小灯，比星光更靠近心口。',
  '把焦虑交还给潮汐，今天只需要晒好这壶淡水、种下一株绿芽。',
  '孤独并非无人作伴，而是连自己也不再倾听心里的潮声。',
  '每一次加固边缘，都是对明天多一分温柔的底气。',
  '木头浸过海水会变得沉实，人经历风浪之后也一样。',
  '在无边蔚蓝里种出一畦菜园，本身就是一种了不起的浪漫。',
  '风向无法由我们决定，但木屋的窗要朝哪边开，一直由你做主。',
  '别急着赶路，云影飘过甲板的那几秒，也算活着本身。',
  '今天收集到的也许只是几块漂流木，明天就能变成遮风挡雨的屋檐。',
  '大海教会水手最朴素的一课：修补破损，比抱怨浪大更有用。',
  '在摇晃的世界里睡个好觉，是漂流者最奢侈也最踏实的本事。',
  '有些答案不在地平线尽头，而在你亲手搭起的小屋里。',
];

const MOOD_OPTIONS = ['平静', '感慨', '希望', '疲惫'] as const;

interface JournalModalProps {
  open: boolean;
  hud: GameHudSnapshot;
  quote: string;
  entries: JournalEntry[];
  onClose: () => void;
  onRefreshQuote: () => void;
  onAddEntry: (mood: string, text: string) => void;
  onDeleteEntry: (id: string) => void;
}

export const JournalModal: React.FC<JournalModalProps> = ({
  open,
  hud,
  quote,
  entries,
  onClose,
  onRefreshQuote,
  onAddEntry,
  onDeleteEntry,
}) => {
  const [mood, setMood] = useState<string>(MOOD_OPTIONS[0]);
  const [draft, setDraft] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddEntry(mood, trimmed);
    setDraft('');
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4"
      style={{ backgroundColor: 'rgba(8, 12, 16, 0.72)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="漂流日记 Journal"
        onClick={(e) => e.stopPropagation()}
        className="raft-panel w-full max-w-lg max-h-[86vh] rounded-xl flex flex-col overflow-hidden text-[#f7eedb]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#8a623f]/55 bg-[#1b1510]/85">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#eab55c]" />
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide">
              Journal · 航海日记
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#cbb692] tabular-nums">
              第 {hud.day} 天 · {TIME_OF_DAY_LABELS[hud.timeOfDay]} · {WEATHER_LABELS[hud.weather]}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭日记"
              className="raft-slot p-1.5 rounded hover:brightness-110 text-[#f3e4c8] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3.5">
          {/* Random Refreshing Quote / Mood / Philosophy */}
          <div className="rounded-lg border border-[#a87c4b]/60 bg-[#2d2318]/90 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-[#eab55c] tracking-wide">
                海风随想 · 今日哲思
              </span>
              <button
                type="button"
                onClick={onRefreshQuote}
                className="raft-slot px-2 py-1 rounded text-[11px] font-semibold text-[#f3e4c8] hover:brightness-110 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-[#eab55c]" />
                <span>换一句</span>
              </button>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-[#f7eedb] font-medium">
              “{quote}”
            </p>
          </div>

          {/* Write Diary Form */}
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="journal-draft-input"
                className="text-xs font-bold text-[#e6c47a] flex items-center gap-1"
              >
                <PenLine className="w-3.5 h-3.5" />
                <span>写下今天的漂流日记</span>
              </label>
              <div className="flex items-center gap-1">
                {MOOD_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMood(m)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      mood === m
                        ? 'bg-[#6b4d2e] border-[#eab55c] text-[#fdf6ea]'
                        : 'bg-[#1a1410] border-[#5f452d] text-[#cbb692] hover:text-[#f3e4c8]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              id="journal-draft-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              rows={3}
              maxLength={280}
              placeholder="记下今天的海风、木屋进度或心情……"
              className="w-full rounded-lg border border-[#7c5b3a] bg-[#14100c]/90 px-3 py-2 text-xs sm:text-sm text-[#f7eedb] placeholder-[#8e7d67] focus:outline-none focus:border-[#eab55c] resize-none"
            />

            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-[#a7957b] tabular-nums">
                {draft.length}/280
              </span>
              <button
                type="submit"
                disabled={!draft.trim()}
                className="px-4 py-1.5 rounded-md border border-[#72ba6f]/70 bg-[#488847] hover:bg-[#559d54] disabled:bg-[#2a231d] disabled:border-[#524335] disabled:text-[#847768] text-[#fdf7ec] text-xs font-extrabold cursor-pointer disabled:cursor-not-allowed"
              >
                写入日记
              </button>
            </div>
          </form>

          {/* Saved Entries */}
          <div className="pt-2 border-t border-[#8a623f]/45 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#cbb692]">
              <span>过往手记</span>
              <span className="tabular-nums">{entries.length} 篇</span>
            </div>

            {entries.length === 0 ? (
              <div className="raft-slot rounded-lg p-3 text-center text-[11px] text-[#9c8b73]">
                还没有手记，试着写下海上漂流的第一笔吧。
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="raft-slot rounded-lg p-2.5 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] text-[#cbb692]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#eab55c]">第 {entry.day} 天</span>
                        <span>·</span>
                        <span>{entry.clockLabel}</span>
                        <span>·</span>
                        <span>{entry.weatherLabel}</span>
                        <span>·</span>
                        <span className="text-[#e6c47a]">{entry.mood}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteEntry(entry.id)}
                        title="删除这篇日记"
                        className="text-[#a7957b] hover:text-[#f09a93] p-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-[#f3e4c8] whitespace-pre-wrap leading-relaxed">
                      {entry.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
