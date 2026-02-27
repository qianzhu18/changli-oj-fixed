import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getSupabaseAuthClient } from '@/lib/supabase';
import { getUserRoleByEmail, signToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const code = String(body.code || '').trim();
    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 });
    }
    if (code) {
      // backward compatibility: allow clients still sending "code", but it is ignored now.
    }

    const authClient = getSupabaseAuthClient();
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data: localUser, error: localErr } = await supabase
      .from('users')
      .select('id, email, is_active, name')
      .eq('email', email)
      .maybeSingle();

    if (localErr) {
      return NextResponse.json({ error: localErr.message }, { status: 500 });
    }

    let user = localUser;
    if (!user) {
      const randomPassword = `supabase-auth-${authData.user.id}`;
      const { data: inserted, error: insertErr } = await supabase
        .from('users')
        .insert({
          email,
          name: String(authData.user.user_metadata?.name || '').trim() || null,
          password_hash: randomPassword,
          is_active: true
        })
        .select('id, email, is_active, name')
        .single();

      if (insertErr || !inserted) {
        return NextResponse.json(
          { error: insertErr?.message || '创建用户资料失败' },
          { status: 500 }
        );
      }
      user = inserted;
    }

    if (!user.is_active) {
      return NextResponse.json({ error: '账号已停用，请联系管理员' }, { status: 403 });
    }

    const role = getUserRoleByEmail(user.email);
    const token = await signToken({ userId: user.id, email: user.email, role });
    return NextResponse.json({ token, user: { id: user.id, email: user.email, role } });
  } catch (err) {
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
