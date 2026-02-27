'use client';

import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useMemo, useState } from 'react';

async function postJson<T>(url: string, payload: Record<string, unknown>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = { error: text };
    }
  }
  if (!res.ok) {
    throw new Error(String(data.error || data.message || `请求失败 (${res.status})`));
  }
  return data as T;
}

function readAccessTokenFromHash() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return params.get('access_token') || '';
}

export default function ResetPasswordPage() {
  const accessToken = useMemo(() => readAccessTokenFromHash(), []);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accessToken) {
      setError('重置链接无效或已过期，请重新发起找回密码');
      return;
    }
    if (!password || !confirmPassword) {
      setError('请输入新密码并确认');
      return;
    }
    if (password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
    try {
      await postJson('/api/auth/reset-password', { accessToken, password });
      setNotice('密码已重置，正在跳转到登录页...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#F5F2E9' }}>
      <Link
        href="/login"
        className="absolute top-6 left-6 z-20 swordsman-link text-sm"
        style={{ color: '#1A1A1A' }}
      >
        返回登录
      </Link>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="swordsman-card">
            <div className="text-center mb-6">
              <h1
                className="text-3xl font-light mb-2"
                style={{ fontFamily: "'Times New Roman', Georgia, serif", color: '#1A1A1A' }}
              >
                设置新密码
              </h1>
              <p className="text-sm text-gray-600" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
                请输入新的登录密码
              </p>
            </div>

            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <label htmlFor="reset-password" className="swordsman-label">
                  新密码
                </label>
                <div className="relative">
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    className="swordsman-input w-full pr-10"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="至少 6 位"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#A9A9A9' }}
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="reset-password-confirm" className="swordsman-label">
                  确认新密码
                </label>
                <input
                  id="reset-password-confirm"
                  type={showPassword ? 'text' : 'password'}
                  className="swordsman-input w-full"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="再次输入新密码"
                  required
                />
              </div>

              {!accessToken ? (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.10)',
                    border: '1px solid rgba(239, 68, 68, 0.18)',
                    color: '#991b1b',
                    fontFamily: "'Times New Roman', Georgia, serif"
                  }}
                >
                  链接中缺少有效凭证，请重新发起忘记密码流程。
                </div>
              ) : null}

              {notice ? (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{
                    backgroundColor: 'rgba(22, 163, 74, 0.10)',
                    border: '1px solid rgba(22, 163, 74, 0.18)',
                    color: '#166534',
                    fontFamily: "'Times New Roman', Georgia, serif"
                  }}
                >
                  {notice}
                </div>
              ) : null}

              {error ? (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.10)',
                    border: '1px solid rgba(239, 68, 68, 0.18)',
                    color: '#991b1b',
                    fontFamily: "'Times New Roman', Georgia, serif"
                  }}
                >
                  {error}
                </div>
              ) : null}

              <button type="submit" className="w-full swordsman-button" disabled={loading || !accessToken}>
                {loading ? '提交中...' : '确认重置密码'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
