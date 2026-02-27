'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { apiFetch, storeAuth } from '@/lib/client-auth';

type Tab = 'login' | 'register';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Deterministic PRNG to avoid hydration mismatch (no Math.random() in render).
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function InkWashAuth({ defaultTab = 'login' }: { defaultTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '' });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inkDots = useMemo(() => {
    const rand = mulberry32(0x5a17_2026);
    return Array.from({ length: 12 }).map((_, idx) => ({
      key: `ink-${idx}`,
      size: rand() * 8 + 2,
      opacity: rand() * 0.4 + 0.1,
      left: rand() * 100,
      top: rand() * 100,
      delay: idx * 0.5,
      duration: rand() * 3 + 2
    }));
  }, []);

  useEffect(() => {
    // 页面加载时的淡入动画
    const timer = window.setTimeout(() => setIsVisible(true), 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setError('');

    const email = (tab === 'login' ? loginForm.email : registerForm.email).trim().toLowerCase();
    const password = tab === 'login' ? loginForm.password : registerForm.password;
    const name = registerForm.name.trim();

    if (!email || !password) {
      setError('请输入邮箱和密码');
      return;
    }
    if (!isValidEmail(email)) {
      setError('邮箱格式不正确');
      return;
    }
    if (password.length < 6) {
      setError('密码至少 6 位');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        const data = await apiFetch<{
          token: string;
          user: { id: string; email: string };
        }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
        storeAuth(data.token, data.user);
        window.location.href = '/';
        return;
      }

      const data = await apiFetch<{
        token: string;
        user: { id: string; email: string };
      }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) });
      storeAuth(data.token, data.user);
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : tab === 'login' ? '登录失败' : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#F5F2E9' }}>
      <Link
        href="/square"
        className="absolute top-6 left-6 z-20 swordsman-link text-sm"
        style={{ color: '#1A1A1A' }}
      >
        返回题库广场
      </Link>
      <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/6 left-1/4 w-96 h-3 opacity-40"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, #1A1A1A 15%, #1A1A1A 85%, transparent 100%)',
              transform: 'rotate(-12deg)',
              filter: 'blur(0.5px)'
            }}
          />
          <div
            className="absolute top-1/3 right-1/5 w-80 h-2 opacity-30"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, #1A1A1A 20%, #1A1A1A 80%, transparent 100%)',
              transform: 'rotate(18deg)',
              filter: 'blur(0.3px)'
            }}
          />
          <div
            className="absolute bottom-1/4 left-1/6 w-72 h-1 opacity-25"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, #1A1A1A 25%, #1A1A1A 75%, transparent 100%)',
              transform: 'rotate(-25deg)'
            }}
          />

          {inkDots.map((dot) => (
            <div
              key={dot.key}
              className="absolute rounded-full animate-float-ink"
              style={{
                width: `${dot.size}px`,
                height: `${dot.size}px`,
                backgroundColor: '#1A1A1A',
                opacity: dot.opacity,
                left: `${dot.left}%`,
                top: `${dot.top}%`,
                animationDelay: `${dot.delay}s`,
                animationDuration: `${dot.duration}s`
              }}
            />
          ))}

          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                'url("data:image/svg+xml,%3Csvg width=\'120\' height=\'120\' viewBox=\'0 0 120 120\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23D4C4A8\' fillOpacity=\'0.3\'%3E%3Cpath d=\'M9 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm48 25c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm-43-7c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm63 31c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM34 90c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\'/%3E%3C/g%3E%3C/svg%3E")'
            }}
          />
          <div
            className="absolute top-0 right-0 w-1/3 h-1/2 opacity-5"
            style={{ background: 'radial-gradient(ellipse at top right, #1A1A1A 0%, transparent 70%)' }}
          />
          <div
            className="absolute bottom-0 left-0 w-1/2 h-1/3 opacity-8"
            style={{ background: 'radial-gradient(ellipse at bottom left, #1A1A1A 0%, transparent 60%)' }}
          />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div
          className={`w-full max-w-md transition-all duration-700 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="text-center mb-8">
            <h1
              className="text-4xl md:text-5xl font-light mb-4"
              style={{
                fontFamily: "'Times New Roman', Georgia, serif",
                color: '#1A1A1A',
                textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
              }}
            >
              畅理题库
            </h1>
            <div
              className="inline-block px-3 py-1 border-2 mb-2"
              style={{
                borderColor: '#B93A32',
                backgroundColor: 'rgba(185, 58, 50, 0.1)',
                transform: 'rotate(-1deg)'
              }}
            >
              <span
                className="text-sm font-medium"
                style={{ color: '#B93A32', fontFamily: "'Times New Roman', Georgia, serif" }}
              >
                墨隐侠踪
              </span>
            </div>
          </div>

          <div className="swordsman-card">
            <div className="grid w-full grid-cols-2 mb-6 swordsman-tabs" role="tablist" aria-label="认证方式">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'login'}
                data-state={tab === 'login' ? 'active' : 'inactive'}
                className="swordsman-tab"
                onClick={() => {
                  setTab('login');
                  setError('');
                }}
              >
                登录
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'register'}
                data-state={tab === 'register' ? 'active' : 'inactive'}
                className="swordsman-tab"
                onClick={() => {
                  setTab('register');
                  setError('');
                }}
              >
                注册
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              {tab === 'register' ? (
                <div className="space-y-2">
                  <label htmlFor="register-name" className="swordsman-label">
                    昵称
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#A9A9A9' }} />
                    <input
                      id="register-name"
                      type="text"
                      placeholder="例如：小明"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="swordsman-input pl-10 w-full"
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <label htmlFor="auth-email" className="swordsman-label">
                  邮箱地址
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#A9A9A9' }} />
                  <input
                    id="auth-email"
                    type="email"
                    placeholder="请输入邮箱"
                    value={tab === 'login' ? loginForm.email : registerForm.email}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (tab === 'login') setLoginForm((prev) => ({ ...prev, email: value }));
                      else setRegisterForm((prev) => ({ ...prev, email: value }));
                    }}
                    className="swordsman-input pl-10 w-full"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="auth-password" className="swordsman-label">
                  密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#A9A9A9' }} />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="至少 6 位"
                    value={tab === 'login' ? loginForm.password : registerForm.password}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (tab === 'login') setLoginForm((prev) => ({ ...prev, password: value }));
                      else setRegisterForm((prev) => ({ ...prev, password: value }));
                    }}
                    className="swordsman-input pl-10 pr-10 w-full"
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

              <button type="submit" className="w-full swordsman-button" disabled={loading}>
                {loading ? (tab === 'login' ? '登录中...' : '注册中...') : tab === 'login' ? '登录' : '注册'}
              </button>

              {tab === 'login' ? (
                <div className="text-right -mt-2">
                  <Link
                    href="/forgot-password"
                    className="swordsman-link text-sm"
                    style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
                  >
                    忘记密码？
                  </Link>
                </div>
              ) : null}

              <div className="text-center text-sm" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
                {tab === 'login' ? (
                  <>
                    还没有账号？{' '}
                    <Link className="swordsman-link" href="/register" onClick={() => setTab('register')}>
                      立即注册
                    </Link>
                  </>
                ) : (
                  <>
                    已有账号？{' '}
                    <Link className="swordsman-link" href="/login" onClick={() => setTab('login')}>
                      去登录
                    </Link>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
