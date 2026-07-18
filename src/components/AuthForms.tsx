import React, { useState } from 'react';

export default function AuthForms({ onLoginSuccess }: { onLoginSuccess: (token: string, user: any) => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'verify' | 'forgot' | 'reset' | '2fa'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMsg('');

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST', body: JSON.stringify({ email, password, code }), headers: { 'Content-Type': 'application/json' }
        });
        const data: any = await res.json();
        if (data.requires_2fa) {
            setMode('2fa');
            return;
        }
        if (data.unverified) {
            setMode('verify');
            return;
        }
        if (!data.success) throw new Error(data.error || 'Login failed');
        onLoginSuccess(data.token, data.user);
      } else if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST', body: JSON.stringify({ email, password, name }), headers: { 'Content-Type': 'application/json' }
        });
        const data: any = await res.json();
        if (!data.success) throw new Error(data.error || 'Registration failed');
        setMode('verify');
        setMsg('Verification email sent!');
      } else if (mode === 'verify') {
        const res = await fetch('/api/auth/verify', {
          method: 'POST', body: JSON.stringify({ email, code }), headers: { 'Content-Type': 'application/json' }
        });
        const data: any = await res.json();
        if (!data.success) throw new Error(data.error || 'Verification failed');
        setMode('login');
        setMsg('Email verified. Please log in.');
      } else if (mode === 'forgot') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST', body: JSON.stringify({ email }), headers: { 'Content-Type': 'application/json' }
        });
        await res.json();
        setMode('reset');
        setMsg('If the email exists, a code was sent.');
      } else if (mode === 'reset') {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST', body: JSON.stringify({ email, code, newPassword: password }), headers: { 'Content-Type': 'application/json' }
        });
        const data: any = await res.json();
        if (!data.success) throw new Error(data.error || 'Reset failed');
        setMode('login');
        setMsg('Password reset successful. Please log in.');
      } else if (mode === '2fa') {
        const res = await fetch('/api/auth/login', {
          method: 'POST', body: JSON.stringify({ email, password, code }), headers: { 'Content-Type': 'application/json' }
        });
        const data: any = await res.json();
        if (!data.success) throw new Error(data.error || '2FA failed');
        onLoginSuccess(data.token, data.user);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      <h2 className="text-xl font-bold text-center dark:text-white mb-2">
        {mode === 'login' && 'Sign In'}
        {mode === 'register' && 'Sign Up'}
        {mode === 'verify' && 'Verify Email'}
        {mode === 'forgot' && 'Forgot Password'}
        {mode === 'reset' && 'Reset Password'}
        {mode === '2fa' && 'Two-Factor Auth'}
      </h2>
      
      {error && <div className="text-red-500 text-sm text-center p-2 bg-red-100 rounded">{error}</div>}
      {msg && <div className="text-green-500 text-sm text-center p-2 bg-green-100 rounded">{msg}</div>}
      
      <form onSubmit={submit} className="space-y-4">
        {(mode === 'login' || mode === 'register' || mode === 'verify' || mode === 'forgot' || mode === 'reset' || mode === '2fa') && (
          <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
        )}
        
        {mode === 'register' && (
          <input type="text" placeholder="Name" required value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
        )}

        {(mode === 'login' || mode === 'register' || mode === 'reset') && (
          <input type="password" placeholder={mode === 'reset' ? "New Password" : "Password"} required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
        )}
        
        {(mode === 'verify' || mode === 'reset' || mode === '2fa') && (
          <input type="text" placeholder="Code" required value={code} onChange={e => setCode(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
        )}

        <button type="submit" className="w-full bg-amber-500 text-slate-900 font-bold p-2 rounded hover:bg-amber-400 transition">
          {mode === 'login' && 'Sign In'}
          {mode === 'register' && 'Sign Up'}
          {mode === 'verify' && 'Verify'}
          {mode === 'forgot' && 'Send Code'}
          {mode === 'reset' && 'Reset Password'}
          {mode === '2fa' && 'Submit'}
        </button>
      </form>

      <div className="flex items-center justify-center mt-4">
        <button type="button" onClick={() => alert('Google login integration requires Client ID setup in Cloudflare.')} className="w-full flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 font-bold p-2 rounded hover:bg-slate-50 transition">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
          Continue with Google
        </button>
      </div>


      <div className="flex justify-between text-sm text-slate-500 mt-4">
        {mode === 'login' ? (
          <>
            <button type="button" onClick={() => setMode('register')} className="hover:underline">Sign Up</button>
            <button type="button" onClick={() => setMode('forgot')} className="hover:underline">Forgot Password?</button>
          </>
        ) : (
          <button type="button" onClick={() => setMode('login')} className="hover:underline text-center w-full">Back to Login</button>
        )}
      </div>
    </div>
  );
}
