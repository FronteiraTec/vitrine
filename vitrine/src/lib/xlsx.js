/**
 * Planilha do Excel (.xlsx) gerada no navegador, sem dependência.
 *
 * O pacote `xlsx` do npm parou na 0.18.5, com vulnerabilidade conhecida, e as
 * alternativas mantidas pesam centenas de kB para o que aqui é uma aba de
 * texto e datas. O formato cabe em poucas peças: um ZIP sem compressão com
 * cinco XML dentro.
 *
 * E é .xlsx de verdade, não HTML ou XML renomeado para .xls: esses abrem no
 * Excel com o aviso "o formato e a extensão não coincidem", e o LibreOffice e
 * o Google Planilhas nem sempre os leem como planilha. Texto vai como texto —
 * um nome que comece com "=" não vira fórmula, o que um CSV não garante.
 */

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// Limites do próprio Excel: nome de aba e conteúdo de uma célula.
const MAX_SHEET_NAME = 31
const MAX_CELL_TEXT = 32767

// Índices em `cellXfs` do styles.xml abaixo.
const STYLE_HEADER = 1
const STYLE_DATE = 2
const STYLE_DAY = 3

const encoder = new TextEncoder()

/* --------------------------------- XML ----------------------------------- */

// Caracteres de controle são proibidos em XML 1.0; um só invalida o arquivo.
// eslint-disable-next-line no-control-regex
const INVALID_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g

function escapeXml(value) {
  return String(value)
    .replace(INVALID_XML, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 0 → A, 25 → Z, 26 → AA. */
function columnName(index) {
  let name = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  }
  return name
}

/**
 * Data → número de série do Excel, no horário LOCAL. O Excel não guarda fuso:
 * a célula mostra exatamente o relógio que foi gravado, então gravar em UTC
 * deslocaria as horas de quem abre a planilha no Brasil.
 */
function excelSerial(date) {
  return (date.getTime() - date.getTimezoneOffset() * 60_000) / 86_400_000 + 25569
}

function cellXml(value, ref, style, dateOnly = false) {
  if (value === null || value === undefined || value === '') return ''
  const s = style ? ` s="${style}"` : ''

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    return `<c r="${ref}" s="${dateOnly ? STYLE_DAY : STYLE_DATE}"><v>${excelSerial(value)}</v></c>`
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"${s}><v>${value}</v></c>`
  }
  const text = escapeXml(String(value).slice(0, MAX_CELL_TEXT))
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`
}

function rowXml(values, rowNumber, style, columns = []) {
  const cells = values.map((value, index) =>
    cellXml(value, `${columnName(index)}${rowNumber}`, style, columns[index]?.type === 'day'),
  )
  return `<row r="${rowNumber}">${cells.join('')}</row>`
}

/** Nome de aba aceito pelo Excel: sem `[]:*?/\` e com até 31 caracteres. */
function safeSheetName(name) {
  const clean = String(name ?? '')
    .replace(/[[\]:*?/\\]/g, ' ')
    .trim()
    .slice(0, MAX_SHEET_NAME)
  return clean || 'Planilha'
}

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships'

function contentTypesXml(count) {
  const sheets = Array.from(
    { length: count },
    (_, index) =>
      `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join('')
  return `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\
<Default Extension="xml" ContentType="application/xml"/>\
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>\
${sheets}\
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>\
</Types>`
}

function rootRelsXml() {
  return `${XML_HEADER}<Relationships xmlns="${NS_PKG_REL}">\
<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/>\
</Relationships>`
}

/** As abas são rId1…rIdN; a folha de estilos vem logo depois. */
function workbookRelsXml(count) {
  const sheets = Array.from(
    { length: count },
    (_, index) =>
      `<Relationship Id="rId${index + 1}" Type="${NS_REL}/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
  ).join('')
  return `${XML_HEADER}<Relationships xmlns="${NS_PKG_REL}">\
${sheets}\
<Relationship Id="rId${count + 1}" Type="${NS_REL}/styles" Target="styles.xml"/>\
</Relationships>`
}

function workbookXml(sheets) {
  // O filtro automático de cada aba precisa deste nome definido para o Excel
  // reconhecê-lo ao abrir. Aspas simples no nome da aba são dobradas.
  const names = sheets
    .map(({ name, range }, index) => {
      const quoted = `'${name.replace(/'/g, "''")}'`
      const absolute = range.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2')
      return `<definedName name="_xlnm._FilterDatabase" localSheetId="${index}" hidden="1">${escapeXml(`${quoted}!${absolute}`)}</definedName>`
    })
    .join('')
  const list = sheets
    .map(({ name }, index) => `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join('')
  return `${XML_HEADER}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">\
<sheets>${list}</sheets>\
<definedNames>${names}</definedNames>\
</workbook>`
}

function stylesXml() {
  return `${XML_HEADER}<styleSheet xmlns="${NS_MAIN}">\
<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy hh:mm"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts>\
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>\
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>\
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>\
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>\
<cellXfs count="4">\
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>\
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>\
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>\
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>\
</cellXfs>\
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>\
</styleSheet>`
}

function sheetXml(columns, rows, range) {
  const cols = columns
    .map((column, index) =>
      column.width
        ? `<col min="${index + 1}" max="${index + 1}" width="${column.width}" customWidth="1"/>`
        : '',
    )
    .join('')

  const body = [
    rowXml(
      columns.map((column) => column.header),
      1,
      STYLE_HEADER,
    ),
    ...rows.map((values, index) => rowXml(values, index + 2, undefined, columns)),
  ].join('')

  // Cabeçalho congelado e filtro automático: a planilha abre pronta para
  // rolar e filtrar sem que ninguém precise configurar nada.
  return `${XML_HEADER}<worksheet xmlns="${NS_MAIN}">\
<dimension ref="${range}"/>\
<sheetViews><sheetView workbookViewId="0">\
<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>\
<selection pane="bottomLeft" activeCell="A2" sqref="A2"/>\
</sheetView></sheetViews>\
${cols ? `<cols>${cols}</cols>` : ''}\
<sheetData>${body}</sheetData>\
<autoFilter ref="${range}"/>\
</worksheet>`
}

/* --------------------------------- ZIP ----------------------------------- */

let crcTable
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n += 1) {
      let c = n
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/** Data e hora no formato do MS-DOS, que é o que o cabeçalho do ZIP guarda. */
function dosDateTime(date) {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    day: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

/**
 * ZIP com as entradas sem compressão ("stored"). Basta para o Excel, e poupa
 * implementar o deflate: o log inteiro, no teto da exportação, fica em poucos MB.
 */
function zip(files, mimeType) {
  const { time, day } = dosDateTime(new Date())
  const parts = []
  const directory = []
  let offset = 0

  for (const { name, content } of files) {
    const nameBytes = encoder.encode(name)
    const data = encoder.encode(content)
    const crc = crc32(data)

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true) // assinatura do cabeçalho local
    local.setUint16(4, 20, true) // versão mínima para extrair (2.0)
    local.setUint16(6, 0x0800, true) // nomes em UTF-8
    local.setUint16(8, 0, true) // método 0: sem compressão
    local.setUint16(10, time, true)
    local.setUint16(12, day, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true) // tamanho comprimido
    local.setUint32(22, data.length, true) // tamanho original
    local.setUint16(26, nameBytes.length, true)
    parts.push(new Uint8Array(local.buffer), nameBytes, data)

    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true) // assinatura do diretório central
    entry.setUint16(4, 20, true) // versão que gravou
    entry.setUint16(6, 20, true) // versão mínima para extrair
    entry.setUint16(8, 0x0800, true)
    entry.setUint16(10, 0, true)
    entry.setUint16(12, time, true)
    entry.setUint16(14, day, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, data.length, true)
    entry.setUint32(24, data.length, true)
    entry.setUint16(28, nameBytes.length, true)
    entry.setUint32(42, offset, true) // onde começa o cabeçalho local
    directory.push(new Uint8Array(entry.buffer), nameBytes)

    offset += 30 + nameBytes.length + data.length
  }

  const directorySize = directory.reduce((sum, part) => sum + part.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true) // assinatura do fim do diretório
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, directorySize, true)
  end.setUint32(16, offset, true)

  return new Blob([...parts, ...directory, new Uint8Array(end.buffer)], { type: mimeType })
}

/* -------------------------------- público -------------------------------- */

/**
 * Monta uma planilha — de uma aba (`{ sheetName, columns, rows }`) ou de
 * várias (`{ sheets: [{ sheetName, columns, rows }, …] }`).
 *
 * `columns`: `[{ header, width?, type? }]` — `width` em caracteres, como no
 * Excel; `type: 'day'` formata a data sem a hora.
 * `rows`: uma lista de valores por linha, na ordem das colunas. `Date` vira
 * data formatada, `number` vira número, o resto vira texto; vazio fica vazio.
 */
export function buildXlsx(input) {
  const used = new Set()
  const sheets = (input.sheets ?? [input]).map(({ sheetName, columns, rows }) => {
    // O Excel recusa duas abas com o mesmo nome, sem distinguir maiúsculas.
    let name = safeSheetName(sheetName)
    for (let n = 2; used.has(name.toLowerCase()); n += 1) {
      name = `${safeSheetName(sheetName).slice(0, MAX_SHEET_NAME - 3)} ${n}`
    }
    used.add(name.toLowerCase())
    const range = `A1:${columnName(Math.max(columns.length, 1) - 1)}${rows.length + 1}`
    return { name, columns, rows, range }
  })

  return zip(
    [
      { name: '[Content_Types].xml', content: contentTypesXml(sheets.length) },
      { name: '_rels/.rels', content: rootRelsXml() },
      { name: 'xl/workbook.xml', content: workbookXml(sheets) },
      { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml(sheets.length) },
      { name: 'xl/styles.xml', content: stylesXml() },
      ...sheets.map((sheet, index) => ({
        name: `xl/worksheets/sheet${index + 1}.xml`,
        content: sheetXml(sheet.columns, sheet.rows, sheet.range),
      })),
    ],
    XLSX_MIME,
  )
}

/** Oferece um Blob para download com o nome dado. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Revogar no mesmo tique cancela o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
