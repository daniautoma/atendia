'use client';

import React from 'react';
import { Flame, Sparkles, TrendingUp, CheckCircle2 } from 'lucide-react';

interface RadarScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RadarScoreBadge({ score, showLabel = true, size = 'md' }: RadarScoreBadgeProps) {
  let label = 'Presencia Estable';
  let badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  let Icon = CheckCircle2;

  if (score >= 75) {
    label = 'Oportunidad Crítica';
    badgeColor = 'text-rose-400 bg-rose-500/15 border-rose-500/40 animate-pulse';
    Icon = Flame;
  } else if (score >= 50) {
    label = 'Oportunidad Alta';
    badgeColor = 'text-amber-400 bg-amber-500/15 border-amber-500/40';
    Icon = Sparkles;
  } else if (score >= 30) {
    label = 'Oportunidad Media';
    badgeColor = 'text-cyan-400 bg-cyan-500/15 border-cyan-500/40';
    Icon = TrendingUp;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
  }[size];

  return (
    <div
      className={`inline-flex items-center rounded-full border font-semibold ${badgeColor} ${sizeClasses} shadow-sm backdrop-blur-md`}
      title={`Puntaje de oportunidad: ${score}/100`}
    >
      <Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      <span className="font-mono">{score} pts</span>
      {showLabel && <span className="opacity-80">· {label}</span>}
    </div>
  );
}

