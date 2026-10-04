/**
 * Aplica as cores personalizadas por cima do tema do Bootstrap.
 *
 * Escrever só `--bs-primary` NÃO bastaria, e isso é uma peculiaridade do
 * Bootstrap 5.3 que vale registrar: as variantes de botão são geradas pelo Sass
 * com valores LITERAIS em `--bs-btn-bg` e companhia — elas não referenciam
 * `--bs-primary` em tempo de execução. Sem as regras de `.btn-primary` abaixo,
 * o administrador trocaria a cor da marca e veria tudo mudar, menos os botões.
 *
 * O mesmo vale para `.text-primary`, `.bg-primary` e `.border-primary`, que o
 * gerador de utilitários resolve na compilação.
 *
 * Sai como `<style>` e não via `document.documentElement.style`: assim o valor
 * já vem no primeiro paint (sem piscar o verde padrão antes do personalizado) e
 * a renderização de servidor do `npm run smoke` não esbarra em `document`.
 *
 * Fica montado apenas na vitrine pública. O painel é ferramenta de trabalho, e
 * uma cor mal escolhida ali deixaria o próprio formulário de correção
 * ilegível — a marca aparece no painel só pelo logotipo.
 */

/** `#145c33` → `20, 92, 51`. O Bootstrap precisa do trio para compor alfa. */
function toRgb(hex) {
  const valor = hex.replace('#', '')
  const n = parseInt(valor, 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

/** Tom mais escuro para hover e estado ativo, derivado da própria cor. */
function darker(hex, quanto = 12) {
  return `color-mix(in oklab, ${hex} ${100 - quanto}%, black)`
}

export function SiteTheme({ settings }) {
  const blocos = []

  if (settings.primaryColor) {
    const cor = settings.primaryColor
    const escura = darker(cor)

    blocos.push(
      `:root{--bs-primary:${cor};--bs-primary-rgb:${toRgb(cor)};` +
        `--bs-link-color:${cor};--bs-link-color-rgb:${toRgb(cor)};--bs-link-hover-color:${escura};}`,
    )

    blocos.push(
      `.btn-primary{--bs-btn-bg:${cor};--bs-btn-border-color:${cor};` +
        `--bs-btn-hover-bg:${escura};--bs-btn-hover-border-color:${escura};` +
        `--bs-btn-active-bg:${escura};--bs-btn-active-border-color:${escura};` +
        `--bs-btn-disabled-bg:${cor};--bs-btn-disabled-border-color:${cor};}`,
    )

    blocos.push(
      `.btn-outline-primary{--bs-btn-color:${cor};--bs-btn-border-color:${cor};` +
        `--bs-btn-hover-bg:${cor};--bs-btn-hover-border-color:${cor};}`,
    )

    // `!important` porque os utilitários do Bootstrap também o usam: sem isso
    // a regra de fábrica venceria a personalização.
    blocos.push(`.text-primary{color:${cor}!important;}`)
    blocos.push(`.bg-primary{background-color:${cor}!important;}`)
    blocos.push(`.border-primary{border-color:${cor}!important;}`)
  }

  if (settings.brandColor) {
    // A cor de destaque governa o anel de foco, que é elemento de
    // acessibilidade — por isso vale como variável e não só como enfeite.
    blocos.push(`:root{--bs-focus-ring-color:${settings.brandColor};}`)
  }

  if (!blocos.length) return null

  return <style>{blocos.join('')}</style>
}
