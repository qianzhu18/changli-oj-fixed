import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const accessToken = String(body.accessToken || '').trim();
    const password = String(body.password || '');

    if (!accessToken || !password) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 });
    }

    const url = process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return NextResponse.json(
        { error: '缺少 SUPABASE_URL 或 SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      );
    }

    const response = await fetch(`${url}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: detail || `重置失败 (${response.status})` },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '重置密码失败' },
      { status: 500 }
    );
  }
}
