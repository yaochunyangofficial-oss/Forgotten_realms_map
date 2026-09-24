'use client';
import { useLocale } from '@/lib/use-locale';
import { signIn, signUp } from './actions';
import { apiErrorText, type ApiErrorCode } from '@/lib/api-errors';
import { useEffect, useState } from 'react';

export default function Login() {
  const { locale, setLocale, tr } = useLocale();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const errorCode = query.get('error');
    setError(errorCode && errorCode in apiErrorText
      ? apiErrorText[errorCode as ApiErrorCode]
      : errorCode ? '登入失敗，請檢查帳號設定或重新輸入密碼。' : null);
    setNotice(query.get('notice') === 'confirm');
  }, []);

  const en = locale === 'en';
  return <main className="login-page">
    <div className="language-switch">
      <button onClick={() => setLocale('zh')} aria-pressed={!en}>中文</button>
      <button onClick={() => setLocale('en')} aria-pressed={en}>EN</button>
    </div>
    <h1>DND Map</h1>
    <p>made by Martin Y · v0.2.0</p>
    <h2>{mode === 'signin'
      ? (en ? 'Sign in to your campaign' : '登入你的戰役')
      : (en ? 'Create an account' : '建立帳號')}</h2>
    <p>{mode === 'signin'
      ? (en ? 'Use your email and password.' : '使用你的電子郵件與密碼。')
      : (en ? 'Create an account to start a GM campaign.' : '建立帳號即可開始 GM 戰役。')}</p>
    {notice && <p role="status">{en ? 'Check your email to confirm your account, then sign in.' : '請查看電子郵件完成帳號確認，再登入。'}</p>}
    {error && <p role="alert">{tr(error)}</p>}
    <form action={mode === 'signin' ? signIn : signUp}>
      <input type="hidden" name="locale" value={locale}/>
      <label>{en ? 'Email' : '電子郵件'}<input name="email" type="email" autoComplete="email" required/></label>
      <label>{en ? 'Password' : '密碼'}<input name="password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={8}/></label>
      <button className="primary full">{mode === 'signin'
        ? (en ? 'Sign in' : '登入')
        : (en ? 'Create account' : '建立帳號')}</button>
    </form>
    <button className="text-button" type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setNotice(false); }}>
      {mode === 'signin'
        ? (en ? 'New here? Create an account' : '第一次使用？建立帳號')
        : (en ? 'Already have an account? Sign in' : '已有帳號？登入')}
    </button>
    <a href="/">{en ? 'Back to map' : '回到地圖'}</a>
  </main>;
}
