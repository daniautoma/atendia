import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { prisma } from '@/lib/prisma';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let business = null;
  try {
    business = await prisma.businessProfile.findFirst();
  } catch {
    // Si la base de datos está offline durante la generación estática
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-stone-50">
      <Sidebar
        businessName={business?.name || 'Clínica Dental Lumen'}
        assistantActive={business?.assistantActive ?? true}
        agencyName={business?.agencyName || 'Agencia Atendia'}
      />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}
