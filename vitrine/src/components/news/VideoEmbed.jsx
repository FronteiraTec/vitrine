import { youtubeEmbedUrl } from '@/lib/news-content'

/**
 * Vídeo do YouTube dentro da notícia, no mesmo quadro 16:9 das fotos.
 *
 * Recebe o identificador, e não o link: o `src` é sempre montado por
 * `youtubeEmbedUrl`, então nada do que o editor digitou vai direto para o
 * iframe. `loading="lazy"` evita que o player — pesado — entre na carga da
 * página antes de a pessoa rolar até ele.
 */
export function VideoEmbed({ videoId, title }) {
  return (
    <div className="ratio ratio-16x9 bg-body-secondary overflow-hidden rounded-3">
      <iframe
        src={youtubeEmbedUrl(videoId)}
        title={title || 'Vídeo do YouTube'}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  )
}
