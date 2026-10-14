/**
 * Cadastro de uma iniciativa. Começa na lista e muda de página no terceiro
 * passo — é o exemplo de passo em outra rota.
 */
export default {
  id: 'cadastrar-iniciativa',
  versao: 1,
  titulo: 'Como cadastrar uma iniciativa',
  area: 'painel',
  rota: '/admin/iniciativas',
  oferecerEm: ['/admin'],
  passos: [
    {
      id: 'oi',
      texto: 'Vamos cadastrar uma iniciativa juntos? Eu vou na frente.',
      mascote: 'ajuda',
    },
    {
      id: 'botao',
      alvo: '[data-tour="nova-iniciativa"]',
      posicao: 'bottom',
      texto: 'Tudo começa no botão Nova iniciativa.',
      mascote: 'falando',
    },
    {
      id: 'abas',
      rota: '/admin/iniciativas/nova',
      alvo: '[data-tour="iniciativa-abas"]',
      posicao: 'bottom',
      texto:
        'O formulário é dividido em abas. Para criar, só as informações básicas são obrigatórias.',
      mascote: 'falando',
    },
    {
      id: 'nome',
      alvo: '[data-tour="iniciativa-nome"]',
      posicao: 'bottom',
      texto:
        'Campos com asterisco são obrigatórios. Se faltar algum, a aba fica marcada em vermelho.',
      mascote: 'falando',
    },
    {
      id: 'salvar',
      alvo: '[data-tour="iniciativa-salvar"]',
      posicao: 'bottom',
      texto:
        'Ao clicar em Criar iniciativa, ela fica salva como rascunho e ainda não aparece na vitrine.',
      mascote: 'falando',
    },
    {
      id: 'fim',
      texto:
        'Isso aí! Depois de salvar, envie para revisão na aba Publicação; quando aprovarem, ela entra na vitrine.',
      mascote: 'sucesso',
    },
  ],
}
