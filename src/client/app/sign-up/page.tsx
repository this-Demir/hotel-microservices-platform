'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const LogoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path d="M5 26V12l11-7 11 7v14H19v-9h-6v9H5Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
  </svg>
)

export default function SignUpPage() {
  const { signUp, confirmSignUp, login } = useAuth()
  const router = useRouter()
  const [stage, setStage] = useState<'register' | 'confirm'>('register')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setErr('Passwords do not match.'); return }
    if (!name.trim()) { setErr('Please enter your name.'); return }
    setErr('')
    setLoading(true)
    try {
      await signUp(name.trim(), email, password)
      setStage('confirm')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Sign-up failed')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await confirmSignUp(email, code)
      await login(email, password)
      router.push('/')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Confirmation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Left panel */}
      <div className="hidden lg:block relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://picsum.photos/seed/stayease-auth-side/1200/1400" className="absolute inset-0 w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 to-slate-900/60" />
        <div className="relative h-full flex flex-col justify-between p-12 text-white">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 font-extrabold text-lg w-fit">
            <span className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur grid place-items-center">
              <LogoIcon className="w-5 h-5" />
            </span>
            StayEase
          </button>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest opacity-70 mb-3">Member benefits</div>
            <h2 className="text-4xl font-extrabold tracking-tight leading-tight max-w-md">
              Save 15% on every stay, instantly.
            </h2>
            <p className="text-white/80 mt-4 max-w-md">
              Members see member rates the moment they land on a hotel — no codes, no hoops. Plus your trip history, saved payment, and an always-on travel agent.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="flex -space-x-2">
                {[
                  ['MK', 'bg-amber-400 text-amber-900'],
                  ['JR', 'bg-emerald-400 text-emerald-900'],
                  ['AS', 'bg-fuchsia-400 text-fuchsia-900'],
                  ['TL', 'bg-sky-400 text-sky-900'],
                ].map(([initials, colors]) => (
                  <div key={initials} className={`w-8 h-8 rounded-full ring-2 ring-indigo-900 grid place-items-center text-[11px] font-bold ${colors}`}>
                    {initials}
                  </div>
                ))}
              </div>
              <div className="text-sm text-white/80">
                Joined by <span className="font-bold text-white">12,400+</span> travellers this month
              </div>
            </div>
          </div>
          <div className="text-xs text-white/50">© 2026 StayEase</div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <button onClick={() => router.push('/')} className="lg:hidden flex items-center gap-2 font-extrabold text-slate-900 mb-8">
            <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white grid place-items-center">
              <LogoIcon className="w-5 h-5" />
            </span>
            StayEase
          </button>

          {stage === 'register' ? (
            <>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create your account</h2>
              <p className="text-slate-500 mt-2">Takes 30 seconds. No card required.</p>

              <form onSubmit={handleRegister} className="mt-8 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Full name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                    placeholder="Alex Johnson"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Email</span>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Password</span>
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Confirm password</span>
                  <input
                    required
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                  />
                </label>
                {err && (
                  <div className="text-sm text-red-600 bg-red-50 ring-1 ring-red-100 rounded-xl px-3 py-2">{err}</div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold py-3.5 rounded-full transition shadow-md flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creating account…</>
                  ) : 'Create account'}
                </button>
              </form>

              <div className="mt-6 text-sm text-slate-500 text-center">
                Already have an account?{' '}
                <button onClick={() => router.push('/sign-in')} className="text-indigo-600 hover:text-indigo-700 font-semibold">
                  Sign in
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Check your email</h2>
              <p className="text-slate-500 mt-2">
                We sent a 6-digit code to <span className="font-semibold text-slate-700">{email}</span>. Enter it below to confirm your account.
              </p>

              <form onSubmit={handleConfirm} className="mt-8 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Confirmation code</span>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm tracking-widest"
                  />
                </label>
                {err && (
                  <div className="text-sm text-red-600 bg-red-50 ring-1 ring-red-100 rounded-xl px-3 py-2">{err}</div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white font-semibold py-3.5 rounded-full transition shadow-md flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Confirming…</>
                  ) : 'Confirm account'}
                </button>
                <button
                  type="button"
                  onClick={() => setStage('register')}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 py-2"
                >
                  Back
                </button>
              </form>
            </>
          )}

          <p className="text-[11px] text-slate-400 text-center mt-8">
            By continuing you accept our Terms and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
