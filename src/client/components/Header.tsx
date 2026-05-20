'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

function cn(...xs: (string | false | undefined | null)[]) {
  return xs.filter(Boolean).join(' ')
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((s) => s[0]).join('').toUpperCase()
}

const LogoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path d="M5 26V12l11-7 11 7v14H19v-9h-6v9H5Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
  </svg>
)
const BellIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
)

interface HeaderProps {
  onBellClick: () => void
  unreadCount?: number
}

export function Header({ onBellClick, unreadCount = 0 }: HeaderProps) {
  const { isLoggedIn, user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const isLanding = pathname === '/'
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const transparent = isLanding && !scrolled

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-300',
        transparent
          ? 'bg-transparent'
          : 'bg-white/90 backdrop-blur border-b border-slate-200/70 shadow-sm',
      )}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => router.push('/')}
          className={cn('flex items-center gap-2 font-extrabold tracking-tight', transparent ? 'text-white' : 'text-slate-900')}
        >
          <span className={cn('w-9 h-9 rounded-xl grid place-items-center', transparent ? 'bg-white/15 backdrop-blur' : 'bg-indigo-600 text-white')}>
            <LogoIcon className="w-5 h-5" />
          </span>
          <span className="text-lg">StayEase</span>
        </button>

        {/* Nav */}
        <nav className={cn('hidden md:flex items-center gap-7 text-sm font-medium', transparent ? 'text-white/90' : 'text-slate-600')}>
          <button onClick={() => router.push('/')} className={cn('hover:opacity-100 transition', pathname === '/' ? 'opacity-100' : 'opacity-80')}>Home</button>
          <button onClick={() => router.push('/search')} className={cn('hover:opacity-100 transition', pathname === '/search' ? 'opacity-100' : 'opacity-80')}>Search</button>
          {isLoggedIn && <button onClick={() => router.push('/bookings')} className={cn('hover:opacity-100 transition', pathname === '/bookings' ? 'opacity-100' : 'opacity-80')}>Trips</button>}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2">
          {!isLoggedIn ? (
            <>
              <button onClick={() => router.push('/sign-in')} className={cn('px-4 py-2 rounded-lg text-sm font-semibold transition', transparent ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100')}>
                Sign In
              </button>
              <button onClick={() => router.push('/sign-up')} className="px-4 py-2 rounded-full text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition">
                Sign Up
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onBellClick}
                className={cn('relative w-10 h-10 grid place-items-center rounded-full transition', transparent ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100')}
              >
                <BellIcon className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold grid place-items-center ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => router.push('/account')}
                className={cn('hidden sm:flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full transition', transparent ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-800 hover:bg-slate-200')}
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 grid place-items-center text-white text-xs font-bold">
                  {user ? initials(user.name) : '?'}
                </div>
                <span className="text-sm font-semibold">{user?.name.split(' ')[0]}</span>
              </button>
              <button onClick={logout} className={cn('px-3 py-2 rounded-lg text-sm font-semibold transition', transparent ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100')}>
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
