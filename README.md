# Vitrine

Catálogo público de iniciativas institucionais — projetos, laboratórios, grupos
de pesquisa, empresas juniores e programas de extensão — com área administrativa,
fluxo de revisão editorial, notícias em três idiomas e relatório de audiência.

A aplicação fica em [`vitrine/`](./vitrine) e roda inteira em containers
(PostgreSQL, API Node, Nginx com o React):

```bash
cd vitrine
cp .env.example .env        # senhas e domínio
docker compose up -d --build
```

Documentação completa:

- [`vitrine/README.md`](./vitrine/README.md) — instalação, deploy, arquitetura, audiência e migração do Supabase
- [`vitrine/db/README.md`](./vitrine/db/README.md) — banco, RLS e arquivos
