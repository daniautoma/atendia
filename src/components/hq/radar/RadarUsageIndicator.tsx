'use client';

import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, ShieldCheck } from 'lucide-react';

interface UsageData {
  monthYear: string;
  placesCalls: number;
  limitAlert: number;
  remaining: number;
  isNearLimit: boolean;
  isOverLimit: boolean;
}

interface RadarUsageIndicatorProps {
  overrideUsage?: { placesCalls: number; limitAlert: number } | null;
}

export function RadarUsageIndicator({ overrideUsage }: RadarUsageIndicatorProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/hq/radar/usage')
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setUsage(data);
        }
      })
      .catch((err) => console.error('Error fetching usage:', err))
      .finally(() => setLoading(false));
  }, []);

  const displayUsage: UsageData | null = usage
    ? overrideUsage
      ? {
          ...usage,
          placesCalls: overrideUsage.placesCalls,
          limitAlert: overrideUsage.limitAlert || usage.limitAlert,
          remaining: Math.max(
            0,
            (overrideUsage.limitAlert || usage.limitAlert) - overrideUsage.placesCalls
          ),
          isNearLimit:
            overrideUsage.placesCalls >=
            (overrideUsage.limitAlert || usage.limitAlert) * 0.8,
          isOverLimit:
            overrideUsage.placesCalls >=
            (overrideUsage.limitAlert || usage.limitAlert),
        }
      : usage
    : null;

  if (loading || !displayUsage) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-500 animate-pulse">
        <Activity className="w-3.5 h-3.5" />
        <span>Cargando cuota API...</span>
      </div>
    );
  }

  const percent = Math.min(100, Math.round((displayUsage.placesCalls / displayUsage.limitAlert) * 100));

  let colorClasses = 'text-emerald-400 bg-emerald-950/30 border-emerald-800/50';
  let Icon = ShieldCheck;

  if (displayUsage.isOverLimit) {
    colorClasses = 'text-rose-400 bg-rose-950/40 border-rose-800/60';
    Icon = AlertTriangle;
  } else if (displayUsage.isNearLimit) {
    colorClasses = 'text-amber-400 bg-amber-950/30 border-amber-800/50';
    Icon = AlertTriangle;
  }

  return (
    <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${colorClasses} shadow-sm backdrop-blur-sm`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <div className="flex items-center gap-1.5">
        <span className="text-zinc-400">Cuota Places ({displayUsage.monthYear}):</span>
        <span className="font-semibold">{displayUsage.placesCalls}</span>
        <span className="text-zinc-500">/</span>
        <span className="text-zinc-400">{displayUsage.limitAlert}</span>
        <span className="text-zinc-500 text-[10px]">({percent}%)</span>
      </div>
      {displayUsage.isNearLimit && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold uppercase tracking-wider">
          {displayUsage.isOverLimit ? 'Límite Superado' : 'Alerta Cuota'}
        </span>
      )}
    </div>
  );
}

