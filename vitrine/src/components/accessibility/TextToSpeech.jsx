import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/contexts/LocaleContext'
import { SPEECH_RATES } from '@/lib/a11y'
import { splitForSpeech } from '@/lib/speech'
import { cn } from '@/lib/utils'

/** Recua até o começo da palavra: retomar no meio dela soaria como gagueira. */
function wordStart(script, at) {
  let index = Math.max(0, Math.min(at, script.length))
  while (index > 0 && script[index - 1] !== ' ') index -= 1
  return index
}

const formatRate = (value, locale) => `${value.toLocaleString(locale)}x`

/**
 * Leitura em voz alta pela Web Speech API, com cara de player de áudio.
 *
 * O texto NÃO é raspado da página: quem usa o componente passa a string já
 * montada a partir do conteúdo editorial (ver `buildArticleSpeech`). Ler o DOM
 * traria menu, rótulo de botão e a lista de outras notícias junto — exatamente
 * o que o recurso deve evitar.
 *
 * O texto é enfileirado em trechos curtos, e não como um enunciado só, porque
 * o Chrome interrompe a fala de vozes remotas depois de cerca de 15 segundos.
 *
 * Pausar é CANCELAR e guardar a posição, e não `speechSynthesis.pause()`: o
 * Chrome no Android ignora a pausa, e no desktop ela trava de vez com vozes
 * remotas se durar mais que alguns segundos. Recomeçar da palavra onde parou
 * funciona igual em todo navegador, e é a mesma operação que a barra de
 * progresso e a troca de velocidade já precisam.
 *
 * `lang` é o idioma do TEXTO, não o da interface: uma notícia em inglês lida
 * por uma voz portuguesa sairia incompreensível. Os rótulos dos botões seguem
 * o idioma da página.
 */
export function TextToSpeech({ text, lang = 'pt-BR', label, className }) {
  const { t, locale } = useLocale()
  // Inicializador preguiçoso: `window` não existe na renderização de servidor
  // do `npm run smoke`, e ali o componente só precisa não explodir.
  const [supported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [rate, setRate] = useState(1)
  const [failed, setFailed] = useState(false)
  const [notice, setNotice] = useState('')

  // A rota da notícia troca só o parâmetro, então o componente sobrevive à
  // troca de notícia. O ajuste é feito na renderização, como o React
  // recomenda para estado derivado de prop, e não num efeito que pintaria a
  // barra da notícia anterior por um quadro.
  const [currentText, setCurrentText] = useState(text)
  if (text !== currentText) {
    setCurrentText(text)
    setPlaying(false)
    setPosition(0)
    setFailed(false)
    setNotice('')
  }

  const chunks = useMemo(() => splitForSpeech(text), [text])

  // O texto corrido é a régua da barra: a posição é um índice de caractere
  // nele, e `offsets` diz onde cada trecho começa.
  const script = useMemo(() => chunks.join(' '), [chunks])
  const offsets = useMemo(() => {
    const starts = []
    let start = 0
    for (const chunk of chunks) {
      starts.push(start)
      start += chunk.length + 1
    }
    return starts
  }, [chunks])

  // Cada leitura iniciada ganha um número. Os eventos de uma leitura já
  // cancelada ainda chegam depois do `cancel()` — e, no Firefox, como `end`
  // em vez de erro —, então quem não for da leitura atual é ignorado.
  const sessionRef = useRef(0)
  const seekTimerRef = useRef(0)
  const voiceRef = useRef(null)

  /* Voz no idioma do texto, quando o sistema tiver uma: primeiro a variante
     exata (`pt-BR`), depois qualquer uma da mesma língua (`en-GB` para `en`).
     No Chrome a lista chega de forma assíncrona, daí o ouvinte de
     `voiceschanged`. */
  useEffect(() => {
    if (!supported) return undefined
    const synth = window.speechSynthesis
    const base = lang.toLowerCase().split('-')[0]

    const pick = () => {
      const voices = synth.getVoices()
      voiceRef.current =
        voices.find((voice) => voice.lang?.toLowerCase() === lang.toLowerCase()) ??
        voices.find((voice) => voice.lang?.toLowerCase().startsWith(base)) ??
        null
    }

    pick()
    synth.addEventListener('voiceschanged', pick)
    return () => synth.removeEventListener('voiceschanged', pick)
  }, [supported, lang])

  /* Trocar de notícia ou sair da página cala a leitura. Sem isto a voz
     continuaria narrando o texto anterior sobre a tela nova. */
  useEffect(() => {
    if (!supported) return undefined
    const sessions = sessionRef
    const seekTimer = seekTimerRef
    return () => {
      sessions.current += 1
      window.clearTimeout(seekTimer.current)
      window.speechSynthesis.cancel()
    }
  }, [supported, chunks])

  function chunkAt(at) {
    let index = chunks.length - 1
    while (index > 0 && offsets[index] > at) index -= 1
    return index
  }

  function silence() {
    sessionRef.current += 1
    window.clearTimeout(seekTimerRef.current)
    window.speechSynthesis.cancel()
  }

  function speakFrom(from, speed) {
    silence()

    if (from >= script.length) {
      setPlaying(false)
      setPosition(0)
      return
    }

    const synth = window.speechSynthesis
    const session = sessionRef.current
    const current = () => session === sessionRef.current
    const track = (at) => {
      if (current()) setPosition(at)
    }

    const first = chunkAt(from)
    for (let index = first; index < chunks.length; index += 1) {
      const start = index === first ? from : offsets[index]
      const utterance = new SpeechSynthesisUtterance(
        script.slice(start, offsets[index] + chunks[index].length),
      )
      utterance.lang = lang
      utterance.rate = speed
      if (voiceRef.current) utterance.voice = voiceRef.current

      // Palavra a palavra quando a voz informa onde está. As vozes remotas do
      // Chrome não informam, e aí a barra anda de trecho em trecho.
      utterance.onstart = () => track(start)
      utterance.onboundary = (event) => track(start + event.charIndex)

      if (index === chunks.length - 1) {
        utterance.onend = () => {
          if (!current()) return
          setPlaying(false)
          setPosition(0)
          setNotice(t('tts.finished'))
        }
      }

      utterance.onerror = (event) => {
        // `canceled` e `interrupted` são o que a própria pausa dispara —
        // sinalizar erro neles acenderia um alerta a cada clique em Pausar.
        if (!current() || event.error === 'canceled' || event.error === 'interrupted') return
        silence()
        setPlaying(false)
        setFailed(true)
        setNotice(t('tts.failedNotice'))
      }

      synth.speak(utterance)
    }

    setPlaying(true)
  }

  function handlePlay() {
    setFailed(false)
    setNotice(t('tts.reading'))
    speakFrom(position, rate)
  }

  function handlePause() {
    silence()
    setPlaying(false)
    setNotice(t('tts.paused'))
  }

  function seekTo(target) {
    const next = wordStart(script, target)
    setPosition(next)
    if (!playing) return

    // Enquanto a barra é arrastada a voz fica calada, para não disputar o
    // marcador com quem arrasta; ela retoma quando o movimento para.
    silence()
    seekTimerRef.current = window.setTimeout(() => speakFrom(next, rate), 300)
  }

  // As setas pulam de trecho em trecho. Caractere a caractere, como o controle
  // nativo faria, cada toque voltaria ao começo da mesma palavra e a barra não
  // sairia do lugar pelo teclado.
  function handleSeekKey(event) {
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowUp'
    const backward = event.key === 'ArrowLeft' || event.key === 'ArrowDown'
    if (!forward && !backward) return
    event.preventDefault()

    const index = chunkAt(position)
    if (forward) {
      if (index + 1 < chunks.length) seekTo(offsets[index + 1])
    } else {
      // Como num player de música: no meio do trecho, volta ao começo dele;
      // já no começo, volta ao anterior.
      seekTo(position > offsets[index] ? offsets[index] : offsets[Math.max(0, index - 1)])
    }
  }

  function handleRate() {
    const next = SPEECH_RATES[(SPEECH_RATES.indexOf(rate) + 1) % SPEECH_RATES.length]
    setRate(next)
    setNotice(t('tts.rateNotice', { rate: formatRate(next, locale) }))
    // Velocidade nova só vale para enunciado novo: retoma da palavra atual em
    // vez de recomeçar a notícia do início.
    if (playing) speakFrom(position, next)
  }

  if (!supported) {
    return <p className={cn('text-body-secondary fs-7', className)}>{t('tts.unsupported')}</p>
  }

  if (!chunks.length) return null

  const progress = (position / script.length) * 100
  const playLabel = playing
    ? t('tts.pause')
    : position > 0
      ? t('tts.resume')
      : (label ?? t('tts.listen'))

  return (
    <div className={className}>
      <div className="tts-player">
        <Button
          type="button"
          className="tts-btn"
          onClick={playing ? handlePause : handlePlay}
          aria-label={playLabel}
          title={playLabel}
        >
          {playing ? (
            <Pause fill="currentColor" aria-hidden="true" />
          ) : (
            <Play fill="currentColor" aria-hidden="true" />
          )}
        </Button>

        <div className="tts-track">
          <input
            type="range"
            className="tts-range"
            min={0}
            max={script.length}
            value={position}
            onChange={(event) => seekTo(Number(event.target.value))}
            onKeyDown={handleSeekKey}
            aria-label={t('tts.position')}
            aria-valuetext={t('tts.progress', { percent: Math.round(progress) })}
            style={{ '--tts-progress': `${progress}%` }}
          />
        </div>

        <Button type="button" className="tts-btn" onClick={handleRate} title={t('tts.rate')}>
          <span className="visually-hidden">{t('tts.rateLabel')}</span>
          {formatRate(rate, locale)}
        </Button>
      </div>

      {/* Estado anunciado por leitor de tela sem roubar o foco de quem lê. */}
      <span aria-live="polite" className="visually-hidden">
        {notice}
      </span>

      {failed ? <p className="text-danger fs-8 mt-2 mb-0">{t('tts.failed')}</p> : null}
    </div>
  )
}
