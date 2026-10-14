import Mascote from '@/components/mascote/Mascote'
import { useMascoteEmCena, useRoupaDoMascote } from '@/hooks/use-mascote'

/**
 * Tela de "não encontrado" (404), com a animação do mascote: ele vira o 0 do
 * "404", procurando a borboleta que o distraiu.
 *
 * É a mesma tela para tudo o que não existe — endereço desconhecido,
 * iniciativa, notícia, categoria ou autor que saíram do ar, e registros do
 * painel —; cada lugar escolhe o título, a descrição e as ações (`children`).
 *
 * Enquanto ela está na tela, o mascote do canto vira ícone: o protagonista é
 * este. A roupa é a da sessão — de astronauta, se foi o caso nesta entrada.
 */
export function NaoEncontrado({ title, description, mensagem, children }) {
  useMascoteEmCena()
  const roupa = useRoupaDoMascote()

  return (
    <div className="container nao-encontrado d-flex flex-column align-items-center justify-content-center py-5 text-center">
      <Mascote estado="naoEncontrado" tamanho={190} mensagem={mensagem} roupa={roupa} />
      <h1 className="fw-bold mt-4 fs-3">{title}</h1>
      {description ? <p className="text-body-secondary mt-2 mw-md text-pretty">{description}</p> : null}
      {children ? <div className="mt-5 d-flex flex-column gap-2 flex-sm-row">{children}</div> : null}
    </div>
  )
}
