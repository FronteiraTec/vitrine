import { useId, useState } from 'react'
import { ExternalLink, GripVertical, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/admin/PageHeader'
import { ImageUploader } from '@/components/admin/ImageUploader'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Field, Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/checkbox'
import { ColorInput } from '@/components/ui/color-input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { useSiteSettingsQuery, useUpdateSiteSettings } from '@/hooks/use-queries'
import { DEFAULT_NAV, toFormValues } from '@/lib/site-settings'
import { BUCKETS, LINK_TYPES } from '@/lib/constants'
import { cn } from '@/lib/utils'

/* --------------------------------- peças ---------------------------------- */

/** Grade das abas: coluna única até `lg`, duas colunas em telas largas. */
const tabGrid = 'grid items-start gap-6 pt-6 xl:grid-cols-2'

/**
 * `wide` marca a seção que ocupa a linha inteira do grid. Os editores de lista
 * têm altura variável e campos lado a lado — espremidos em meia largura, cada
 * item viraria uma coluna estreita e alta.
 */
function Section({ title, description, wide = false, children }) {
  return (
    <section
      className={cn(
        'border-border bg-card h-fit space-y-6 rounded-lg border p-5 sm:p-6',
        wide && 'xl:col-span-2',
      )}
    >
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

function Toggle({ label, description, checked, onChange }) {
  const id = useId()
  const descriptionId = description ? `${id}-hint` : undefined

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        {description ? (
          <p id={descriptionId} className="text-muted-foreground text-xs">
            {description}
          </p>
        ) : null}
      </div>
      <Switch
        id={id}
        aria-describedby={descriptionId}
        checked={checked}
        onCheckedChange={onChange}
        className="mt-0.5 shrink-0"
      />
    </div>
  )
}

/**
 * Editor de lista genérico — navegação, apoiadores e redes têm a mesma
 * mecânica (adicionar, remover, reordenar) e só diferem nos campos de cada
 * linha, passados por `renderRow`.
 */
function ListEditor({ items, onChange, renderRow, onAdd, addLabel, empty, max = 12 }) {
  function update(index, patch) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function remove(index) {
    onChange(items.filter((_, i) => i !== index))
  }

  function move(index, delta) {
    const target = index + delta
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {items.length ? (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li
              key={index}
              className="border-border bg-muted/30 relative rounded-lg border p-4 pr-12"
            >
              {/* O índice compõe os `id` dos campos: derivá-los do conteúdo
                  produziria rótulos apontando para o campo errado assim que
                  duas linhas coincidissem. */}
              {renderRow(item, (patch) => update(index, patch), index)}

              <div className="absolute top-3 right-3 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-muted-foreground hover:bg-destructive hover:text-destructive-foreground rounded-md p-1.5 transition-colors"
                  aria-label={`Remover item ${index + 1}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
                <div className="text-muted-foreground/50 flex justify-center">
                  <GripVertical className="size-3.5" aria-hidden="true" />
                </div>
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-1.5 text-xs transition-colors disabled:opacity-30"
                  aria-label={`Mover item ${index + 1} para cima`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-1.5 text-xs transition-colors disabled:opacity-30"
                  aria-label={`Mover item ${index + 1} para baixo`}
                >
                  ↓
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-xs text-pretty">
          {empty}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, onAdd()])}
        disabled={items.length >= max}
      >
        <Plus aria-hidden="true" />
        {addLabel}
      </Button>
    </div>
  )
}

/* --------------------------------- abas ----------------------------------- */

function BrandTab({ values, set }) {
  return (
    <Section
      title="Marca"
      description="Símbolo e nome exibidos no cabeçalho, no rodapé e no topo do painel."
      wide
    >
      <div className="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
        <ImageUploader
          value={values.logo_url}
          onChange={(url) => set('logo_url', url)}
          bucket={BUCKETS.SITE}
          folder="marca"
          label="Símbolo"
          hint="Quadrado, fundo transparente. PNG ou SVG. Sem envio, usa o logotipo padrão."
          ratio="aspect-square"
          maxBytes={2 * 1024 * 1024}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            id="brand-name"
            label="Nome"
            hint="Aparece ao lado do símbolo, em destaque."
            required
          >
            {(props) => (
              <Input
                {...props}
                value={values.brand_name}
                onChange={(event) => set('brand_name', event.target.value)}
                maxLength={40}
                required
              />
            )}
          </Field>

          <Field
            id="brand-tagline"
            label="Legenda"
            hint="Linha menor sob o nome. Deixe em branco para ocultar."
          >
            {(props) => (
              <Input
                {...props}
                value={values.brand_tagline ?? ''}
                onChange={(event) => set('brand_tagline', event.target.value)}
                maxLength={40}
              />
            )}
          </Field>
        </div>
      </div>
    </Section>
  )
}

function HeaderTab({ values, set }) {
  return (
    <>
      <Section title="Comportamento" description="Como a barra do topo se apresenta na vitrine.">
        <Toggle
          label="Fixar no topo"
          description="A barra acompanha a rolagem da página."
          checked={values.header_sticky}
          onChange={(checked) => set('header_sticky', checked)}
        />
        <Toggle
          label="Botão de busca"
          description="Atalho com a lupa, ao lado do menu."
          checked={values.header_show_search}
          onChange={(checked) => set('header_show_search', checked)}
        />
      </Section>

      <Section
        title="Cores do cabeçalho"
        description="Deixe em branco para seguir o tema. Confira o contraste entre fundo e texto."
      >
        <div className="grid gap-6 sm:grid-cols-3">
          <ColorInput
            label="Fundo"
            value={values.header_bg}
            onChange={(color) => set('header_bg', color)}
            fallback="#fbfdf8"
          />
          <ColorInput
            label="Texto"
            value={values.header_fg}
            onChange={(color) => set('header_fg', color)}
            fallback="#1b2f24"
          />
          <ColorInput
            label="Borda inferior"
            value={values.header_border}
            onChange={(color) => set('header_border', color)}
            fallback="#e2e9dd"
          />
        </div>
      </Section>

      <Section
        title="Menu principal"
        description="Os mesmos links aparecem no cabeçalho e na coluna “Navegar” do rodapé."
        wide
      >
        <ListEditor
          items={values.header_nav}
          onChange={(next) => set('header_nav', next)}
          onAdd={() => ({ label: '', to: '/' })}
          addLabel="Adicionar link"
          empty={`Sem links personalizados — usando o menu padrão: ${DEFAULT_NAV.map((l) => l.label).join(', ')}.`}
          renderRow={(item, update, index) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id={`nav-label-${index}`} label="Rótulo">
                {(props) => (
                  <Input
                    {...props}
                    value={item.label ?? ''}
                    onChange={(event) => update({ label: event.target.value })}
                    placeholder="Início"
                  />
                )}
              </Field>
              <Field id={`nav-to-${index}`} label="Caminho">
                {(props) => (
                  <Input
                    {...props}
                    value={item.to ?? ''}
                    onChange={(event) => update({ to: event.target.value })}
                    placeholder="/buscar"
                    className="font-mono text-sm"
                  />
                )}
              </Field>
            </div>
          )}
        />
      </Section>
    </>
  )
}

function FooterTab({ values, set }) {
  return (
    <>
      <Section title="Texto" description="Conteúdo da primeira coluna e da linha final." wide>
        <div className="grid gap-6 lg:grid-cols-2">
          <Field id="footer-description" label="Descrição" hint="Parágrafo curto sob a marca.">
            {(props) => (
              <Textarea
                {...props}
                rows={5}
                value={values.footer_description ?? ''}
                onChange={(event) => set('footer_description', event.target.value)}
                maxLength={400}
              />
            )}
          </Field>

          <div className="space-y-6">
            <Field
              id="footer-copyright"
              label="Direitos autorais"
              hint="O ano corrente é inserido automaticamente antes deste texto."
            >
              {(props) => (
                <Input
                  {...props}
                  value={values.footer_copyright ?? ''}
                  onChange={(event) => set('footer_copyright', event.target.value)}
                  maxLength={120}
                />
              )}
            </Field>

            <Field id="footer-note" label="Observação" hint="Texto à direita, na última linha.">
              {(props) => (
                <Input
                  {...props}
                  value={values.footer_note ?? ''}
                  onChange={(event) => set('footer_note', event.target.value)}
                  maxLength={120}
                />
              )}
            </Field>

            <Toggle
              label="Coluna de categorias"
              description="Lista as seis primeiras categorias do catálogo."
              checked={values.footer_show_categories}
              onChange={(checked) => set('footer_show_categories', checked)}
            />
          </div>
        </div>
      </Section>

      <Section title="Contato" description="Cada campo em branco é omitido do rodapé.">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="footer-email" label="E-mail">
            {(props) => (
              <Input
                {...props}
                type="email"
                value={values.footer_contact_email ?? ''}
                onChange={(event) => set('footer_contact_email', event.target.value)}
                placeholder="contato@instituicao.edu.br"
              />
            )}
          </Field>
          <Field id="footer-phone" label="Telefone">
            {(props) => (
              <Input
                {...props}
                value={values.footer_contact_phone ?? ''}
                onChange={(event) => set('footer_contact_phone', event.target.value)}
                placeholder="(49) 0000-0000"
              />
            )}
          </Field>
        </div>
        <Field id="footer-address" label="Endereço">
          {(props) => (
            <Input
              {...props}
              value={values.footer_address ?? ''}
              onChange={(event) => set('footer_address', event.target.value)}
              placeholder="Rua Exemplo, 000 — Cidade/UF"
            />
          )}
        </Field>
      </Section>

      <Section
        title="Cores do rodapé"
        description="Deixe em branco para seguir o tema (fundo na cor principal)."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <ColorInput
            label="Fundo"
            value={values.footer_bg}
            onChange={(color) => set('footer_bg', color)}
            fallback="#145c33"
          />
          <ColorInput
            label="Texto"
            value={values.footer_fg}
            onChange={(color) => set('footer_fg', color)}
            fallback="#fbfdf8"
          />
        </div>
      </Section>

      <Section
        title="Apoiadores"
        description="Logotipos exibidos sobre uma faixa clara, para funcionarem em qualquer cor de rodapé."
        wide
      >
        <Field id="partners-label" label="Rótulo da faixa">
          {(props) => (
            <Input
              {...props}
              value={values.footer_partners_label ?? ''}
              onChange={(event) => set('footer_partners_label', event.target.value)}
              placeholder="Uma iniciativa da"
              maxLength={60}
            />
          )}
        </Field>

        <ListEditor
          items={values.footer_partners}
          onChange={(next) => set('footer_partners', next)}
          onAdd={() => ({ name: '', logo_url: '', url: '' })}
          addLabel="Adicionar apoiador"
          max={6}
          empty="Sem apoiadores personalizados — usando os logotipos padrão da UFFS e da INNE."
          renderRow={(item, update, index) => (
            <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
              <ImageUploader
                value={item.logo_url || null}
                onChange={(url) => update({ logo_url: url ?? '' })}
                bucket={BUCKETS.SITE}
                folder="apoiadores"
                label="Logotipo"
                ratio="aspect-[16/10]"
                maxBytes={2 * 1024 * 1024}
              />
              <div className="space-y-4">
                <Field
                  id={`partner-name-${index}`}
                  label="Nome"
                  hint="Usado como texto alternativo da imagem."
                >
                  {(props) => (
                    <Input
                      {...props}
                      value={item.name ?? ''}
                      onChange={(event) => update({ name: event.target.value })}
                      placeholder="Nome da instituição"
                    />
                  )}
                </Field>
                <Field id={`partner-url-${index}`} label="Site (opcional)">
                  {(props) => (
                    <Input
                      {...props}
                      value={item.url ?? ''}
                      onChange={(event) => update({ url: event.target.value })}
                      placeholder="https://"
                    />
                  )}
                </Field>
              </div>
            </div>
          )}
        />
      </Section>

      <Section
        title="Redes sociais"
        description="Ícones ao final da primeira coluna do rodapé."
        wide
      >
        <ListEditor
          items={values.footer_social}
          onChange={(next) => set('footer_social', next)}
          onAdd={() => ({ type: 'instagram', url: '' })}
          addLabel="Adicionar rede"
          max={8}
          empty="Nenhuma rede social cadastrada."
          renderRow={(item, update, index) => (
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <div className="space-y-2">
                <Label id={`social-type-${index}`}>Rede</Label>
                <Select value={item.type} onValueChange={(type) => update({ type })}>
                  <SelectTrigger aria-labelledby={`social-type-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LINK_TYPES).map(([value, meta]) => (
                      <SelectItem key={value} value={value}>
                        {meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field id={`social-url-${index}`} label="Endereço">
                {(props) => (
                  <Input
                    {...props}
                    value={item.url ?? ''}
                    onChange={(event) => update({ url: event.target.value })}
                    placeholder="https://"
                  />
                )}
              </Field>
            </div>
          )}
        />
      </Section>
    </>
  )
}

function ColorsTab({ values, set }) {
  return (
    <Section
      title="Cores globais"
      description="Alcançam a vitrine inteira — botões, links e destaques. O painel administrativo mantém o tema padrão."
      wide
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <ColorInput
            label="Cor principal"
            hint="Botões, fundo do rodapé e superfícies de destaque."
            value={values.primary_color}
            onChange={(color) => set('primary_color', color)}
            fallback="#145c33"
          />
          <ColorInput
            label="Cor de acento"
            hint="Links, anel de foco e detalhes."
            value={values.brand_color}
            onChange={(color) => set('brand_color', color)}
            fallback="#3d8b4f"
          />
        </div>

        <aside className="bg-muted/40 border-border space-y-3 rounded-lg border p-4">
          <h3 className="text-xs font-semibold tracking-wide uppercase">Onde cada cor aparece</h3>
          <dl className="text-muted-foreground space-y-2 text-xs">
            <div>
              <dt className="text-foreground font-medium">Cor principal</dt>
              <dd>Botões preenchidos, fundo do rodapé, cabeçalho do painel e estados ativos.</dd>
            </div>
            <div>
              <dt className="text-foreground font-medium">Cor de acento</dt>
              <dd>Links de texto, anel de foco do teclado e detalhes de destaque.</dd>
            </div>
          </dl>
          <p className="border-border text-muted-foreground border-t pt-3 text-xs text-pretty">
            A paleta de status do dashboard não é afetada: as cores dela foram validadas para
            separação sob daltonismo e mudá-las quebraria essa garantia.
          </p>
        </aside>
      </div>
    </Section>
  )
}

/* --------------------------------- página --------------------------------- */

/**
 * Formulário montado com `key` a partir da linha carregada, então inicializa o
 * estado direto das props — mesmo padrão de `SettingsPage`, sem efeito de
 * sincronização.
 *
 * Exportado para o `npm run smoke`: a página só chega aqui depois que a
 * consulta responde, então montá-la pelo caminho normal renderizaria apenas o
 * esqueleto e deixaria a maior árvore desta tela sem cobertura.
 */
export function AppearanceForm({ settings }) {
  const [values, setValues] = useState(() => toFormValues(settings))
  const update = useUpdateSiteSettings()

  const initial = JSON.stringify(toFormValues(settings))
  const dirty = JSON.stringify(values) !== initial

  function set(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!values.brand_name.trim()) {
      toast.error('Informe o nome da marca.')
      return
    }

    const incompleteNav = values.header_nav.some((item) => !item.label?.trim() || !item.to?.trim())
    if (incompleteNav) {
      toast.error('Todo link do menu precisa de rótulo e caminho.')
      return
    }

    const partnerWithoutLogo = values.footer_partners.some((item) => !item.logo_url)
    if (partnerWithoutLogo) {
      toast.error('Todo apoiador precisa de um logotipo.')
      return
    }

    try {
      await update.mutateAsync(values)
      toast.success('Aparência atualizada.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        title="Aparência"
        description="Marca, cores e conteúdo do cabeçalho e do rodapé da vitrine pública."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/" target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden="true" />
                Ver vitrine
              </Link>
            </Button>
            <Button type="submit" loading={update.isPending} disabled={!dirty}>
              Salvar alterações
            </Button>
          </>
        }
      />

      <Tabs defaultValue="marca">
        <TabsList>
          <TabsTrigger value="marca">Marca</TabsTrigger>
          <TabsTrigger value="cabecalho">Cabeçalho</TabsTrigger>
          <TabsTrigger value="rodape">Rodapé</TabsTrigger>
          <TabsTrigger value="cores">Cores</TabsTrigger>
        </TabsList>

        {/*
         * Duas colunas a partir de `xl`. As seções são independentes entre si,
         * então cada uma fica com a própria altura (`h-fit`) em vez de esticar
         * até a vizinha mais alta da linha.
         */}
        <TabsContent value="marca" className={tabGrid}>
          <BrandTab values={values} set={set} />
        </TabsContent>
        <TabsContent value="cabecalho" className={tabGrid}>
          <HeaderTab values={values} set={set} />
        </TabsContent>
        <TabsContent value="rodape" className={tabGrid}>
          <FooterTab values={values} set={set} />
        </TabsContent>
        <TabsContent value="cores" className={tabGrid}>
          <ColorsTab values={values} set={set} />
        </TabsContent>
      </Tabs>
    </form>
  )
}

export function AppearancePage() {
  const { data, isLoading, error } = useSiteSettingsQuery()

  if (isLoading) {
    return (
      <>
        <PageHeader title="Aparência" />
        <div className={tabGrid}>
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="Aparência" />
        <p className="text-destructive text-sm">{error.message}</p>
      </>
    )
  }

  /*
   * Sem linha, a migration 0005 ainda não rodou. Um formulário que salva em
   * uma tabela inexistente só produziria erro no envio — melhor dizer o que
   * falta antes de o administrador preencher tudo.
   */
  if (!data) {
    return (
      <>
        <PageHeader title="Aparência" />
        <div className="border-border bg-card max-w-3xl space-y-2 rounded-lg border p-6">
          <h2 className="text-sm font-semibold">Configuração indisponível</h2>
          <p className="text-muted-foreground text-sm text-pretty">
            A tabela <code className="text-xs">site_settings</code> ainda não existe neste projeto
            Supabase. Execute a migration{' '}
            <code className="text-xs">20250101000005_site_settings.sql</code> e recarregue esta
            página. Enquanto isso, a vitrine usa a identidade padrão.
          </p>
        </div>
      </>
    )
  }

  return <AppearanceForm key={data.id} settings={data} />
}
