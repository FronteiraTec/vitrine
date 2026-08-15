import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { friendlyError, isSupabaseConfigured, supabase } from '@/lib/supabase'
import { ROLE } from '@/lib/constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  /*
   * O perfil é guardado junto do id do usuário a que pertence. Assim o estado
   * derivado abaixo descarta sozinho o perfil de uma sessão anterior, sem
   * precisar de um efeito de limpeza que sincronize `profile` com `session`.
   */
  const [profileEntry, setProfileEntry] = useState(null)
  // `initializing` cobre a restauração da sessão; o carregamento do perfil é
  // derivado. Guardas de rota precisam esperar os dois antes de decidir.
  const [initializing, setInitializing] = useState(isSupabaseConfigured)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!supabase) return undefined

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted.current) return
        setSession(data.session ?? null)
      })
      .finally(() => {
        if (mounted.current) setInitializing(false)
      })

    // O callback do Supabase roda dentro de um lock interno: qualquer consulta
    // ao banco aqui pode travar. Guardamos apenas a sessão e buscamos o perfil
    // no efeito seguinte.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted.current) return
      setSession(nextSession ?? null)
      setInitializing(false)
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id ?? null

  const loadProfile = useCallback(async (id) => {
    if (!supabase || !id) return
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role, avatar_url, is_active, created_at')
      .eq('id', id)
      .maybeSingle()

    if (!mounted.current) return
    if (error) console.error('Falha ao carregar o perfil:', error.message)
    setProfileEntry({ userId: id, data: error ? null : (data ?? null) })
  }, [])

  useEffect(() => {
    if (!userId) return
    loadProfile(userId)
  }, [userId, loadProfile])

  // Só vale o perfil que pertence à sessão atual.
  const profile = profileEntry?.userId === userId ? profileEntry.data : null
  const profileLoading = Boolean(userId) && profileEntry?.userId !== userId

  const signIn = useCallback(async (email, password) => {
    if (!supabase) throw new Error('Supabase não configurado.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(friendlyError(error))
  }, [])

  const signUp = useCallback(async (email, password, name) => {
    if (!supabase) throw new Error('Supabase não configurado.')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) throw new Error(friendlyError(error))
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setProfileEntry(null)
  }, [])

  const requestPasswordReset = useCallback(async (email) => {
    if (!supabase) throw new Error('Supabase não configurado.')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    if (error) throw new Error(friendlyError(error))
  }, [])

  const updatePassword = useCallback(async (password) => {
    if (!supabase) throw new Error('Supabase não configurado.')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw new Error(friendlyError(error))
  }, [])

  const value = useMemo(() => {
    const role = profile?.role ?? null
    const active = Boolean(profile?.is_active)
    return {
      configured: isSupabaseConfigured,
      session,
      user: session?.user ?? null,
      profile,
      role,
      loading: initializing || profileLoading,
      isAuthenticated: Boolean(session?.user),
      isStaff: active,
      isAdmin: active && role === ROLE.ADMIN,
      canReview: active && (role === ROLE.ADMIN || role === ROLE.REVIEWER),
      canManageCategories: active && role === ROLE.ADMIN,
      refreshProfile: () => loadProfile(userId),
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
    }
  }, [
    session,
    profile,
    initializing,
    profileLoading,
    userId,
    loadProfile,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>.')
  return context
}
