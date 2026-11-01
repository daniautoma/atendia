import React from 'react';
import { Sidebar } from '@/components/Sidebar';
import { MobileNavProvider } from '@/components/MobileNavContext';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  let business = null;
  try {
    business = await prisma.businessProfile.findFirst();
  } catch {
    // Si la base de datos está offline durante la generación estática
  }

  return (
    <MobileNavProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-stone-50">
        <Sidebar
          businessName={business?.name || 'Clínica Dental San Salvador'}
          assistantActive={business?.assistantActive ?? true}
          agencyName={business?.agencyName || 'Agencia Atendia'}
          userRole={session?.role || 'AGENT'}
          userName={session?.name || 'Usuario'}
        />
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
    </MobileNavProvider>
  );
}
