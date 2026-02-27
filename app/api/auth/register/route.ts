import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getUserRoleByEmail, signToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const name = String(body.name || '').trim();
    const code = String(body.code || '').trim();
    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 });
    }
    if (code) {
      // backward compatibility: allow clients still sending "code", but it is ignored now.
    }

    const adminSupabase = getSupabaseAdmin();
    const { data: createdAuth, error: authCreateErr } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: name ? { name } : undefined
    });

    if (authCreateErr || !createdAuth.user) {
      const message = authCreateErr?.message || '注册失败';
      if (message.includes('already') || message.includes('exists')) {
        return NextResponse.json({ error: '该邮箱已注册，请直接登录' }, { status: 400 });
      }
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { data, error } = await adminSupabase
      .from('users')
      .insert({
        email,
        name: name || null,
        password_hash: `supabase-auth-${createdAuth.user.id}`,
        is_active: true
      })
      .select('id, email, is_active')
      .single();

    if (error || !data) {
      // rollback auth user when local profile insert fails
      await adminSupabase.auth.admin.deleteUser(createdAuth.user.id);
      const message = error?.message || '创建用户资料失败';
      if (error?.code === '23505') {
        return NextResponse.json({ error: '该邮箱已注册，请直接登录' }, { status: 400 });
      }
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const role = getUserRoleByEmail(data.email);
    const token = await signToken({ userId: data.id, email: data.email, role });
    return NextResponse.json({ token, user: { id: data.id, email: data.email, role } });
  } catch (err) {
    return NextResponse.json({ error: '注册失败' }, { status: 500 });
  }
}
