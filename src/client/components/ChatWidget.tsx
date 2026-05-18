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
    setMessages((m) => [...m, { role: 'user', content: t }])
    setThinking(true)
    try {
      const res = await chatWithAgent(t, token)
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, I ran into an issue. Please try again.' }])
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
        <div className="fixed bottom-24 right-6 z-30 w-[380px] h-[520px] max-h-[80vh] bg-white rounded-3xl shadow-2xl ring-1 ring-slate-200 flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
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

          {/* Messages */}
          <div ref={scroller} className="flex-1 overflow-y-auto nice-scroll p-4 space-y-3 bg-slate-50/50">
            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl',
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-white text-slate-800 ring-1 ring-slate-200 rounded-bl-md',
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
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

          {/* Input */}
          <div className="p-3 border-t border-slate-100 bg-white">
            <div className="flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ask about a destination…"
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
