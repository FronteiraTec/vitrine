import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { CircleHelp } from 'lucide-react'
import Mascote from '@/components/mascote/Mascote'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAuth } from '@/contexts/AuthContext'
import { useLocale } from '@/contexts/LocaleContext'
import { useTutorial } from '@/contexts/TutorialContext'
import { useDemora, useDigitacao, useOcioso, useRoupaDoMascote } from '@/hooks/use-mascote'
import { DEFAULT_LOCALE } from '@/i18n/config'
import {
  assinarMascote,
  encerrarReacao,
  lerEmCena,
  lerNoServidor,
  lerReacao,
  registrarMascote,
} from '@/lib/mascote-global'
import { tutoriaisDaTela } from '@/lib/tutoriais'
import { cn } from '@/lib/utils'
import { TUTORIAIS } from '@/tutoriais'

const DESPEDIDA = 'Tudo bem! Se precisar, é só me chamar.'
/** Carregamento mais longo que isto é "demorando". */
const DEMORA_MS = 2000
/** Sem interação por este tempo, o mascote dorme. */
const SONO_MS = 2 * 60 * 1000

/** Só a primeira carga de uma tela: atualizar o que já está na tela não é espera. */
const primeiraCarga = { predicate: (query) => query.state.status === 'pending' }

/**
 * Botão de ajuda fixo no canto inferior direito, com o mascote.
 *
 * Abre um menu com os tutoriais desta tela. Fica à DIREITA porque o painel de
 * acessibilidade ocupa o canto esquerdo; o gatilho do VLibras, também à
 * direita, fica no meio da altura da tela, longe daqui.
 *
 * O mascote também reage ao que acontece na página. Do mais para o menos
 * importante:
 *
 *   1. outro mascote em cena (tour aberto, tela de 404) — este vira um ícone;
 *   2. despedida de um tour que a pessoa pulou;
 *   3. reação pedida pela página (`lib/mascote-global.js`): criou algo,
 *      faltou informação, deu erro, o cumprimento de quem chegou;
 *   4. a página está demorando para carregar ou salvar;
 *   5. dois minutos sem interação — ele dorme;
 *   6. parado.
 */
export function BotaoAjuda() {
  const { pathname } = useLocation()
  const { t, locale } = useLocale()
  const permissoes = useAuth()
  const { tutorialAtivo, iniciar, jaConcluiu, despedida } = useTutorial()
  const reacao = useSyncExternalStore(assinarMascote, lerReacao, lerNoServidor)
  const outroEmCena = useSyncExternalStore(assinarMascote, lerEmCena, lerNoServidor) > 0
  const roupa = useRoupaDoMascote()
  const [aberto, setAberto] = useState(false)
  const gatilhoRef = useRef(null)

  const buscando = useIsFetching(primeiraCarga) > 0
  const salvando = useIsMutating() > 0
  const demorando = useDemora(buscando || salvando, DEMORA_MS)
  const ocioso = useOcioso(SONO_MS)

  const tutoriais = tutoriaisDaTela(TUTORIAIS, pathname, permissoes)
  // Os textos dos tutoriais são em português; em outro idioma o menu avisa.
  const emOutroIdioma = locale !== DEFAULT_LOCALE
  const emSegundoPlano = Boolean(tutorialAtivo) || outroEmCena

  // Só atende pedidos de reação quando está à vista e livre.
  useEffect(() => (emSegundoPlano ? undefined : registrarMascote()), [emSegundoPlano])

  // Cada fala some sozinha depois do seu tempo.
  useEffect(() => {
    if (!reacao) return undefined
    const timer = window.setTimeout(() => encerrarReacao(reacao.id), reacao.duracao)
    return () => window.clearTimeout(timer)
  }, [reacao])

  let fala = null
  if (!emSegundoPlano) {
    if (despedida) fala = { id: 'despedida', estado: 'parado', mensagem: DESPEDIDA, lang: 'pt-BR' }
    else if (reacao) fala = reacao
    else if (demorando) {
      fala = {
        id: salvando ? 'salvando' : 'buscando',
        estado: 'carregando',
        mensagem: t(salvando ? 'mascot.saving' : 'mascot.loading'),
        lang: locale,
      }
    }
  }

  // Fala em `falando` aparece letra a letra, com a boca mexendo até terminar.
  const { letras, digitando } = useDigitacao(fala?.mensagem ?? '', {
    ativo: fala?.estado === 'falando',
    chave: fala?.id,
  })

  let estado = 'parado'
  if (fala) estado = fala.estado === 'falando' && !digitando ? (fala.estadoFinal ?? 'parado') : fala.estado
  else if (ocioso) estado = 'dormindo'

  function alternarMenu(valor) {
    setAberto(valor)
    // O menu abre por cima do balão; a fala já cumpriu o papel.
    if (valor) encerrarReacao()
  }

  function comecar(id) {
    setAberto(false)
    iniciar(id, { gatilho: gatilhoRef.current })
  }

  return (
    <div className="fab-bottom-end d-print-none">
      {/* Região viva sempre presente: o leitor de tela anuncia cada fala nova
          (a `key` recria o parágrafo, então a mesma frase repetida também é
          lida). O texto inteiro vai escondido para ele desde o início; a parte
          que aparece letra a letra fica fora da leitura. */}
      <div className="tutorial-fala-area" role="status" aria-live="polite">
        {fala ? (
          <p key={fala.id} className="msc-balao tutorial-fala" lang={fala.lang}>
            <span className="visually-hidden">{fala.mensagem}</span>
            <span aria-hidden="true">
              {fala.mensagem.slice(0, letras)}
              <span className="tutorial-fala-resto">{fala.mensagem.slice(letras)}</span>
            </span>
          </p>
        ) : null}
      </div>

      <Popover open={aberto} onOpenChange={alternarMenu}>
        <PopoverTrigger asChild>
          <button
            ref={gatilhoRef}
            type="button"
            className={cn('tutorial-fab', emSegundoPlano && 'tutorial-fab-icone')}
            aria-label={t('tutorial.open')}
            data-tour="ajuda"
          >
            {emSegundoPlano ? (
              <CircleHelp className="icon-xl" aria-hidden="true" />
            ) : (
              <span className="tutorial-fab-mascote" aria-hidden="true">
                <Mascote
                  estado={estado}
                  tamanho={72}
                  mostrarBalao={false}
                  mostrar404={false}
                  roupa={roupa}
                />
              </span>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent side="top" align="end" aria-label={t('tutorial.title')} className="w-fx-64 p-3">
          <div className="space-y-2">
            <div>
              <h2 className="fs-7 fw-semibold">{t('tutorial.title')}</h2>
              <p className="text-body-secondary fs-8">{t('tutorial.description')}</p>
            </div>

            {tutoriais.length ? (
              <ul className="space-y-2">
                {tutoriais.map((tutorial) => {
                  const concluido = jaConcluiu(tutorial.id)
                  return (
                    <li key={tutorial.id}>
                      <button
                        type="button"
                        onClick={() => comecar(tutorial.id)}
                        className="border d-flex w-100 align-items-center gap-2 rounded-2 px-2 py-2 text-start"
                      >
                        <span className="min-w-0 flex-grow-1">
                          <span className="d-block fs-7 fw-medium" lang="pt-BR">
                            {tutorial.titulo}
                          </span>
                          {emOutroIdioma ? (
                            <span className="text-body-secondary d-block fs-8">
                              {t('tutorial.inPortuguese')}
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={cn(
                            'flex-shrink-0 rounded-pill px-2 py-1 fs-8 fw-semibold',
                            concluido ? 'bg-body-secondary text-body-secondary' : 'bg-primary text-white',
                          )}
                        >
                          {concluido ? t('tutorial.again') : t('tutorial.start')}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-body-secondary fs-8">{t('tutorial.empty')}</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
