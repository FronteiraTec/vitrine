/**
 * Aplica as cores personalizadas por cima dos tokens do design system.
 *
 * Escrever em `--color-primary` no `:root` alcança tudo de uma vez — inclusive
 * `bg-primary/20`, que o Tailwind v4 resolve com `color-mix` sobre a própria
 * variável, e os componentes em portal (menu móvel, diálogos), que ficam fora
 * da árvore do layout e não herdariam um estilo posto na `div` raiz.
 *
 * Sai como `<style>` e não via `document.documentElement.style`: assim o valor
 * já vem no primeiro paint (sem piscar o verde padrão antes do personalizado)
 * e a renderização de servidor do `npm run smoke` não esbarra em `document`.
 *
 * Fica montado apenas na vitrine pública. O painel é ferramenta de trabalho, e
 * uma cor mal escolhida ali deixaria o próprio formulário de correção
 * ilegível — a marca aparece no painel só pelo logotipo.
 */
export function SiteTheme({ settings }) {
  const rules = []

  if (settings.primaryColor) {
    rules.push(`--color-primary: ${settings.primaryColor};`)
    // O tema define um tom mais escuro para hover; derivar mantém a relação
    // entre os dois sem pedir uma segunda cor ao administrador.
    rules.push(
      `--color-primary-hover: color-mix(in oklab, ${settings.primaryColor} 86%, black);`,
    )
  }

  if (settings.brandColor) {
    rules.push(`--color-brand: ${settings.brandColor};`)
    rules.push(`--color-ring: ${settings.brandColor};`)
  }

  if (!rules.length) return null

  return <style>{`:root{${rules.join('')}}`}</style>
}
