'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signIn, type AuthState } from '@/app/actions/auth'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Input, Alert } from '@/components/ui'

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, null)

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-black uppercase tracking-wider text-center">
            🥪 Welcome Back, Rat
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to access the camp system.
          </CardDescription>
        </CardHeader>
        <form action={action}>
          <CardContent className="space-y-4">
            {state?.error && (
              <Alert variant="error">{state.error}</Alert>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-bold uppercase tracking-wider mb-1">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
              {state?.fieldErrors?.email && (
                <p className="text-red-600 text-sm mt-1">{state.fieldErrors.email[0]}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold uppercase tracking-wider mb-1">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Your password"
                required
              />
              {state?.fieldErrors?.password && (
                <p className="text-red-600 text-sm mt-1">{state.fieldErrors.password[0]}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? 'Signing in...' : 'Sign In'}
            </Button>
            <p className="text-sm text-center text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-bold text-black underline hover:text-yellow-600">
                Sign Up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
