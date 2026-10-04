-- =============================================================================
-- Vitrine — traduções de demonstração
--
-- Versões em inglês e espanhol de duas notícias de `seed-noticias.sql`, para
-- ver o sistema de idiomas funcionando:
--
--   1. "Laboratório de IA…"   → inglês e espanhol, com as legendas da galeria
--                               traduzidas no inglês e não no espanhol
--   2. "Projeto de extensão…" → só inglês, sem legendas traduzidas (as fotos
--                               mostram o texto do original, marcado como
--                               português)
--
-- As outras seis ficam sem tradução de propósito: é o caso que exercita o
-- recuo — a lista em espanhol mostra só a primeira, e a home em espanhol mostra
-- as demais no original, marcadas "En portugués".
--
-- Rode no SQL Editor DEPOIS de `seed-noticias.sql` e da migration 0014. Assim
-- como aquele arquivo, este NÃO usa `truncate`: remove e recria só as
-- traduções das duas notícias acima. Textos inventados, como os do original.
-- =============================================================================

delete from public.news_translations
 where news_id in (
   select id from public.news
    where slug in (
      'laboratorio-de-ia-abre-inscricoes-para-bolsas-de-iniciacao-cientifica',
      'projeto-de-extensao-leva-oficinas-de-robotica-a-cinco-escolas'
    )
 );

-- 1. Laboratório de IA — inglês --------------------------------------------------
insert into public.news_translations (
  news_id, locale, name, kicker, excerpt, content, cover_alt, cover_caption, gallery
)
select
  n.id,
  'en',
  'AI Lab opens applications for undergraduate research scholarships',
  'Research',
  'There are 12 scholarships for undergraduate students, working on computer vision and natural language processing. Applications close on the 30th.',
  'The Applied Artificial Intelligence Laboratory has opened applications for 12 undergraduate research scholarships, starting next semester. The positions are open to undergraduate students from any program at the institution, as long as they have already taken the Algorithms course.

The scholarships last 12 months and can be renewed once, subject to a performance review and the supervisor''s assessment.

## Research areas

The projects are split into two tracks, each with six positions. Applicants choose a track when applying, and it cannot be changed after approval.

- Computer vision applied to crop monitoring
- Natural language processing for public documents
- Demand forecasting models for the municipal health network
- Accessibility tools for people with low vision

## How to apply

Applications are submitted through the student portal, in the calls section. Applicants must attach their transcript, a statement of intent of up to two pages and the acceptance of a supervisor affiliated with the laboratory.

Preliminary results come out on the 8th of the following month, with two business days for appeals. The final list is published together with the activity schedule.

## Support for applicants

The laboratory will hold in-person office hours on Wednesday afternoons, in building C, and answer questions by email throughout the application period.',
  'Students gathered around a table with laptops during a research meeting.',
  'Students during the weekly meeting of the computer vision group.',
  '[
     {"url": "https://picsum.photos/seed/vitrine-noticia-ia-g1/1200/675",
      "caption": "Test bench set up for the field experiments."},
     {"url": "https://picsum.photos/seed/vitrine-noticia-ia-g2/1200/675",
      "caption": "Presentation of the preliminary results to the academic community."},
     {"url": "https://picsum.photos/seed/vitrine-noticia-ia-g3/1200/675",
      "caption": "Equipment provided through a partnership with the agronomy laboratory."}
   ]'::jsonb
from public.news n
where n.slug = 'laboratorio-de-ia-abre-inscricoes-para-bolsas-de-iniciacao-cientifica';

-- 1. Laboratório de IA — espanhol -----------------------------------------------
insert into public.news_translations (
  news_id, locale, name, kicker, excerpt, content, cover_alt, cover_caption
)
select
  n.id,
  'es',
  'El Laboratorio de IA abre la convocatoria de becas de iniciación científica',
  'Investigación',
  'Son 12 becas para estudiantes de grado, con actuación en visión por computadora y procesamiento de lenguaje natural. La inscripción cierra el día 30.',
  'El Laboratorio de Inteligencia Artificial Aplicada abrió la inscripción para 12 becas de iniciación científica, con inicio previsto para el próximo semestre. Las plazas están destinadas a estudiantes de grado de cualquier carrera de la institución, siempre que ya hayan cursado la asignatura de Algoritmos.

Las becas duran 12 meses y pueden renovarse una vez, según la evaluación de desempeño y el dictamen del director.

## Líneas de investigación

Los proyectos se dividen en dos frentes, cada uno con seis plazas. La elección se hace en el momento de la inscripción y no puede cambiarse después de la homologación.

- Visión por computadora aplicada al monitoreo de cultivos
- Procesamiento de lenguaje natural para documentos públicos
- Modelos de previsión de demanda para la red municipal de salud
- Herramientas de accesibilidad para personas con baja visión

## Cómo inscribirse

La inscripción se realiza en el portal del estudiante, en la sección de convocatorias. Hay que adjuntar el historial académico, una carta de intención de hasta dos páginas y la aceptación de un profesor director vinculado al laboratorio.

El resultado preliminar sale el día 8 del mes siguiente, con un plazo de dos días hábiles para recursos. La lista final se publica junto con el cronograma de inicio de las actividades.',
  'Estudiantes reunidos alrededor de una mesa con computadoras portátiles durante una reunión de investigación.',
  'Estudiantes durante el encuentro semanal del grupo de visión por computadora.'
from public.news n
where n.slug = 'laboratorio-de-ia-abre-inscricoes-para-bolsas-de-iniciacao-cientifica';

-- 2. Oficinas de robótica — só inglês --------------------------------------------
insert into public.news_translations (news_id, locale, name, kicker, excerpt, content)
select
  n.id,
  'en',
  'Outreach project brings robotics workshops to five schools',
  'Outreach',
  'The initiative serves about 240 elementary school students and uses kits built by the participants themselves from reused materials.',
  'Five municipal schools now host biweekly robotics workshops led by engineering and teaching students. The goal is to reach 240 children by the end of the school year.

Each class builds its own kit from components recovered from equipment discarded by the institution, which lowers the cost per student and opens the conversation about electronic waste.

## Training the instructors

The 18 student instructors completed 40 hours of training before the first visit, split between technical content and classroom practice. The hours count as complementary activities.

The coordinators are considering expanding the project next year, depending on the renewal of the agreement with the education department.'
from public.news n
where n.slug = 'projeto-de-extensao-leva-oficinas-de-robotica-a-cinco-escolas';

-- Confere o que entrou.
select t.locale, t.slug, n.status
  from public.news_translations t
  join public.news n on n.id = t.news_id
 order by n.published_at desc nulls last, t.locale;
