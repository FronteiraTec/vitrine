import Mascote from '@/components/mascote/Mascote'
import { useDigitacao, useRoupaDoMascote } from '@/hooks/use-mascote'

const TEXTO_AUSENTE = 'Não encontrei essa parte da tela agora. Vamos seguir para o próximo passo?'
const TEXTO_CAMINHANDO = 'Já estou indo! Só um instante.'

/**
 * O que aparece dentro do balão de cada passo: o mascote ao lado do texto e o
 * progresso. Renderizado por portal no container que o Shepherd recebe como
 * `text` (ver `motor.js`).
 *
 * O texto aparece letra a letra com o mascote em `falando`; quando termina, o
 * mascote vai para o estado do passo. Primeiro passo é sempre `ajuda` e o
 * último, `sucesso` — o resto vem da definição do tutorial. A roupa é a da
 * sessão, a mesma do mascote do canto.
 *
 * Para o leitor de tela, o texto inteiro está lá desde o primeiro instante (o
 * trecho invisível), e a parte que vai sendo digitada fica escondida dele: o
 * diálogo do Shepherd aponta para este conteúdo com `aria-describedby`.
 */
export function ConteudoPasso({ texto, mascote, indice, total, ausente, caminhando }) {
  const frase = caminhando ? TEXTO_CAMINHANDO : ausente ? TEXTO_AUSENTE : texto
  const { letras, digitando } = useDigitacao(frase, { ativo: !caminhando })
  const roupa = useRoupaDoMascote()

  const ultimo = indice === total - 1
  const estadoFinal = caminhando
    ? 'caminhando'
    : ausente
      ? 'faltando'
      : ultimo
        ? 'sucesso'
        : indice === 0
          ? 'ajuda'
          : (mascote ?? 'ajuda')

  return (
    <div className="tutorial-passo" lang="pt-BR">
      <div className="tutorial-passo-mascote" aria-hidden="true">
        <Mascote
          estado={digitando ? 'falando' : estadoFinal}
          tamanho={88}
          mostrarBalao={false}
          roupa={roupa}
        />
      </div>

      <div className="tutorial-passo-corpo">
        <p className="tutorial-passo-texto">
          <span className="visually-hidden">{frase}</span>
          <span aria-hidden="true">
            {frase.slice(0, letras)}
            <span className="tutorial-passo-resto">{frase.slice(letras)}</span>
          </span>
        </p>
        {caminhando ? null : (
          <p className="tutorial-passo-progresso">
            {indice + 1} de {total}
          </p>
        )}
      </div>
    </div>
  )
}
