/**
 * Montagem de INSERT e UPDATE a partir de um objeto JÁ FILTRADO.
 *
 * Os nomes de coluna nunca vêm do cliente: cada rota passa o resultado de
 * `pick()` sobre uma lista fixa. Mesmo assim, todo identificador é escapado.
 */
import pg from 'pg'

const ident = (name) => pg.escapeIdentifier(name)

function placeholders(row, { json = [], startAt = 1 }) {
  const keys = Object.keys(row)
  const values = []
  const params = keys.map((key, index) => {
    const position = startAt + index
    if (json.includes(key)) {
      values.push(JSON.stringify(row[key] ?? null))
      return `$${position}::jsonb`
    }
    values.push(row[key])
    return `$${position}`
  })
  return { keys, params, values }
}

/** `insert into <table> (...) values (...) returning <returning>` */
export function insertSql(table, row, { json = [], returning = 'id' } = {}) {
  const { keys, params, values } = placeholders(row, { json })
  if (keys.length === 0) {
    return { text: `insert into ${table} default values returning ${returning}`, values: [] }
  }
  return {
    text: `insert into ${table} (${keys.map(ident).join(', ')}) values (${params.join(', ')}) returning ${returning}`,
    values,
  }
}

/**
 * `update <table> set ... where <where> returning <returning>`. Os parâmetros
 * do `where` vêm primeiro (`$1`, `$2`…), os valores depois.
 */
export function updateSql(table, row, { where, whereValues = [], json = [], returning = 'id' } = {}) {
  const { keys, params, values } = placeholders(row, { json, startAt: whereValues.length + 1 })
  // Sem coluna para mudar, um "update" que não muda nada ainda prova que a
  // linha existe e que a pessoa pode editá-la — o RLS avalia a policy igual.
  const assignments = keys.length
    ? keys.map((key, index) => `${ident(key)} = ${params[index]}`).join(', ')
    : 'id = id'
  return {
    text: `update ${table} set ${assignments} where ${where} returning ${returning}`,
    values: [...whereValues, ...values],
  }
}
