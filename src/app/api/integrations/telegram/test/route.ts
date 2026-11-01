import { NextResponse } from 'next/server';
import { testTelegramAlert } from '@/lib/integrations/telegram/alert';

export async function GET() {
  const result = await testTelegramAlert();
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { botToken, chatId } = body;
    const result = await testTelegramAlert(botToken, chatId);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
