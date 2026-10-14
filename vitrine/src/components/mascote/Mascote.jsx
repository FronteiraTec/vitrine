/**
 * Mascote da Vitrine Tecnológica
 * --------------------------------
 * Componente React (SVG + CSS, sem dependências além do React 18+).
 *
 * Uso básico:
 *   import Mascote, { useMascote } from "./Mascote";
 *
 *   function Tela() {
 *     const mascote = useMascote({ voltarApos: 4000 });
 *
 *     async function salvar() {
 *       try {
 *         await mascote.chamar("/api/projetos", { method: "POST", body },
 *           { mensagens: { 201: "Projeto publicado na vitrine!" } });
 *       } catch { }
 *     }
 *
 *     return <Mascote estado={mascote.estado} mensagem={mascote.mensagem} />;
 *   }
 *
 * No estado "naoEncontrado" o mascote vira o 0 do "404" (desligue com mostrar404={false}).
 * Variáveis CSS opcionais: --mascote-404 (cor dos 4), --mascote-fonte-404, --mascote-balao-fundo,
 *   --mascote-balao-texto, --mascote-balao-borda, --mascote-sombra.
 *
 * Roupa: roupa="astronauta" sempre, roupa="aleatoria" aparece às vezes (chanceAstronauta, padrão 25%).
 *
 * Estados: parado | carregando | sucesso | faltando | naoEncontrado | erro | ajuda
 *          | falando (o texto do balão aparece letra a letra) | dormindo | caminhando
 * useMascote({ dormirApos: 120000 }) faz ele dormir após 2 min sem interação e acordar sozinho.
 */
import { useCallback, useEffect, useId, useRef, useState } from "react";

const CORES = {
  corpo: "#7DAA8B",
  corpoClaro: "#93BFA0",
  corpoEscuro: "#6A967A",
  folha: "#86B994",
  folhaVeia: "#6A9E78",
  caule: "#6A967A",
  bochecha: "#F2A1A1",
  olho: "#24302A",
  lingua: "#EE8B8B",
  lente: "#CFEAF7",
  cabo: "#3C4A42",
  gota: "#9CD2EE",
  estrela: "#F5C84C",
  asa: "#F29E5C",
  traje: "#F3F5F7",
  trajeSombra: "#DCE2E7",
  trajeLinha: "#AFB9C2",
  asaClara: "#F7CB76",
};

export const MENSAGENS = {
  parado: "Oi! Estou por aqui se precisar.",
  carregando: "Buscando as informações…",
  sucesso: "Deu tudo certo!",
  faltando: "Faltou alguma informação. Confere os campos destacados?",
  naoEncontrado: "Ops… me distraí com uma borboleta e não achei essa página.",
  erro: "Algo deu errado do nosso lado. Tente de novo em instantes.",
  ajuda: "Quer um tour rápido pela vitrine? Eu te mostro!",
  falando: "Olá! Eu sou o mascote da Vitrine Tecnológica e vou te ajudar a explorar os projetos.",
  dormindo: "",
  caminhando: "Já estou indo!",
};

export const ROTULOS = {
  parado: "Parado",
  carregando: "Carregando",
  sucesso: "Sucesso",
  faltando: "Faltou informação",
  naoEncontrado: "Não encontrado",
  erro: "Erro",
  ajuda: "Ajuda / tutorial",
  falando: "Falando",
  dormindo: "Dormindo",
  caminhando: "Caminhando",
};

// [braço esquerdo, braço direito] em graus (0 = apontando para cima)
const BRACOS = {
  parado: [-120, 120],
  carregando: [-120, 120],
  sucesso: [-35, 35],
  faltando: [-65, 65],
  naoEncontrado: [-125, 28],
  erro: [-155, 155],
  ajuda: [-120, 35],
  falando: [-120, 62],
  dormindo: [-150, 150],
  caminhando: [-155, 155],
};

// [folha esquerda, folha direita] em graus
const FOLHAS = {
  parado: [0, 0],
  carregando: [0, 0],
  sucesso: [12, -12],
  faltando: [-8, 4],
  naoEncontrado: [0, 0],
  erro: [-38, 38],
  ajuda: [6, -6],
  falando: [0, 0],
  dormindo: [-22, 22],
  caminhando: [0, 0],
};

/** Converte um status HTTP no estado do mascote. */
export function estadoPorStatus(status) {
  if (!status) return "erro";
  if (status >= 200 && status < 300) return "sucesso";
  if (status === 404) return "naoEncontrado";
  if (status === 401 || status === 403) return "erro";
  if (status >= 400 && status < 500) return "faltando";
  return "erro";
}

/** Mensagens específicas para alguns status; os demais usam a do estado. */
export function mensagemPorStatus(status) {
  const especificas = {
    401: "Entre na sua conta para continuar.",
    403: "Essa área é restrita. Peça acesso a um administrador.",
    429: "Muitas tentativas seguidas. Espere um pouquinho.",
    503: "O servidor está em manutenção. Volte daqui a pouco.",
  };
  return especificas[status];
}

/**
 * Hook que controla o mascote.
 * - definir(estado, mensagem?) troca manualmente
 * - chamar(urlOuFuncao, opcoesFetch?, { mensagens }) faz a requisição e reage ao status
 * - voltarApos (ms): volta para "parado" depois de sucesso/erro/etc. (0 = nunca)
 */
export function useMascote({ voltarApos = 0, dormirApos = 0 } = {}) {
  const [estado, setEstado] = useState("parado");
  const [mensagem, setMensagem] = useState();
  const timer = useRef();

  const definir = useCallback(
    (novo, msg) => {
      clearTimeout(timer.current);
      setEstado(novo);
      setMensagem(msg);
      const temporario = !["parado", "carregando", "ajuda"].includes(novo);
      if (voltarApos && temporario) {
        timer.current = setTimeout(() => {
          setEstado("parado");
          setMensagem(undefined);
        }, voltarApos);
      }
    },
    [voltarApos]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  // dorme depois de um tempo sem interação e acorda com qualquer movimento
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  useEffect(() => {
    if (!dormirApos || typeof window === "undefined") return;
    let sono;
    const agendar = () => {
      clearTimeout(sono);
      sono = setTimeout(() => {
        if (["parado", "sucesso"].includes(estadoRef.current)) {
          setEstado("dormindo");
          setMensagem(undefined);
        }
      }, dormirApos);
    };
    const atividade = () => {
      if (estadoRef.current === "dormindo") {
        setEstado("parado");
        setMensagem(undefined);
      }
      agendar();
    };
    const eventos = ["pointermove", "pointerdown", "keydown", "scroll", "touchstart"];
    eventos.forEach((ev) => window.addEventListener(ev, atividade, { passive: true }));
    agendar();
    return () => {
      clearTimeout(sono);
      eventos.forEach((ev) => window.removeEventListener(ev, atividade));
    };
  }, [dormirApos]);

  const chamar = useCallback(
    async (alvo, opcoes, { mensagens = {} } = {}) => {
      definir("carregando");
      try {
        const resp = typeof alvo === "function" ? await alvo() : await fetch(alvo, opcoes);
        definir(
          estadoPorStatus(resp.status),
          mensagens[resp.status] ?? mensagemPorStatus(resp.status)
        );
        return resp;
      } catch (erro) {
        definir("erro", mensagens.rede ?? "Não consegui falar com o servidor. Confira sua conexão.");
        throw erro;
      }
    },
    [definir]
  );

  return { estado, mensagem, definir, chamar };
}

/* ---------------- Partes do desenho ---------------- */

const CONFETES = [
  [-80, -40, 200, "#F29E5C"],
  [-60, -75, -160, "#5B8DEF"],
  [-20, -95, 240, "#F5C84C"],
  [25, -92, -220, "#E86A6A"],
  [65, -72, 180, "#7DAA8B"],
  [88, -35, -200, "#F5C84C"],
  [-95, 5, 140, "#E86A6A"],
  [98, 10, -140, "#5B8DEF"],
];

function estrela(cx, cy, r) {
  return `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r} Z`;
}

function Olho({ cx, cy, r = 7.5, brilho = 1 }) {
  const C = CORES;
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={C.olho} />
      <circle cx={cx - r * 0.33} cy={cy - r * 0.4} r={r * 0.32} fill="#fff" />
      {brilho > 1 && <circle cx={cx + r * 0.35} cy={cy + r * 0.35} r={r * 0.16} fill="#fff" />}
    </>
  );
}

function Olhos({ e }) {
  const C = CORES;
  const traco = { stroke: C.olho, strokeLinecap: "round", fill: "none" };
  if (e === "sucesso") {
    return (
      <g {...traco} strokeWidth="5">
        <path d="M71 112 Q80 99 89 112" />
        <path d="M111 112 Q120 99 129 112" />
      </g>
    );
  }
  if (e === "erro") {
    return (
      <g>
        <g {...traco} strokeWidth="4.5">
          <path d="M74 102 L86 114 M86 102 L74 114" />
          <path d="M114 102 L126 114 M126 102 L114 114" />
        </g>
        <path className="msc-lagrima" d="M78 117 Q74 126 78 130 Q82 126 78 117 Z" fill={C.gota} />
        <path className="msc-lagrima msc-lagrima-2" d="M122 117 Q118 126 122 130 Q126 126 122 117 Z" fill={C.gota} />
      </g>
    );
  }
  if (e === "dormindo") {
    return (
      <g {...traco} strokeWidth="4">
        <path d="M72 106 Q80 114 88 106" />
        <path d="M112 106 Q120 114 128 106" />
      </g>
    );
  }
  if (e === "naoEncontrado") {
    return (
      <g className="msc-segue">
        <Olho cx={80} cy={107} r={9.5} brilho={2} />
        <Olho cx={120} cy={107} r={9.5} brilho={2} />
      </g>
    );
  }
  if (e === "ajuda") {
    return (
      <g>
        <g className="msc-piscar">
          <Olho cx={80} cy={108} />
        </g>
        <path d="M112 109 Q120 101 128 109" {...traco} strokeWidth="4.5" />
      </g>
    );
  }
  const dy = e === "carregando" ? -4 : 0;
  return (
    <g className={e === "parado" ? "msc-espiar" : ""}>
      <g className="msc-piscar">
        <Olho cx={80} cy={108 + dy} />
        <Olho cx={120} cy={108 + dy} />
      </g>
    </g>
  );
}

const SOBRANCELHAS = {
  sucesso: ["M70 93 Q78 85 87 90", "M113 90 Q122 85 130 93"],
  erro: ["M72 95 L88 88", "M112 88 L128 95"],
  faltando: ["M72 96 L87 96", "M111 92 Q120 82 130 89"],
  naoEncontrado: ["M70 91 Q79 82 88 88", "M112 88 Q121 82 130 91"],
  carregando: ["M72 89 L88 94", "M112 94 L128 89"],
  falando: ["M72 95 Q79 90 87 93", "M113 93 Q121 90 128 95"],
  ajuda: ["M71 93 Q79 86 87 91", "M113 97 L128 97"],
};

function Sobrancelhas({ e }) {
  const d = SOBRANCELHAS[e];
  if (!d) return null;
  return (
    <g className={`msc-sobrancelhas msc-sobr--${e}`} stroke={CORES.olho} strokeWidth="3.6" strokeLinecap="round" fill="none">
      <path d={d[0]} />
      <path d={d[1]} />
    </g>
  );
}

const BOCHECHAS = {
  sucesso: { rx: 13, ry: 8, op: 1 },
  erro: { rx: 10, ry: 6, op: 0.35 },
  faltando: { rx: 10, ry: 6, op: 0.7 },
  naoEncontrado: { rx: 12, ry: 7.5, op: 1 },
  dormindo: { rx: 11, ry: 7, op: 0.95 },
};

function Astronauta({ uid, parte }) {
  const C = CORES;
  if (parte === "fundo") {
    // mochila de oxigênio, atrás de tudo
    return (
      <g>
        <rect x="20" y="96" width="160" height="86" rx="20" fill={C.trajeSombra} stroke={C.trajeLinha} strokeWidth="2" />
        <rect x="14" y="108" width="12" height="40" rx="6" fill={C.trajeLinha} />
        <rect x="174" y="108" width="12" height="40" rx="6" fill={C.trajeLinha} />
      </g>
    );
  }
  if (parte === "traje") {
    return (
      <g>
        <defs>
          <clipPath id={`${uid}-traje`}>
            <rect x="-20" y="148" width="240" height="100" />
          </clipPath>
          <clipPath id={`${uid}-capacete`}>
            <rect x="-20" y="-20" width="240" height="176" />
          </clipPath>
        </defs>
        <path
          clipPath={`url(#${uid}-traje)`}
          d="M100 38 C156 38 171 82 170 130 C169 182 152 206 100 206 C48 206 31 182 30 130 C29 82 44 38 100 38 Z"
          fill={C.traje}
          stroke={C.trajeLinha}
          strokeWidth="2"
        />
        {/* painel do peito */}
        <rect x="82" y="168" width="36" height="20" rx="5" fill={C.trajeSombra} stroke={C.trajeLinha} strokeWidth="1.5" />
        <circle cx="91" cy="178" r="3.2" fill="#E86A6A" />
        <circle className="msc-led" cx="100" cy="178" r="3.2" fill="#5B8DEF" />
        <circle cx="109" cy="178" r="3.2" fill={C.estrela} />
        {/* emblema */}
        <circle cx="56" cy="172" r="8" fill={C.asa} />
        <path d={estrela(56, 172, 5)} fill="#fff" />
      </g>
    );
  }
  // capacete de vidro (na frente do rosto) + gola
  return (
    <g>
      <g clipPath={`url(#${uid}-capacete)`}>
        <ellipse cx="100" cy="86" rx="90" ry="90" fill={C.lente} fillOpacity=".16" stroke={C.trajeLinha} strokeWidth="5" />
        <ellipse cx="100" cy="86" rx="90" ry="90" fill="none" stroke="#fff" strokeWidth="2.5" strokeOpacity=".9" />
        <path d="M30 78 Q38 34 84 12" stroke="#fff" strokeWidth="6" strokeOpacity=".7" fill="none" strokeLinecap="round" />
        <circle cx="96" cy="9" r="3.5" fill="#fff" fillOpacity=".7" />
      </g>
      <rect x="28" y="142" width="144" height="17" rx="8.5" fill={C.traje} stroke={C.trajeLinha} strokeWidth="2" />
      <path d="M160 18 L172 0" stroke={C.trajeLinha} strokeWidth="3" strokeLinecap="round" />
      <circle className="msc-antena" cx="173" cy="-2" r="4.5" fill="#E86A6A" />
    </g>
  );
}

function Boca({ e, falandoAgora }) {
  const C = CORES;
  const traco = { stroke: C.olho, strokeWidth: 4, fill: "none", strokeLinecap: "round" };
  if (e === "falando" && falandoAgora) {
    return (
      <g className="msc-boca-fala">
        <ellipse cx="100" cy="126" rx="7" ry="6.5" fill={C.olho} />
        <ellipse cx="100" cy="130" rx="4" ry="2" fill={C.lingua} />
      </g>
    );
  }
  switch (e) {
    case "dormindo":
      return (
        <g>
          <ellipse cx="100" cy="127" rx="3.5" ry="3" fill={C.olho} />
          <circle className="msc-bolha" cx="112" cy="124" r="6" fill={C.gota} fillOpacity=".45" stroke={C.gota} strokeWidth="1.5" />
        </g>
      );
    case "sucesso":
      return (
        <g>
          <path d="M82 119 Q100 150 118 119 Z" fill={C.olho} strokeLinejoin="round" />
          <ellipse cx="100" cy="131" rx="7" ry="3.6" fill={C.lingua} />
        </g>
      );
    case "erro":
      return <path d="M86 134 Q100 120 114 134" {...traco} />;
    case "faltando":
      return <path d="M90 129 Q95 125 100 128 Q105 131 110 126" {...traco} />;
    case "naoEncontrado":
      return <ellipse cx="100" cy="129" rx="6.5" ry="8" fill={C.olho} />;
    case "carregando":
      return <path d="M93 124 Q100 130 107 124" {...traco} />;
    default:
      return (
        <g>
          <path d="M89 120 Q100 136 111 120 Z" fill={C.olho} />
          <ellipse cx="100" cy="125" rx="4" ry="2" fill={C.lingua} />
        </g>
      );
  }
}

function Extras({ e }) {
  const C = CORES;
  if (e === "sucesso") {
    const estrelas = [
      [-2, 70, 9, 0],
      [196, 58, 8, 0.3],
      [184, 26, 6, 0.6],
      [12, 30, 6, 0.45],
    ];
    return (
      <g>
        {estrelas.map(([x, y, r, d]) => (
          <path key={x} className="msc-estrela" d={estrela(x, y, r)} fill={C.estrela} style={{ animationDelay: `${d}s` }} />
        ))}
        {CONFETES.map(([dx, dy, rot, cor], i) => (
          <rect
            key={i}
            className="msc-confete"
            x="96"
            y="60"
            width="7"
            height="11"
            rx="2"
            fill={cor}
            style={{ "--dx": `${dx}px`, "--dy": `${dy}px`, "--rot": `${rot}deg` }}
          />
        ))}
      </g>
    );
  }
  if (e === "erro") {
    return <path className="msc-gota" d="M150 62 Q158 76 150 82 Q142 76 150 62 Z" fill={C.gota} />;
  }
  if (e === "dormindo") {
    return (
      <g fill={C.corpoEscuro} fontFamily="system-ui, sans-serif" fontWeight="800">
        {[[14, 0], [19, 0.8], [25, 1.6]].map(([t, d]) => (
          <text key={t} className="msc-z" x="140" y="70" fontSize={t} style={{ animationDelay: `${d}s` }}>z</text>
        ))}
      </g>
    );
  }
  if (e === "naoEncontrado") {
    return (
      <g className="msc-borboleta" style={{ transform: "translate(150px, 28px)" }}>
       <g transform="scale(1.45)">
        <g className="msc-asas">
          <ellipse cx="-6" cy="-4" rx="7" ry="9" fill={C.asa} transform="rotate(-25 -6 -4)" />
          <ellipse cx="6" cy="-4" rx="7" ry="9" fill={C.asa} transform="rotate(25 6 -4)" />
          <ellipse cx="-5" cy="6" rx="5" ry="6" fill={C.asaClara} />
          <ellipse cx="5" cy="6" rx="5" ry="6" fill={C.asaClara} />
          <circle cx="-7" cy="-6" r="1.8" fill="#fff" opacity=".75" />
          <circle cx="7" cy="-6" r="1.8" fill="#fff" opacity=".75" />
        </g>
        <rect x="-1.4" y="-8" width="2.8" height="17" rx="1.4" fill={C.olho} />
        <path d="M-1 -8 Q-4 -15 -7 -16 M1 -8 Q4 -15 7 -16" stroke={C.olho} strokeWidth="1.2" fill="none" strokeLinecap="round" />
       </g>
      </g>
    );
  }
  if (e === "faltando") {
    return (
      <text className="msc-interroga" x="168" y="52" fontSize="34" fontWeight="800" fill={C.olho} fontFamily="system-ui, sans-serif">
        ?
      </text>
    );
  }
  if (e === "ajuda") {
    return (
      <g className="msc-tracos" stroke={C.corpoEscuro} strokeWidth="3.5" strokeLinecap="round">
        <path d="M189 86 L194 77" />
        <path d="M197 97 L206 92" />
        <path d="M199 108 L208 108" />
        <path d={estrela(208, 72, 6)} fill={C.corpoEscuro} stroke="none" />
      </g>
    );
  }
  return null;
}

/* ---------------- Estilos (injetados uma vez) ---------------- */

const CSS = `
.msc{display:inline-flex;flex-direction:column;align-items:center;gap:12px}
.msc-palco{display:flex;flex-direction:column;align-items:center}
.msc-svg{display:block;overflow:visible;transform-origin:50% 92%}
.msc-svg *{transform-box:view-box}
.msc-pop{animation:msc-pop .45s cubic-bezier(.3,1.6,.5,1) both}
.msc-astro.msc--parado .msc-svg{animation:msc-gravidade 5s ease-in-out infinite}
.msc-antena{transform-box:fill-box;transform-origin:center;animation:msc-antena 1.6s ease-in-out infinite}
.msc-led{animation:msc-tracos .9s steps(2) infinite}
.msc-espiar{animation:msc-espiar 7s ease-in-out infinite}
.msc-sobrancelhas{transition:transform .3s}
.msc-sobr--faltando{animation:msc-sobr 1.3s ease-in-out infinite alternate}
.msc-tagarela .msc-sobrancelhas{animation:msc-sobr .5s ease-in-out infinite alternate}
.msc-sobr--sucesso{animation:msc-sobr .62s ease-in-out infinite alternate}
.msc-lagrima{animation:msc-lagrima 1.4s ease-in infinite}
.msc-lagrima-2{animation-delay:.7s}
.msc-confete{opacity:0;transform-box:fill-box;transform-origin:center;animation:msc-confete 1.1s cubic-bezier(.2,.7,.4,1) .12s 1}
.msc--sucesso .msc-bochechas,.msc--naoEncontrado .msc-bochechas{animation:msc-corar 1.2s ease-in-out infinite alternate}
.msc-sombra{width:calc(var(--msc-tam)*.42);height:calc(var(--msc-tam)*.05);margin-top:calc(var(--msc-tam)*-.085);border-radius:50%;background:var(--mascote-sombra,rgba(30,50,38,.18))}
.msc-balao{position:relative;max-width:min(300px,86vw);padding:10px 14px;border-radius:16px;background:var(--mascote-balao-fundo,#fff);color:var(--mascote-balao-texto,#1e2a22);border:1.5px solid var(--mascote-balao-borda,#cfe0d4);box-shadow:0 6px 18px rgba(30,50,38,.10);font-size:14px;line-height:1.45;animation:msc-balao .35s cubic-bezier(.2,1.4,.4,1) both}
.msc-balao::after{content:"";position:absolute;left:50%;bottom:-8px;width:13px;height:13px;background:inherit;border-right:inherit;border-bottom:inherit;transform:translateX(-50%) rotate(45deg)}
.msc-balao-texto{margin:0}
.msc-balao-extra{margin-top:10px}

.msc--parado .msc-svg{animation:msc-respira 3.2s ease-in-out infinite}
.msc--sucesso .msc-svg{animation:msc-pulo 1.25s cubic-bezier(.3,0,.3,1) infinite}
.msc--erro .msc-svg{animation:msc-choque .75s ease-out,msc-murcho 3.4s ease-in-out .75s infinite}
.msc--faltando .msc-svg{animation:msc-inclinar 3.2s cubic-bezier(.5,0,.3,1.4) infinite}
.msc--naoEncontrado .msc-svg{animation:msc-inclina-voo 6s ease-in-out infinite}
.msc--carregando .msc-svg{animation:msc-flutuar 1.4s ease-in-out infinite alternate}
.msc--ajuda .msc-svg{animation:msc-balanca 2.4s ease-in-out infinite}
.msc--falando .msc-svg{animation:msc-respira 3.2s ease-in-out infinite}
.msc-tagarela .msc-svg{animation:msc-fala-corpo .5s ease-in-out infinite alternate}
.msc--dormindo .msc-svg{animation:msc-dormir 3.8s ease-in-out infinite}
.msc--caminhando .msc-svg{animation:msc-andar .6s linear infinite}

.msc-folhas,.msc-folha-e,.msc-folha-d{transform-origin:100px 22px}
.msc-folha-e,.msc-folha-d{transition:transform .5s cubic-bezier(.3,1.5,.5,1)}
.msc--parado .msc-folhas,.msc--ajuda .msc-folhas,.msc--faltando .msc-folhas{animation:msc-folhas 2.6s ease-in-out infinite}
.msc--sucesso .msc-folhas{animation:msc-folhas .65s ease-in-out infinite}
.msc--carregando .msc-folhas{animation:msc-gira .9s linear infinite}
.msc--caminhando .msc-folhas{animation:msc-folhas .6s ease-in-out infinite}
.msc--dormindo .msc-folhas{animation:msc-folhas 3.8s ease-in-out infinite}

.msc-braco-d,.msc-aceno-d{transform-origin:160px 138px}
.msc-braco-e,.msc-aceno-e{transform-origin:40px 138px}
.msc-braco-d,.msc-braco-e{transition:transform .45s cubic-bezier(.3,1.4,.5,1)}
.msc--ajuda .msc-aceno-d{animation:msc-acenar .7s ease-in-out infinite alternate}
.msc--naoEncontrado .msc-aceno-d{animation:msc-alcancar 1.5s ease-in-out infinite alternate}
.msc--sucesso .msc-aceno-d{animation:msc-comemora .33s ease-in-out infinite alternate}
.msc--sucesso .msc-aceno-e{animation:msc-comemora .33s ease-in-out infinite alternate-reverse}
.msc-tagarela .msc-aceno-d{animation:msc-gesto .55s ease-in-out infinite alternate}
.msc--caminhando .msc-aceno-e{animation:msc-braco-anda .6s ease-in-out infinite}
.msc--caminhando .msc-aceno-d{animation:msc-braco-anda .6s ease-in-out infinite -.3s}
.msc-perna-e{transform-origin:79px 192px}
.msc-perna-d{transform-origin:121px 192px}
.msc--caminhando .msc-perna-e{animation:msc-passo .6s ease-in-out infinite}
.msc--caminhando .msc-perna-d{animation:msc-passo .6s ease-in-out infinite -.3s}
.msc-boca-fala{transform-origin:100px 122px;animation:msc-falar .42s ease-in-out infinite}
.msc-z{opacity:0;animation:msc-z 2.4s ease-out infinite}
.msc-bolha{transform-box:fill-box;transform-origin:left center;animation:msc-bolha 3.8s ease-in-out infinite}

.msc-piscar{transform-origin:100px 106px;animation:msc-piscar 4.5s infinite}
.msc-segue{animation:msc-segue 6s ease-in-out infinite}
.msc-borboleta{animation:msc-voo 6s ease-in-out infinite}
.msc-asas{transform-box:fill-box;transform-origin:center;animation:msc-bater .16s ease-in-out infinite alternate}
.msc-404{display:flex;align-items:center;justify-content:center;gap:2px;max-width:100%}
.msc-4{font-family:var(--mascote-fonte-404,"Fredoka","Baloo 2","Arial Rounded MT Bold",system-ui,sans-serif);font-weight:800;line-height:1;font-size:min(calc(var(--msc-tam)*.78),24vw);color:var(--mascote-404,#6A967A);margin-bottom:calc(var(--msc-tam)*.06);margin-inline:calc(var(--msc-tam)*-.07);user-select:none}
.msc-404 .msc-svg{width:min(var(--msc-tam),40vw);height:auto}
.msc-estrela{transform-box:fill-box;transform-origin:center;animation:msc-cintila 1.2s ease-in-out infinite}
.msc-gota{animation:msc-gota 1.6s ease-in infinite}
.msc-interroga{transform-box:fill-box;transform-origin:center;animation:msc-interroga 1.3s ease-in-out infinite alternate}
.msc-tracos{animation:msc-tracos .7s ease-in-out infinite alternate}

@keyframes msc-balao{from{opacity:0;transform:translateY(6px) scale(.92)}to{opacity:1;transform:none}}
@keyframes msc-respira{0%,100%{transform:scale(1,1)}50%{transform:scale(.99,1.02)}}
@keyframes msc-pulo{0%,100%{transform:translateY(0) scale(1,1)}14%{transform:translateY(0) scale(1.14,.84)}36%{transform:translateY(-22%) scale(.9,1.12) rotate(-4deg)}50%{transform:translateY(-24%) scale(.96,1.04) rotate(3deg)}66%{transform:translateY(0) scale(1.12,.86)}78%{transform:translateY(0) scale(.97,1.03)}88%{transform:translateY(0) scale(1,1)}}
@keyframes msc-tremer{0%,100%{transform:translateX(0)}20%{transform:translateX(-4%)}40%{transform:translateX(4%)}60%{transform:translateX(-3%)}80%{transform:translateX(3%)}}
@keyframes msc-inclinar{0%,38%,100%{transform:rotate(-10deg)}50%,88%{transform:rotate(8deg)}}
@keyframes msc-inclina-voo{0%,100%{transform:rotate(2deg)}20%{transform:rotate(3.3deg)}40%{transform:rotate(.7deg)}60%{transform:rotate(-1.7deg)}80%{transform:rotate(-2.8deg)}}
@keyframes msc-flutuar{from{transform:translateY(0)}to{transform:translateY(-6%)}}
@keyframes msc-balanca{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
@keyframes msc-folhas{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}
@keyframes msc-gira{to{transform:rotate(360deg)}}
@keyframes msc-acenar{from{transform:rotate(-12deg)}to{transform:rotate(18deg)}}
@keyframes msc-alcancar{from{transform:rotate(-6deg)}to{transform:rotate(10deg)}}
@keyframes msc-comemora{from{transform:rotate(-8deg)}to{transform:rotate(8deg)}}
@keyframes msc-piscar{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes msc-segue{0%,100%{transform:translate(4px,-2.5px)}20%{transform:translate(6.5px,-4px)}40%{transform:translate(1.5px,-5px)}60%{transform:translate(-3.5px,-3.5px)}80%{transform:translate(-5.5px,-1px)}}
@keyframes msc-voo{0%,100%{transform:translate(150px,28px)}20%{transform:translate(182px,8px)}40%{transform:translate(118px,-4px)}60%{transform:translate(58px,14px)}80%{transform:translate(28px,44px)}}
@keyframes msc-bater{from{transform:scaleX(1)}to{transform:scaleX(.25)}}
@keyframes msc-cintila{0%,100%{transform:scale(.4);opacity:.3}50%{transform:scale(1.15);opacity:1}}
@keyframes msc-gota{0%{transform:translateY(0);opacity:0}20%{opacity:1}100%{transform:translateY(14px);opacity:0}}
@keyframes msc-interroga{from{transform:translateY(0) rotate(8deg)}to{transform:translateY(-6px) rotate(-4deg)}}
@keyframes msc-tracos{from{opacity:.25}to{opacity:1}}
@keyframes msc-pop{0%{transform:scale(.82,1.12)}55%{transform:scale(1.08,.94)}100%{transform:scale(1)}}
@keyframes msc-choque{0%{transform:none}18%{transform:translateY(-10%) scale(.88,1.14)}38%{transform:translateY(0) scale(1.12,.88)}52%{transform:translateX(-5%) rotate(-3deg)}66%{transform:translateX(5%) rotate(3deg)}80%{transform:translateX(-3%)}100%{transform:none}}
@keyframes msc-murcho{0%,100%{transform:scale(1,.97) rotate(0)}50%{transform:scale(1.03,.93) rotate(-2deg)}}
@keyframes msc-gravidade{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-7%) rotate(5deg)}}
@keyframes msc-antena{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.7);opacity:.45}}
@keyframes msc-espiar{0%,30%,100%{transform:translate(0,0)}38%,52%{transform:translate(-4px,0)}60%,74%{transform:translate(4px,-1px)}}
@keyframes msc-sobr{from{transform:translateY(0)}to{transform:translateY(-3px)}}
@keyframes msc-lagrima{0%{transform:translateY(0) scale(.6);opacity:0}25%{opacity:1}100%{transform:translateY(16px) scale(1);opacity:0}}
@keyframes msc-confete{0%{opacity:1;transform:translate(0,0) rotate(0) scale(.6)}70%{opacity:1}100%{opacity:0;transform:translate(var(--dx),calc(var(--dy) + 40px)) rotate(var(--rot)) scale(1)}}
@keyframes msc-corar{from{opacity:.8}to{opacity:1}}
@keyframes msc-fala-corpo{from{transform:translateY(0) rotate(-1deg)}to{transform:translateY(-1.5%) rotate(1deg)}}
@keyframes msc-gesto{from{transform:rotate(-12deg)}to{transform:rotate(14deg)}}
@keyframes msc-falar{0%,100%{transform:scaleY(.25)}20%{transform:scaleY(1)}40%{transform:scaleY(.45)}60%{transform:scaleY(.9)}80%{transform:scaleY(.3)}}
@keyframes msc-dormir{0%,100%{transform:rotate(-4deg) scale(1,1)}50%{transform:rotate(-4deg) scale(1.025,.975)}}
@keyframes msc-z{0%{transform:translate(0,6px);opacity:0}25%{opacity:1}100%{transform:translate(26px,-48px);opacity:0}}
@keyframes msc-bolha{0%,100%{transform:scale(.35)}50%{transform:scale(1.25)}}
@keyframes msc-andar{0%,50%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-3%) rotate(-2deg)}75%{transform:translateY(-3%) rotate(2deg)}}
@keyframes msc-passo{0%,50%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-8px) rotate(-12deg)}}
@keyframes msc-braco-anda{0%,100%{transform:rotate(-16deg)}50%{transform:rotate(16deg)}}

@media (prefers-reduced-motion: reduce){
  .msc *,.msc .msc-svg{animation:none!important;transition:none!important}
}
`;

function useEstilos() {
  useEffect(() => {
    if (typeof document === "undefined" || document.getElementById("msc-estilos")) return;
    const tag = document.createElement("style");
    tag.id = "msc-estilos";
    tag.textContent = CSS;
    document.head.appendChild(tag);
  }, []);
}

/* ---------------- Componente ---------------- */

export default function Mascote({
  estado = "parado",
  mensagem,
  tamanho = 180,
  mostrarBalao = true,
  mostrar404 = true,
  roupa = "normal",
  chanceAstronauta = 0.25,
  children,
  className = "",
  style,
}) {
  useEstilos();
  const uid = useId().replace(/:/g, "");
  const e = estado in MENSAGENS ? estado : "parado";
  // roupa: "normal" | "astronauta" | "aleatoria" (sorteia uma vez ao montar)
  const [sorteio] = useState(() => Math.random());
  const astronauta = roupa === "astronauta" || (roupa === "aleatoria" && sorteio < chanceAstronauta);
  const texto = mensagem ?? MENSAGENS[e];

  // "falando": o texto do balão aparece letra a letra enquanto a boca mexe
  const [digitado, setDigitado] = useState(null);
  useEffect(() => {
    const semMovimento =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (e !== "falando" || !texto || !mostrarBalao || semMovimento) {
      setDigitado(null);
      return;
    }
    let i = 0;
    setDigitado("");
    const id = setInterval(() => {
      i += 1;
      setDigitado(texto.slice(0, i));
      if (i >= texto.length) clearInterval(id);
    }, 38);
    return () => clearInterval(id);
  }, [e, texto, mostrarBalao]);
  const falandoAgora = e === "falando" && (digitado === null ? !mostrarBalao : digitado.length < texto.length);
  const [bE, bD] = BRACOS[e];
  const [fE, fD] = FOLHAS[e];
  const C = CORES;

  return (
    <div className={`msc msc--${e} ${falandoAgora ? "msc-tagarela" : ""} ${astronauta ? "msc-astro" : ""} ${className}`} style={{ "--msc-tam": `${tamanho}px`, ...style }}>
      {mostrarBalao && (texto || children) && (
        <div className="msc-balao" key={e + (texto || "")} aria-live="polite">
          {texto && (
            digitado === null ? (
              <p className="msc-balao-texto">{texto}</p>
            ) : (
              <p className="msc-balao-texto" aria-label={texto}>
                <span aria-hidden="true">{digitado}</span>
                <span aria-hidden="true" style={{ visibility: "hidden" }}>{texto.slice(digitado.length)}</span>
              </p>
            )
          )}
          {children && <div className="msc-balao-extra">{children}</div>}
        </div>
      )}

      {(() => {
        const palco = (
      <div className="msc-palco msc-pop" key={e}>
        <svg className="msc-svg" viewBox="-20 0 240 240" width={tamanho} height={tamanho} role="img" aria-label={`Mascote: ${ROTULOS[e]}`}>
          <defs>
            <linearGradient id={`${uid}-corpo`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={C.corpoClaro} />
              <stop offset="1" stopColor={C.corpo} />
            </linearGradient>
          </defs>

          {astronauta && <Astronauta uid={uid} parte="fundo" />}

          {/* braços (atrás do corpo) */}
          <g className="msc-braco-e" style={{ transform: `rotate(${bE}deg)` }}>
            <g className="msc-aceno-e">
              <ellipse cx="40" cy="113" rx="10.5" ry="23" fill={astronauta ? C.traje : C.corpo} stroke={astronauta ? C.trajeLinha : "none"} strokeWidth="2" />
            </g>
          </g>
          <g className="msc-braco-d" style={{ transform: `rotate(${bD}deg)` }}>
            <g className="msc-aceno-d">
              <ellipse cx="160" cy="113" rx="10.5" ry="23" fill={astronauta ? C.traje : C.corpo} stroke={astronauta ? C.trajeLinha : "none"} strokeWidth="2" />
            </g>
          </g>

          {/* pernas */}
          {[["msc-perna-e", 66], ["msc-perna-d", 108]].map(([cls, x]) => (
            <g key={cls} className={cls}>
              <rect x={x} y="188" width="26" height="34" rx="13" fill={astronauta ? C.traje : C.corpoEscuro} stroke={astronauta ? C.trajeLinha : "none"} strokeWidth="2" />
              {astronauta && <rect x={x - 1} y="210" width="28" height="13" rx="6.5" fill={C.trajeLinha} />}
            </g>
          ))}

          {/* caule */}
          <path d="M100 44 Q98 32 100 22" stroke={C.caule} strokeWidth="5" fill="none" strokeLinecap="round" />

          {/* corpo */}
          <path
            d="M100 38 C156 38 171 82 170 130 C169 182 152 206 100 206 C48 206 31 182 30 130 C29 82 44 38 100 38 Z"
            fill={`url(#${uid}-corpo)`}
          />
          <ellipse cx="70" cy="70" rx="15" ry="9" fill="#fff" opacity=".18" transform="rotate(-32 70 70)" />
          {astronauta && <Astronauta uid={uid} parte="traje" />}

          {/* folhas */}
          <g className="msc-folhas">
            <g className="msc-folha-e" style={{ transform: `rotate(${fE}deg)` }}>
              <path d="M100 22 C88 6 66 4 58 14 C68 30 90 30 100 22 Z" fill={C.folha} />
              <path d="M97 21 Q80 16 64 15" stroke={C.folhaVeia} strokeWidth="1.6" fill="none" strokeLinecap="round" />
            </g>
            <g className="msc-folha-d" style={{ transform: `rotate(${fD}deg)` }}>
              <path d="M100 22 C112 2 138 0 146 10 C136 28 112 30 100 22 Z" fill={C.folha} />
              <path d="M103 21 Q122 13 140 11" stroke={C.folhaVeia} strokeWidth="1.6" fill="none" strokeLinecap="round" />
            </g>
          </g>

          {/* rosto */}
          {(() => {
            const b = BOCHECHAS[e] || { rx: 11, ry: 7, op: 0.85 };
            return (
              <g className="msc-bochechas" opacity={b.op}>
                <ellipse cx="65" cy="124" rx={b.rx} ry={b.ry} fill={C.bochecha} />
                <ellipse cx="135" cy="124" rx={b.rx} ry={b.ry} fill={C.bochecha} />
              </g>
            );
          })()}
          <Sobrancelhas e={e} />
          <Olhos e={e} />
          <Boca e={e} falandoAgora={falandoAgora} />

          {astronauta && <Astronauta uid={uid} parte="capacete" />}
          <Extras e={e} />
        </svg>
        <div className="msc-sombra" />
      </div>
        );
        if (e !== "naoEncontrado" || !mostrar404) return palco;
        return (
          <div className="msc-404" aria-label="Erro 404">
            <span className="msc-4" aria-hidden="true">4</span>
            {palco}
            <span className="msc-4" aria-hidden="true">4</span>
          </div>
        );
      })()}
    </div>
  );
}
