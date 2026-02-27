'use client';

import Link from 'next/link';
import { useState } from 'react';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('请输入邮箱');
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setError('邮箱格式不正确');
      return;
    }

    setSending(true);
    setError('');
    setNotice('');
    try {
      await postJson('/api/auth/forgot-password', { email: normalizedEmail });
      setNotice('重置链接已发送，请检查邮箱并点击链接设置新密码。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setSending(false);
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
                找回密码
              </h1>
              <p className="text-sm text-gray-600" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
                输入邮箱后，我们将发送密码重置链接
              </p>
            </div>

            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-2">
                <label htmlFor="forgot-email" className="swordsman-label">
                  邮箱地址
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  className="swordsman-input w-full"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="请输入邮箱"
                  required
                />
              </div>

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

              <button type="submit" className="w-full swordsman-button" disabled={sending}>
                {sending ? '发送中...' : '发送重置链接'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
