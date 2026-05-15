'use client'

import { useRouter } from 'next/navigation'
import { SearchCard } from '@/components/SearchCard'
import { mockCities } from '@/lib/mock-data'

const LogoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path d="M5 26V12l11-7 11 7v14H19v-9h-6v9H5Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
  </svg>
)
const CheckIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m20 6-11 11-5-5" />
  </svg>
)

const cityBadges = ['Trending', 'Romantic', 'Hidden gem', 'City break']

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="-mt-16">
      {/* Hero */}
      <section className="relative min-h-[680px] flex items-center">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://picsum.photos/seed/stayease-hero-mountains/1920/1100" className="w-full h-full object-cover" alt="" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/55 to-indigo-900/70" />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-32 pb-16 w-full">
          <div className="max-w-3xl text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur ring-1 ring-white/20 text-xs font-semibold mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Members save 15% on every stay
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Find your next stay,<br />
              <span className="text-indigo-300">without the noise.</span>
            </h1>
            <p className="text-lg text-white/80 mt-5 max-w-xl">
              Hand-picked hotels in 60+ destinations. Honest reviews, transparent pricing, and a travel agent in your pocket.
            </p>
          </div>
          <div className="mt-10 max-w-5xl">
            <SearchCard dark />
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-white/80 text-sm">
            <div className="flex items-center gap-2"><CheckIcon className="w-4 h-4 text-emerald-400" /> Free cancellation up to 48h</div>
            <div className="flex items-center gap-2"><CheckIcon className="w-4 h-4 text-emerald-400" /> Price-match guarantee</div>
            <div className="flex items-center gap-2"><CheckIcon className="w-4 h-4 text-emerald-400" /> 24/7 in-app concierge</div>
          </div>
        </div>
      </section>

      {/* Featured destinations */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-2">Featured</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Destinations we love right now</h2>
          </div>
          <button onClick={() => router.push('/search')} className="hidden sm:inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            View all →
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {mockCities.map((c, i) => (
            <button
              key={c.name}
              onClick={() => router.push(`/search?location=${encodeURIComponent(c.name)}`)}
              className="group relative h-72 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-200 text-left ring-1 ring-slate-200/70"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.img} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <div className="text-[11px] uppercase tracking-widest opacity-80">{c.country}</div>
                <div className="text-2xl font-extrabold mt-1">{c.name}</div>
                <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition">
                  Explore <span aria-hidden>→</span>
                </div>
              </div>
              <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-white/95 text-slate-900 text-[11px] font-bold">
                {cityBadges[i]}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Value props */}
      <section className="bg-white border-y border-slate-200/70">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 grid md:grid-cols-3 gap-10">
          {[
            { title: 'Honest reviews, never paid', body: 'Every review is from a verified booking. No promoted listings, no bot ratings.', icon: '✦' },
            { title: 'Best-price guarantee', body: 'Find the same room cheaper elsewhere within 24 hours and we refund the difference.', icon: '◈' },
            { title: 'Your agent, always on', body: 'Chat with our travel agent any time of day to plan, change, or rebook a stay.', icon: '◉' },
          ].map((v) => (
            <div key={v.title}>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 grid place-items-center text-xl font-bold">{v.icon}</div>
              <h3 className="font-bold text-lg text-slate-900 mt-4">{v.title}</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-14 grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 font-extrabold text-white text-lg">
              <span className="w-8 h-8 rounded-lg bg-indigo-600 grid place-items-center">
                <LogoIcon className="w-4 h-4" />
              </span>
              StayEase
            </div>
            <p className="text-sm text-slate-400 mt-3 max-w-xs">Smarter hotel booking for travellers who care where they sleep.</p>
          </div>
          {[
            { h: 'Explore', items: ['Destinations', 'Featured', 'Member rates', 'Gift cards'] },
            { h: 'Support', items: ['Help center', 'Cancellations', 'Contact agent', 'Status'] },
            { h: 'Company', items: ['About', 'Careers', 'Press', 'Sustainability'] },
          ].map((g) => (
            <div key={g.h}>
              <div className="text-xs uppercase tracking-widest font-bold text-white mb-3">{g.h}</div>
              <ul className="space-y-2 text-sm">
                {g.items.map((item) => (
                  <li key={item}><a href="#" className="hover:text-white transition">{item}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
          © 2026 StayEase, Inc.
        </div>
      </footer>
    </div>
  )
}
