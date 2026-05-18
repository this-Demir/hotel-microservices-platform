'use client'

import { useState, useRef, useEffect } from 'react'
import { chatWithAgent, getInitialChatHistory } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import type { ChatMessage } from '@/lib/types'

function cn(...xs: (string | false | undefined | null)[]) {
  return xs.filter(Boolean).join(' ')
}

const ChatIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)
const SendIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m22 2-7 20-4-9-9-4 20-7Z" />
  </svg>
)
const CheckIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
)
const CalendarIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)
const UsersIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

// ── Booking card detection ────────────────────────────────────────────────────

interface BookingInfo {
  hotel: string
  roomType: string
  checkIn: string
  checkOut: string
  guests: string
  price: string
  reservationId: string
}

function extractBooking(content: string): BookingInfo | null {
  if (!content.toLowerCase().includes('reservation id')) return null
  const clean = content.replace(/\*\*/g, '')
  const get = (pattern: string) => {
    const m = clean.match(new RegExp(pattern + '\\s*:\\s*([^\\n]+)', 'i'))
    return m?.[1]?.trim() ?? ''
  }
  const reservationId = get('Reservation ID')
  if (!reservationId) return null
  return {
    hotel: get('Hotel(?:\\s+Name)?'),
    roomType: get('Room\\s+Type'),
    checkIn: get('Check-?in(?:\\s+Date)?'),
    checkOut: get('Check-?out(?:\\s+Date)?'),
    guests: get('Guests?'),
    price: get('(?:Total\\s+)?Price(?:\\s+Paid)?'),
    reservationId,
  }
}

function BookingCard({ b }: { b: BookingInfo }) {
  return (
    <div className="w-full max-w-[88%] rounded-2xl overflow-hidden ring-1 ring-emerald-200 shadow-sm text-sm">
      <div className="bg-emerald-600 text-white px-4 py-3 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-white/20 grid place-items-center shrink-0">
          <CheckIcon className="w-3.5 h-3.5" />
        </span>
        <span className="font-semibold">Booking Confirmed</span>
      </div>
      <div className="bg-white px-4 py-3 space-y-3">
        <div>
          <div className="font-bold text-slate-900 text-base">{b.hotel}</div>
          <div className="text-slate-500 text-xs mt-0.5">{b.roomType}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-medium uppercase tracking-wide mb-1">
              <CalendarIcon className="w-3 h-3" /> Check-in
            </div>
            <div className="text-slate-800 font-semibold text-xs">{b.checkIn}</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-medium uppercase tracking-wide mb-1">
              <CalendarIcon className="w-3 h-3" /> Check-out
            </div>
            <div className="text-slate-800 font-semibold text-xs">{b.checkOut}</div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <UsersIcon className="w-3.5 h-3.5" /> {b.guests} guests
          </div>
          <div className="text-emerald-700 font-bold text-base">{b.price}</div>
        </div>
        <div className="border-t border-slate-100 pt-2">
          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">Reservation ID</div>
          <div className="font-mono text-[11px] text-slate-500 break-all">{b.reservationId}</div>
        </div>
      </div>
    </div>
  )
}

// ── Inline markdown renderer ──────────────────────────────────────────────────

function boldify(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/)
  return parts.map((p, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-slate-900">{p}</strong> : p
  )
}

function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const out: React.ReactNode[] = []
  let listBuf: string[] = []
  let listKind: 'ul' | 'ol' | null = null

  const flush = (key: number) => {
    if (!listBuf.length) return
    const items = listBuf.map((t, i) => (
      <li key={i} className="leading-relaxed">{boldify(t)}</li>
    ))
    out.push(
      listKind === 'ul'
        ? <ul key={key} className="list-disc ml-4 space-y-0.5 my-1">{items}</ul>
        : <ol key={key} className="list-decimal ml-4 space-y-0.5 my-1">{items}</ol>
    )
    listBuf = []
    listKind = null
  }

  lines.forEach((line, idx) => {
    const t = line.trim()
    if (!t) { flush(idx); return }
    const bullet = t.match(/^[-*]\s+(.+)/)
    const num = t.match(/^\d+\.\s+(.+)/)
    if (bullet) {
      if (listKind !== 'ul') flush(idx)
      listKind = 'ul'
      listBuf.push(bullet[1])
    } else if (num) {
      if (listKind !== 'ol') flush(idx)
      listKind = 'ol'
      listBuf.push(num[1])
    } else {
      flush(idx)
      out.push(<p key={idx} className="leading-relaxed mb-0.5">{boldify(t)}</p>)
    }
  })
  flush(lines.length)

  return <div className="space-y-0.5 text-sm">{out}</div>
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl bg-indigo-600 text-white rounded-br-md">
          {msg.content}
        </div>
      </div>
    )
  }

  const booking = extractBooking(msg.content)
  if (booking) {
    return (
      <div className="flex justify-start">
        <BookingCard b={booking} />
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] px-3.5 py-2.5 rounded-2xl bg-white text-slate-800 ring-1 ring-slate-200 rounded-bl-md">
        <Markdown text={msg.content} />
      </div>
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────

export function ChatWidget() {
  const { isLoggedIn, token } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [thinking, setThinking] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getInitialChatHistory().then((h) =>
      setMessages(h.map((m) => ({ role: m.role, content: m.content })))
    )
  }, [])

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight
  }, [messages, thinking, open])

  if (!isLoggedIn) return null

  const send = async () => {
    const t = text.trim()
    if (!t || !token || thinking) return
    setText('')
    const history = messages
    setMessages((m) => [...m, { role: 'user', content: t }])
    setThinking(true)
    try {
      const res = await chatWithAgent(t, token, history)
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setMessages((m) => [...m, { role: 'assistant', content: msg }])
    } finally {
      setThinking(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl grid place-items-center transition-transform hover:scale-105"
        aria-label="Toggle chat"
      >
        {open ? <XIcon className="w-6 h-6" /> : <ChatIcon className="w-6 h-6" />}
        {!open && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-30 w-[400px] h-[560px] max-h-[80vh] bg-white rounded-3xl shadow-2xl ring-1 ring-slate-200 flex flex-col overflow-hidden animate-slide-up">
          <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 grid place-items-center">
                <ChatIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-sm">StayEase Agent</div>
                <div className="text-[11px] text-indigo-100 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  online — typically replies in seconds
                </div>
              </div>
            </div>
          </div>

          <div ref={scroller} className="flex-1 overflow-y-auto nice-scroll p-4 space-y-3 bg-slate-50/50">
            {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
            {thinking && (
              <div className="flex justify-start">
                <div className="bg-white text-slate-800 ring-1 ring-slate-200 rounded-2xl rounded-bl-md px-3.5 py-3 flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce-dot" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce-dot" style={{ animationDelay: '0.16s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce-dot" style={{ animationDelay: '0.32s' }} />
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-100 bg-white">
            <div className="flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 500))}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ask about a destination…"
                maxLength={500}
                className="flex-1 px-4 py-2.5 rounded-full bg-slate-100 outline-none text-sm focus:bg-white focus:ring-2 focus:ring-indigo-200 transition"
              />
              <button
                onClick={send}
                disabled={!text.trim() || thinking}
                className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white grid place-items-center transition shrink-0"
              >
                <SendIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
