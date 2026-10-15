import { useEffect, useState } from 'react'
import Mascote, { REACOES } from '@/components/mascote/Mascote'
import { useLocale } from '@/contexts/LocaleContext'
import { useMascoteEmCena, useMenosMovimento, useRoupaDoMascote } from '@/hooks/use-mascote'

/**
 * Tela de "não encontrado" (404), com a animação do mascote: ele vira o 0 do
 * "404", procurando a borboleta que o distraiu.
 *
 * É a mesma tela para tudo o que não existe — endereço desconhecido,
 * iniciativa, notícia, categoria ou autor que saíram do ar, e registros do
 * painel —; cada lugar escolhe o título, a descrição e as ações (`children`).
 *
 * Enquanto ela está na tela, o mascote do canto vira ícone: o protagonista é
 * este. A roupa é a da sessão, a mesma dos outros mascotes nesta entrada.
 *
 * Aqui o mascote é interativo: segue o cursor com os olhos, ri com um clique
 * (ou Enter), fica tonto com cinco cliques seguidos e, se continuar sendo
 * cutucado, fica irritado e sacode a tela — menos com movimento reduzido. Ele
 * também gosta de carinho: o cursor indo e voltando em cima dele.
 *
 * O easter egg do astronauta (a viagem à Lua) fica desligado nesta tela: a
 * versão atual do componente não monta a viagem no layout de 404, e o
 * mascote só sumiria por seis segundos. Corrigido no componente, é só tirar o
 * `easterEgg={false}`, trocando por `easterEgg={!menosMovimento}`.
 *
 * O balão é desta tela, e não do componente: as falas das reações dele são só
 * em português, e aqui vêm do dicionário da interface. O nome acessível do
 * mascote ("Mascote. Clique para interagir.") também é fixo em português, por
 * isso ele vai marcado com `lang="pt-BR"`.
 */
export function NaoEncontrado({ title, description, mensagem, children }) {
  useMascoteEmCena()
  const roupa = useRoupaDoMascote()
  const menosMovimento = useMenosMovimento()
  const { t } = useLocale()
  const [reacao, setReacao] = useState(null)

  // A fala dura o mesmo que a reação no componente. A que encadeia outra (o
  // foguete volta "calmo") não se encerra: a próxima reação a substitui.
  useEffect(() => {
    const definicao = reacao && REACOES[reacao.tipo]
    if (!definicao || definicao.proxima) return undefined
    const timer = window.setTimeout(() => setReacao(null), definicao.duracao)
    return () => window.clearTimeout(timer)
  }, [reacao])

  function aoInteragir(tipo) {
    setReacao((anterior) => ({ id: (anterior?.id ?? 0) + 1, tipo }))
  }

  // Reação que ainda não está no dicionário (de uma versão nova do mascote)
  // sai com a fala original dele, marcada como português.
  let fala = { texto: mensagem ?? t('notFound.mascot') }
  if (reacao) {
    const chave = `mascot.reactions.${reacao.tipo}`
    const traduzida = t(chave)
    fala = traduzida === chave ? { texto: REACOES[reacao.tipo]?.mensagem, lang: 'pt-BR' } : { texto: traduzida }
  }

  return (
    <div className="container nao-encontrado d-flex flex-column align-items-center justify-content-center py-5 text-center">
      {/* Região viva sempre presente: cada fala nova é anunciada, e a `key`
          recria o balão para a mesma frase repetida também ser lida. */}
      <div role="status" className="mb-3">
        {fala.texto ? (
          <div key={reacao?.id ?? 'mensagem'} className="msc-balao" lang={fala.lang}>
            <p className="msc-balao-texto">{fala.texto}</p>
          </div>
        ) : null}
      </div>
      <div lang="pt-BR">
        <Mascote
          estado="naoEncontrado"
          tamanho={190}
          mostrarBalao={false}
          roupa={roupa}
          interativo
          tremerTela={!menosMovimento}
          easterEgg={false}
          onInteracao={aoInteragir}
        />
      </div>
      <h1 className="fw-bold mt-4 fs-3">{title}</h1>
      {description ? <p className="text-body-secondary mt-2 mw-md text-pretty">{description}</p> : null}
      {children ? <div className="mt-5 d-flex flex-column gap-2 flex-sm-row">{children}</div> : null}
    </div>
  )
}
