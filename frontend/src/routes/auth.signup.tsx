import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { signUp } from '../server/auth'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

function SignUpPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const result = await signUp({ data: { email, password, displayName } })
      if (result?.error) {
        setError(result.error)
        setPending(false)
        return
      }
      await router.invalidate()
      await router.navigate({ to: '/explore' })
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong')
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFDF8] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1
          className="text-center text-3xl font-bold mb-8"
          style={{ fontFamily: "'Fraunces', Georgia, serif", color: '#E53935' }}
        >
          yesChef
        </h1>

        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid #F1E7DA',
            boxShadow: '0 4px 24px rgba(229, 57, 53, 0.08)',
          }}
        >
          <h2 className="text-xl font-semibold text-[#1F2937] mb-6">Create account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Display name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              required
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-[#6B7280] mt-6">
          Already have an account?{' '}
          <Link to="/auth/signin" className="text-[#E53935] hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/auth/signup')({
  component: SignUpPage,
})
