import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Atendia — Asistente de IA Omnicanal',
  description: 'Panel de control y atención automatizada por WhatsApp y Web para negocios locales',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-stone-50 text-stone-900 selection:bg-teal-100 selection:text-teal-900">
        {children}
      </body>
    </html>
  );
}
