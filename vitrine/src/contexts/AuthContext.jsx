import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, UNAUTHORIZED_EVENT } from '@/lib/api'
import { ROLE } from '@/lib/constants'

const AuthContext = createContext(null)

const SIGNED_OUT = { user: null, profile: null }

/** Resposta de `/api/auth/*` → estado. Sempre os dois campos, nunca `undefined`. */
function toState(data) {
  return data?.user ? { user: data.user, profile: data.profile ?? null } : SIGNED_OUT
}

/**
 * Sessão do painel.
 *
 * O cookie de sessão é `httpOnly`: o JavaScript não o lê. Para saber se há
 * alguém logado, a página pergunta à API (`/api/auth/session`) ao abrir, e
 * cada ação de login ou logout devolve o estado novo na própria resposta.
 */
export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState(SIGNED_OUT)
  // Guardas de rota precisam esperar a primeira resposta antes de decidir.
  const [initializing, setInitializing] = useState(true)
  const mounted = useRef(true)

  const apply = useCallback((next) => {
    if (mounted.current) setState(next)
  }, [])

  useEffect(() => {
    mounted.current = true

    api
      .get('/auth/session')
      .then((data) => apply(toState(data)))
      .catch(() => apply(SIGNED_OUT))
      .finally(() => {
        if (mounted.current) setInitializing(false)
      })

    // Qualquer 401 da API — sessão expirada, encerrada em outro dispositivo,
    // senha trocada — derruba o estado aqui, e as guardas levam ao login.
    const onUnauthorized = () => apply(SIGNED_OUT)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)

    return () => {
      mounted.current = false
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    }
  }, [apply])

  const userId = state.user?.id ?? null

  const refreshProfile = useCallback(async () => {
    apply(toState(await api.get('/auth/session')))
  }, [apply])

  const signIn = useCallback(
    async (email, password) => {
      apply(toState(await api.post('/auth/login', { email, password })))
    },
    [apply],
  )

  /** Cadastro da primeira conta da instalação, que já entra logada. */
  const signUp = useCallback(
    async (email, password, name) => {
      apply(toState(await api.post('/auth/signup', { email, password, name })))
    },
    [apply],
  )

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      apply(SIGNED_OUT)
      // O que a equipe viu no painel não fica no cache da aba para o próximo
      // que usar o computador.
      queryClient.clear()
    }
  }, [apply, queryClient])

  const requestPasswordReset = useCallback(async (email) => {
    await api.post('/auth/password/forgot', { email })
  }, [])

  /** Destino do link do e-mail: troca a senha e já entra. */
  const resetPassword = useCallback(
    async (token, password) => {
      apply(toState(await api.post('/auth/password/reset', { token, password })))
    },
    [apply],
  )

  /** Troca de senha de quem está logado. As outras sessões da conta caem. */
  const updatePassword = useCallback(async (password, currentPassword) => {
    await api.post('/auth/password', { password, currentPassword })
  }, [])

  const value = useMemo(() => {
    const { user, profile } = state
    const role = profile?.role ?? null
    const active = Boolean(profile?.is_active)
    return {
      session: user ? { user } : null,
      user,
      profile,
      role,
      loading: initializing,
      isAuthenticated: Boolean(user),
      isStaff: active,
      isAdmin: active && role === ROLE.ADMIN,
      canReview: active && (role === ROLE.ADMIN || role === ROLE.REVIEWER),
      canManageCategories: active && role === ROLE.ADMIN,
      userId,
      refreshProfile,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      resetPassword,
      updatePassword,
    }
  }, [
    state,
    initializing,
    userId,
    refreshProfile,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    resetPassword,
    updatePassword,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  return context
}
