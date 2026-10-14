# Tutoriais guiados

Cada arquivo desta pasta é um tutorial: uma sequência de balões que o mascote
apresenta, apontando para partes da tela. Eles aparecem no **botão de ajuda**
(o mascote no canto inferior direito), na vitrine e no painel.

Para mudar um texto, basta editar o arquivo do tutorial. Nada mais precisa ser
alterado.

## Criar um tutorial

1. Copie um arquivo parecido (por exemplo `explorar.js`) com um nome novo.
2. Troque `id`, `titulo`, `rota` e os passos.
3. Importe o arquivo em `index.js` e acrescente-o à lista `TUTORIAIS`. A ordem
   da lista é a ordem do menu de ajuda.
4. Marque na tela os elementos que os passos apontam (veja
   [Marcar um elemento](#marcar-um-elemento-com-data-tour)).

```js
export default {
  id: 'explorar',                 // único; vai na chave salva no navegador
  versao: 1,                      // aumente para o tutorial reaparecer para todos
  titulo: 'Como buscar iniciativas',
  area: 'publico',                // 'publico' (vitrine) ou 'painel' (/admin)
  rota: '/buscar',                // onde o tutorial acontece
  passos: [
    {
      id: 'oi',
      texto: 'Vou te mostrar como encontrar iniciativas na vitrine.',
      mascote: 'ajuda',
    },
    {
      id: 'busca',
      alvo: '[data-tour="busca"]',
      posicao: 'bottom',
      texto: 'Digite o que procura. A lista se atualiza enquanto você escreve.',
      mascote: 'falando',
    },
  ],
}
```

### Campos do tutorial

| Campo | Obrigatório | Para que serve |
|---|---|---|
| `id` | sim | Nome único, em letras minúsculas e com hífen. |
| `versao` | sim | Número inteiro. Ao aumentar, quem já concluiu ou pulou vê o tutorial de novo. |
| `titulo` | sim | Aparece no menu de ajuda e no topo do balão. |
| `area` | sim | `'publico'` para a vitrine, `'painel'` para o painel administrativo. |
| `rota` | sim | Endereço da tela, no formato do React Router: `'/buscar'`, `'/iniciativa/:slug'`. Aceita uma lista: `['/noticia/:slug', '/en/news/:slug']`. |
| `oferecerEm` | não | Outras telas em que o tutorial aparece no menu. `'/admin/*'` = todo o painel. |
| `abrirSozinhoEm` | não | Telas em que ele abre sozinho para quem nunca o viu. Só os de boas-vindas usam. |
| `permissao` | não | `'review'` (revisores e administradores) ou `'admin'` (só administradores). |

### Campos do passo

| Campo | Obrigatório | Para que serve |
|---|---|---|
| `id` | sim | Nome do passo, único dentro do tutorial. |
| `texto` | sim | O que o mascote diz. **No máximo duas frases**, em linguagem simples. |
| `alvo` | não | O elemento apontado, sempre pelo `data-tour`: `'[data-tour="busca"]'`. Sem alvo, o balão aparece no centro da tela. |
| `posicao` | não | Lado do alvo onde fica o balão: `'top'`, `'bottom'`, `'left'` ou `'right'` (também `'top-start'`, `'bottom-end'` etc.). Padrão: `'bottom'`. Se não couber, o balão troca de lado sozinho. |
| `mascote` | não | Estado do mascote depois que o texto termina de aparecer. Padrão: `'ajuda'`. |
| `rota` | não | Só quando o passo acontece em **outra tela**. O tour navega até lá (com o mascote caminhando) e espera o alvo aparecer. Os passos seguintes continuam nessa tela. |
| `opcional` | não | `true` para partes que podem não existir: notícias que ainda não foram publicadas, fila vazia. Se o alvo não estiver na tela, o passo é pulado sem aviso. |

### O mascote em cada passo

- O **primeiro** passo é sempre `ajuda` (acenando), e o **último** é sempre
  `sucesso` (pulo com confete). Escreva o último texto como um parabéns.
- Enquanto o texto aparece, o mascote fica em `falando`. Depois vai para o
  estado do passo.
- Estados disponíveis: `parado`, `carregando`, `sucesso`, `faltando`,
  `naoEncontrado`, `erro`, `ajuda`, `falando`, `dormindo`, `caminhando`.

### Se o alvo não aparecer

Um passo **sem** `opcional` cujo alvo não está na tela não trava o tour. O
balão aparece no centro, com o mascote em `faltando` e um aviso genérico, e o
console do navegador mostra um `console.warn` (só em desenvolvimento) dizendo
qual alvo faltou.

## Marcar um elemento com `data-tour`

Os passos encontram os elementos pelo atributo `data-tour`, nunca por classe CSS:
classe muda quando o visual muda, e o tutorial quebraria em silêncio.

```jsx
<aside className="d-none d-lg-block" data-tour="filtros">
```

- Use nomes curtos, em minúsculas e com hífen, de preferência com o nome da tela
  na frente: `iniciativa-contato`, `admin-menu`.
- O mesmo nome pode marcar a versão de **desktop** e a de **celular** de um
  controle (o menu lateral e o botão de menu, por exemplo). O tour usa a que
  estiver visível.
- Componentes do projeto como `Button` e `Input` já repassam o atributo. Se um
  componente não repassar, acrescente `...props` a ele ou envolva o trecho num
  `<div data-tour="...">`.
- Prefira alvos menores que a tela, como um título de seção, um botão ou um
  campo. O seletor pode descer a partir do `data-tour`:
  `'[data-tour="resultados"] > :first-child'` aponta o primeiro cartão da lista.

## Testar

1. `npm run dev` e abra a tela do tutorial.
2. Clique no botão de ajuda e escolha o tutorial.
3. Confira o console: erros de digitação nos arquivos (campo faltando, estado do
   mascote inválido) aparecem lá como avisos `[tutoriais]`.

Para ver de novo um tutorial que abre sozinho, apague no navegador (DevTools →
Application → Local Storage) a chave `vitrine:tutorial:<id>:v<versao>`. No
painel, a chave termina com o id da pessoa. O tour em andamento fica no Session
Storage, em `vitrine:tutorial:andamento`.
