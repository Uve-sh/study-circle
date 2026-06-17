'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, BookOpen } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/')
    })
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (error) {
        setMessage({ text: error.message, type: 'error' })
      } else if (data.session) {
        // Email confirmation disabled in Supabase — user is instantly logged in
        router.push('/')
        router.refresh()
      } else {
        setMessage({ text: 'Account created! Check your email to confirm.', type: 'success' })
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage({ text: error.message, type: 'error' })
      } else {
        router.push('/')
        router.refresh()
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-dvh bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[390px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 bg-card border border-border rounded-2xl flex items-center justify-center mb-4">
            <BookOpen size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Study Circle</h1>
          <p className="text-muted text-sm mt-1">Accountability for your grind</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-card rounded-2xl p-1 mb-6 border border-border">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setMessage(null) }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${!isSignUp ? 'bg-white text-black' : 'text-muted'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setMessage(null) }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${isSignUp ? 'bg-white text-black' : 'text-muted'}`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          {isSignUp && (
            <div>
              <label className="text-sm text-muted font-medium mb-2 block">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ahmed"
                required
                className="w-full bg-card border border-border rounded-2xl px-5 py-4 text-white placeholder:text-muted focus:outline-none focus:border-white/40 transition-colors"
              />
            </div>
          )}
          <div>
            <label className="text-sm text-muted font-medium mb-2 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-card border border-border rounded-2xl px-5 py-4 text-white placeholder:text-muted focus:outline-none focus:border-white/40 transition-colors"
            />
          </div>
          <div>
            <label className="text-sm text-muted font-medium mb-2 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full bg-card border border-border rounded-2xl px-5 py-4 text-white placeholder:text-muted focus:outline-none focus:border-white/40 transition-colors"
            />
          </div>

          {message && (
            <p className={`text-sm text-center px-2 ${message.type === 'success' ? 'text-status-completed' : 'text-status-missed'}`}>
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-white text-black font-bold text-lg rounded-2xl mt-2 flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity active:scale-[0.98]"
          >
            {loading && <Loader2 size={20} className="animate-spin" />}
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
