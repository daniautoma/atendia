import { NextResponse } from 'next/server';
import { testTelegramAlert } from '@/lib/integrations/telegram/alert';

export async function GET() {
  const result = await testTelegramAlert();
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function POST() {
  const result = await testTelegramAlert();
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
