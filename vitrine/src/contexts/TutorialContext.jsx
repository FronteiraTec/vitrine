import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { createPortal, flushSync } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { ConteudoPasso } from '@/components/tutorial/ConteudoPasso'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { TUTORIAIS, tutorialPorId } from '@/tutoriais'
import { jaCumprimentou, marcarCumprimento, reagir } from '@/lib/mascote-global'
import {
  AREA,
  areaDoCaminho,
  assinarRegistros,
  casaRota,
  chaveRegistro,
  gravarAndamento,
  gravarRegistro,
  lerAndamento,
  lerRegistro,
  limparAndamento,
  podeVer,
  versaoRegistros,
} from '@/lib/tutoriais'

/**
 * Tutoriais guiados: quem está aberto, como começar, o que já foi visto.
 *
 *   iniciar(id, { passo, gatilho })  abre um tutorial (o motor vem por `import()`)
 *   encerrar()                       fecha o que estiver aberto, sem despedida
 *   tutorialAtivo                    a definição do tutorial aberto, ou `null`
 *   jaConcluiu(id)                   se a pessoa chegou ao fim dele nesta versão
 *
 * Também decide sozinho o que acontece na chegada, sempre depois de a página
 * carregar:
 *
 *   - retomar o tutorial que estava aberto quando a página recarregou, no
 *     mesmo passo;
 *   - abrir o tutorial marcado com `abrirSozinhoEm` para quem nunca o viu — o
 *     da vitrine só com a interface em português, já que os textos são em
 *     português; o do painel no primeiro acesso de cada pessoa da equipe;
 *   - sem tutorial, o mascote do canto cumprimenta ("Bom dia!", com o nome de
 *     quem entrou com a conta), uma vez por entrada.
 *
 * Fica dentro do roteador (precisa navegar entre os passos) e do idioma.
 */

const DURACAO_DESPEDIDA_MS = 1500
const ATRASO_INICIO_MS = 600

const TutorialContext = createContext(null)

/** Fora do provider — o teste de fumaça renderiza os layouts soltos — nada abre. */
const SEM_PROVIDER = {
  tutorialAtivo: null,
  iniciar: async () => {},
  encerrar: () => {},
  jaConcluiu: () => false,
  despedida: false,
}

export function useTutorial() {
  return useContext(TutorialContext) ?? SEM_PROVIDER
}

/** Roda `acao` só depois do `load` da página e de uma pausa, para não disputar a primeira pintura. */
function depoisDeCarregar(acao) {
  let timer
  const agendar = () => {
    timer = window.setTimeout(acao, ATRASO_INICIO_MS)
  }
  if (document.readyState === 'complete') agendar()
  else window.addEventListener('load', agendar, { once: true })

  return () => {
    window.clearTimeout(timer)
    window.removeEventListener('load', agendar)
  }
}

function mesmoCaminho(a, b) {
  try {
    return decodeURI(a) === decodeURI(b)
  } catch {
    return a === b
  }
}

export function TutorialProvider({ children }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { loading, user, profile, isStaff, isAdmin, canReview } = useAuth()
  const { locale, t } = useLocale()
  const primeiroNome = profile?.name?.trim().split(/\s+/)[0] || null
  const registros = useSyncExternalStore(assinarRegistros, versaoRegistros, versaoRegistros)

  const [ativo, setAtivo] = useState(null)
  const [passo, setPasso] = useState(null)
  const [despedida, setDespedida] = useState(false)

  /** O tour do Shepherd, `'carregando'` enquanto o motor chega, ou `null`. */
  const tourRef = useRef(null)
  /** Onde o passo atual apareceu; sair dali por conta própria encerra o tour. */
  const caminhoRef = useRef(null)
  /**
   * O próprio tour está trocando de página. O React Router aplica a navegação
   * como transição, e numa página carregada sob demanda o `pathname` do React
   * fica para trás por um instante — sem esta marca, a troca feita pelo tour
   * pareceria a pessoa saindo por conta própria.
   */
  const navegandoRef = useRef(false)
  /** Encerramento pelo código (`encerrar()`), que não mostra despedida. */
  const silenciosoRef = useRef(false)
  const usuarioId = user?.id

  const iniciar = useCallback(
    async (id, { passo: inicio = 0, gatilho = null } = {}) => {
      const tutorial = tutorialPorId(id)
      if (!tutorial || tourRef.current) return
      tourRef.current = 'carregando'

      let motor
      try {
        motor = await import('@/components/tutorial/motor')
      } catch (erro) {
        // Sem rede para baixar o motor não há tour, e a página segue normal.
        tourRef.current = null
        console.error('[tutoriais] não foi possível carregar o tutorial', erro)
        return
      }

      const chave = chaveRegistro(tutorial, usuarioId)
      const tour = motor.criarTour({
        tutorial,
        navegar: (destino) => {
          navegandoRef.current = true
          navigate(destino)
        },
        // Síncrono de propósito: o Shepherd mede o balão logo depois de
        // `text()`, e o conteúdo precisa estar lá para a medida sair certa.
        // Efeito colateral a lembrar: o `flushSync` roda os efeitos do React
        // ali mesmo, dentro do Shepherd — por isso nenhum efeito deste
        // arquivo encerra o tour de forma síncrona.
        renderizar: (conteudo) => flushSync(() => setPasso(conteudo)),
        aoMostrar: (indice) => {
          navegandoRef.current = false
          caminhoRef.current = window.location.pathname
          gravarAndamento({
            id: tutorial.id,
            versao: tutorial.versao,
            passo: indice,
            caminho: window.location.pathname,
          })
        },
      })

      const terminar = (situacao) => {
        tourRef.current = null
        caminhoRef.current = null
        navegandoRef.current = false
        gravarRegistro(chave, situacao)
        limparAndamento()
        setPasso(null)
        setAtivo(null)
        if (situacao === 'pulado' && !silenciosoRef.current) setDespedida(true)
        silenciosoRef.current = false
      }
      tour.on('complete', () => terminar('concluido'))
      tour.on('cancel', () => terminar('pulado'))

      tourRef.current = tour
      setAtivo(tutorial)
      tour.start(inicio, gatilho).catch((erro) => {
        console.error('[tutoriais] erro durante o tutorial', erro)
        if (tour.isActive()) {
          silenciosoRef.current = true
          tour.cancel()
        }
      })
    },
    [navigate, usuarioId],
  )

  const encerrar = useCallback(() => {
    const tour = tourRef.current
    if (!tour || tour === 'carregando') return
    silenciosoRef.current = true
    tour.cancel()
  }, [])

  const jaConcluiu = useCallback(
    (id) => {
      const tutorial = tutorialPorId(id)
      return Boolean(tutorial) && lerRegistro(chaveRegistro(tutorial, usuarioId))?.situacao === 'concluido'
    },
    // `registros` muda quando algo é gravado: a função nova faz o menu de
    // ajuda trocar "Começar" por "Ver de novo" sem recarregar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usuarioId, registros],
  )

  // A despedida fica 1,5 s ao lado do botão de ajuda e some sozinha.
  useEffect(() => {
    if (!despedida) return undefined
    const timer = window.setTimeout(() => setDespedida(false), DURACAO_DESPEDIDA_MS)
    return () => window.clearTimeout(timer)
  }, [despedida])

  // A pessoa foi para outra página por conta própria (link, voltar do
  // navegador): o tour não tem mais o que mostrar ali, e é encerrado.
  useEffect(() => {
    const tour = tourRef.current
    if (!ativo || !tour || tour === 'carregando' || navegandoRef.current || !caminhoRef.current) {
      return
    }
    if (mesmoCaminho(pathname, caminhoRef.current)) return
    // Fora da pilha atual: este efeito pode rodar dentro de um `flushSync`
    // disparado pelo próprio Shepherd no meio da exibição de um passo.
    queueMicrotask(() => {
      if (tourRef.current === tour && tour.isActive()) tour.cancel()
    })
  }, [pathname, ativo])

  // Chegada: retomar o tour de antes do recarregamento, abrir o de boas-vindas
  // ou, sem tour nenhum, o mascote do canto cumprimenta quem entrou.
  useEffect(() => {
    if (loading || ativo) return undefined

    const area = areaDoCaminho(pathname)
    const permissoes = { isStaff, isAdmin, canReview }
    let escolhido = null

    const andamento = lerAndamento()
    if (andamento) {
      const tutorial = tutorialPorId(andamento.id)
      const retomavel =
        tutorial &&
        tutorial.versao === andamento.versao &&
        tutorial.area === area &&
        andamento.passo < tutorial.passos.length &&
        mesmoCaminho(andamento.caminho, pathname) &&
        podeVer(tutorial, permissoes)
      if (retomavel) escolhido = { id: tutorial.id, passo: andamento.passo }
      else limparAndamento()
    }

    if (!escolhido && (area === AREA.PAINEL || locale === DEFAULT_LOCALE)) {
      const tutorial = TUTORIAIS.find(
        (candidato) =>
          candidato.area === area &&
          candidato.abrirSozinhoEm &&
          casaRota(candidato.abrirSozinhoEm, pathname) &&
          podeVer(candidato, permissoes) &&
          !lerRegistro(chaveRegistro(candidato, usuarioId)),
      )
      if (tutorial) escolhido = { id: tutorial.id, passo: 0 }
    }

    const identidade = usuarioId ?? 'visitante'

    if (escolhido) {
      // O tour já se apresenta; o mascote do canto não cumprimenta por cima.
      marcarCumprimento(identidade)
      return depoisDeCarregar(() => iniciar(escolhido.id, { passo: escolhido.passo }))
    }

    if (jaCumprimentou(identidade)) return undefined
    return depoisDeCarregar(() => {
      const hora = new Date().getHours()
      const periodo = hora >= 5 && hora < 12 ? 'morning' : hora >= 12 && hora < 18 ? 'afternoon' : 'evening'
      const texto = primeiroNome
        ? t(`mascot.greetingNamed.${periodo}`, { name: primeiroNome })
        : t(`mascot.greeting.${periodo}`)
      // Sem mascote na tela (página de login, por exemplo), o cumprimento
      // fica para a próxima página que tiver um.
      if (reagir('falando', texto, { duracao: 7000, lang: locale, estadoFinal: 'ajuda' })) {
        marcarCumprimento(identidade)
      }
    })
  }, [pathname, loading, ativo, locale, t, usuarioId, primeiroNome, isStaff, isAdmin, canReview, iniciar])

  // Nada sobrevive ao provider: nem tour aberto, nem ouvinte de teclado.
  useEffect(
    () => () => {
      const tour = tourRef.current
      if (tour && tour !== 'carregando' && tour.isActive()) {
        silenciosoRef.current = true
        tour.cancel()
      }
    },
    [],
  )

  const value = useMemo(
    () => ({ tutorialAtivo: ativo, iniciar, encerrar, jaConcluiu, despedida }),
    [ativo, iniciar, encerrar, jaConcluiu, despedida],
  )

  let conteudo = null
  if (passo) {
    const { container, chave, ...dados } = passo
    conteudo = createPortal(<ConteudoPasso key={chave} {...dados} />, container)
  }

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {conteudo}
    </TutorialContext.Provider>
  )
}
