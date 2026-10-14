/**
 * Lista de tutoriais. Um tutorial novo precisa ser importado e incluído aqui —
 * ver `README.md` nesta pasta.
 *
 * A ordem é a do menu de ajuda.
 */
import { AREA, ESTADOS_MASCOTE } from '@/lib/tutoriais'
import boasVindas from './boas-vindas'
import explorar from './explorar'
import iniciativa from './iniciativa'
import lerNoticia from './ler-noticia'
import painelBoasVindas from './painel-boas-vindas'
import cadastrarIniciativa from './cadastrar-iniciativa'
import revisarConteudo from './revisar-conteudo'
import escreverNoticia from './escrever-noticia'

export const TUTORIAIS = [
  boasVindas,
  explorar,
  iniciativa,
  lerNoticia,
  painelBoasVindas,
  cadastrarIniciativa,
  revisarConteudo,
  escreverNoticia,
]

export function tutorialPorId(id) {
  return TUTORIAIS.find((tutorial) => tutorial.id === id)
}

const POSICOES = /^(auto|top|bottom|left|right)(-start|-end)?$/

/*
 * Conferência só em desenvolvimento: um erro de digitação num arquivo de
 * tutorial aparece no console de quem está editando, e não como um tour que
 * simplesmente se comporta estranho.
 */
if (import.meta.env.DEV) {
  const ids = new Set()
  for (const tutorial of TUTORIAIS) {
    const onde = `[tutoriais] ${tutorial.id ?? '(sem id)'}`
    if (!tutorial.id || ids.has(tutorial.id)) console.warn(`${onde}: id ausente ou repetido`)
    ids.add(tutorial.id)
    if (!Number.isInteger(tutorial.versao)) console.warn(`${onde}: "versao" precisa ser um número inteiro`)
    if (!Object.values(AREA).includes(tutorial.area)) console.warn(`${onde}: "area" deve ser "publico" ou "painel"`)
    if (!tutorial.rota) console.warn(`${onde}: falta a "rota"`)
    if (!tutorial.passos?.length) console.warn(`${onde}: nenhum passo`)
    tutorial.passos?.forEach((passo, indice) => {
      const de = `${onde} › passo ${passo.id ?? indice + 1}`
      if (!passo.texto) console.warn(`${de}: falta o "texto"`)
      if (passo.posicao && !POSICOES.test(passo.posicao)) console.warn(`${de}: posição "${passo.posicao}" inválida`)
      if (passo.mascote && !ESTADOS_MASCOTE.includes(passo.mascote)) console.warn(`${de}: estado do mascote "${passo.mascote}" inválido`)
      if (passo.opcional && indice === 0) console.warn(`${de}: o primeiro passo não pode ser opcional`)
    })
  }
}
