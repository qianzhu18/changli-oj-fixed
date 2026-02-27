import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAuthClient } from '@/lib/supabase';

export const runtime = 'nodejs';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: '邮箱不能为空' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || process.env.APP_ORIGIN || 'http://localhost:3001';
    const redirectTo = `${origin.replace(/\/$/, '')}/reset-password`;

    const authClient = getSupabaseAuthClient();
    const { error } = await authClient.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      if (error.message.toLowerCase().includes('rate limit')) {
        return NextResponse.json({ error: '邮件发送过于频繁，请稍后重试' }, { status: 429 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '发送重置邮件失败' },
      { status: 500 }
    );
  }
}
