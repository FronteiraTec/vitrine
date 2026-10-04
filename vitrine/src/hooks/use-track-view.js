import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { trackView } from '@/lib/audience'

/**
 * Conta uma visualização da notícia ou iniciativa aberta.
 *
 * Espera a sessão ser conhecida: a equipe navegando no site — revisando,
 * conferindo uma publicação — não é audiência. O servidor faz a mesma
 * checagem pelo cookie; aqui é só para nem mandar a requisição.
 */
export function useTrackView(type, id, locale) {
  const { loading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!id || loading || isAuthenticated) return
    trackView({ type, id, locale })
  }, [type, id, locale, loading, isAuthenticated])
}
