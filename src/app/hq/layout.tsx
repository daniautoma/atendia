import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cuartel General (HQ) — danIAutoma',
  description: 'Centro de operaciones interno para prospección, tareas y visión semanal de danIAutoma.',
};

export default function HqLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-screen overflow-x-hidden bg-[#09090b] text-zinc-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-300">
      {children}
    </div>
  );
}

