import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { getSupabaseClient } from './supabase'

export const SESSION_COOKIE = 'yeschef-session'

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
}

export async function _getSession() {
  const raw = getCookie(SESSION_COOKIE)
  if (!raw) return null

  let tokens: { access_token: string; refresh_token: string }
  try {
    tokens = JSON.parse(raw)
    if (!tokens.access_token || !tokens.refresh_token) return null
  } catch {
    return null
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  })

  if (error || !data.user) return null

  if (data.session) {
    setCookie(
      SESSION_COOKIE,
      JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      }),
      cookieOptions,
    )
  }

  return data.user
}

export async function _requireAuth() {
  const user = await _getSession()
  if (!user) throw redirect({ to: '/auth/signin' })
  return user
}

export { setCookie, deleteCookie }
