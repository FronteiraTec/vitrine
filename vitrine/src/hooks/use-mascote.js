import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { entrarEmCena, roupaDaSessao } from '@/lib/mascote-global'
import { prefereMenosMovimento } from '@/lib/tutoriais'

/** Roupa do mascote nesta entrada (visitante ou conta): `'normal'` ou `'astronauta'`. */
export function useRoupaDoMascote() {
  const { user } = useAuth()
  const identidade = user?.id ?? 'visitante'
  return useMemo(() => roupaDaSessao(identidade), [identidade])
}

/** Tela com o próprio mascote: o do canto sai de cena enquanto ela estiver montada. */
export function useMascoteEmCena() {
  useEffect(() => entrarEmCena(), [])
}

const INTERVALO_LETRA_MS = 28

/**
 * Texto aparecendo letra a letra. Com movimento reduzido (do sistema ou do
 * painel do leitor) ou `ativo: false`, vem inteiro de uma vez. Uma `chave`
 * nova recomeça a digitação.
 */
export function useDigitacao(texto, { ativo = true, chave } = {}) {
  const [semMovimento] = useState(prefereMenosMovimento)
  const digita = ativo && !semMovimento
  const [progresso, setProgresso] = useState({ chave, letras: digita ? 0 : texto.length })

  // Texto novo: recomeça já nesta renderização, sem esperar um efeito.
  let letras = progresso.letras
  if (progresso.chave !== chave) {
    letras = digita ? 0 : texto.length
    setProgresso({ chave, letras })
  }

  const digitando = digita && letras < texto.length

  useEffect(() => {
    if (!digitando) return undefined
    const timer = window.setInterval(
      () => setProgresso((atual) => ({ ...atual, letras: Math.min(atual.letras + 1, texto.length) })),
      INTERVALO_LETRA_MS,
    )
    return () => window.clearInterval(timer)
  }, [digitando, texto.length])

  return { letras: Math.min(letras, texto.length), digitando }
}

const EVENTOS_DE_ATIVIDADE = ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel']

/** `true` depois de `ms` sem nenhuma interação; volta a `false` no primeiro movimento. */
export function useOcioso(ms) {
  const [ocioso, setOcioso] = useState(false)

  useEffect(() => {
    let timer
    const agendar = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setOcioso(true), ms)
    }
    const atividade = () => {
      setOcioso(false)
      agendar()
    }
    for (const evento of EVENTOS_DE_ATIVIDADE) {
      window.addEventListener(evento, atividade, { passive: true })
    }
    agendar()
    return () => {
      window.clearTimeout(timer)
      for (const evento of EVENTOS_DE_ATIVIDADE) window.removeEventListener(evento, atividade)
    }
  }, [ms])

  return ocioso
}

/**
 * `true` quando `ativo` está ligado há mais de `ms` sem interrupção. Cada vez
 * que `ativo` liga é um episódio novo, e a contagem recomeça do zero.
 */
export function useDemora(ativo, ms) {
  const [episodio, setEpisodio] = useState({ ativo, numero: 0 })
  const [vencido, setVencido] = useState(-1)

  let numero = episodio.numero
  if (episodio.ativo !== ativo) {
    numero = ativo ? numero + 1 : numero
    setEpisodio({ ativo, numero })
  }

  useEffect(() => {
    if (!ativo) return undefined
    const timer = window.setTimeout(() => setVencido(numero), ms)
    return () => window.clearTimeout(timer)
  }, [ativo, numero, ms])

  return ativo && vencido === numero
}
