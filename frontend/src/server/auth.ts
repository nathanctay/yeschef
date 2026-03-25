import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseClient } from './supabase'
import { _getSession, _requireAuth, SESSION_COOKIE, cookieOptions, setCookie, deleteCookie } from './auth-internal'

export const getSession = createServerFn().handler(() => _getSession())

export const requireAuth = createServerFn().handler(() => _requireAuth())

const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1),
})

export const signUp = createServerFn()
  .inputValidator((data: z.infer<typeof SignUpSchema>) => SignUpSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { display_name: data.displayName },
      },
    })

    if (error || !authData.session) {
      return { error: error?.message ?? 'Sign up failed' }
    }

    setCookie(
      SESSION_COOKIE,
      JSON.stringify({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      }),
      cookieOptions,
    )

    return { success: true }
  })

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const signIn = createServerFn()
  .inputValidator((data: z.infer<typeof SignInSchema>) => SignInSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error || !authData.session) {
      return { error: error?.message ?? 'Sign in failed' }
    }

    setCookie(
      SESSION_COOKIE,
      JSON.stringify({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      }),
      cookieOptions,
    )

    return { success: true }
  })

export async function handleSignOut() {
  deleteCookie(SESSION_COOKIE)
}

export const signOut = createServerFn().handler(handleSignOut)
