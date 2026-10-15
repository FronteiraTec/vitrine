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
 * Roupas: roupa="normal" | "astronauta" | "cientista" | "dev" | "aleatoria".
 *   No modo "aleatoria" a roupa é sorteada uma vez ao montar, com 25% de chance para cada uma.
 *   Para mudar as chances: pesosRoupa={{ normal: 2, astronauta: 1, cientista: 1, dev: 1 }}.
 *
 * Interação: interativo={true} faz os olhos seguirem o cursor, clique dá cócegas,
 *   5 cliques rápidos deixam ele tonto, passar o cursor de um lado pro outro é carinho,
 *   e clicar nele dormindo dá um susto (dispara onAcordar).
 *   Continuar clicando enquanto ele está tonto deixa ele irritado e sacode a tela
 *   (desligue com tremerTela={false}). sacudirTela() também pode ser chamada sozinha.
 *   Easter egg: se ele ficar irritado vestindo o traje de astronauta, pega um foguete pra Lua
 *   e volta mais calmo (desligue com easterEgg={false}).
 * olhar={{x, y}} (-1 a 1) força a direção do olhar. Estados extras para formulários de senha:
 *   tapandoOlhos e espiando.
 *
 * Estados: parado | carregando | sucesso | faltando | naoEncontrado | erro | ajuda
 *          | falando (o texto do balão aparece letra a letra) | dormindo | caminhando
 *          | tapandoOlhos | espiando | irritado
 * useMascote({ dormirApos: 120000 }) faz ele dormir após 2 min sem interação e acordar sozinho.
 */
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  tapandoOlhos: "Pode digitar, não estou olhando!",
  espiando: "Só uma espiadinha…",
  irritado: "Grrr! Assim não dá!",
};

// Reações rápidas disparadas pela interação (clique, carinho…). Duram poucos segundos.
export const REACOES = {
  cocegas: { duracao: 1500, mensagem: "Hihi! Faz cócegas!" },
  tonto: { duracao: 3000, mensagem: "Uou… tá tudo girando!" },
  carinho: { duracao: 2600, mensagem: "Aaah, que carinho bom!" },
  susto: { duracao: 1400, mensagem: "Ah! Eu tava só descansando os olhos…" },
  irritado: { duracao: 2800, mensagem: "Ei! Chega de cutucar!!" },
  // easter egg: irritado + traje de astronauta = viagem pra Lua
  foguete: { duracao: 6000, mensagem: "Chega! Vou pra Lua!!", proxima: "calmo" },
  calmo: { duracao: 2800, mensagem: "Pronto, voltei. Já passou." },
};

/**
 * Sacode a tela inteira (ou o elemento `alvo`) por um instante.
 * Respeita prefers-reduced-motion. Pode ser usada sozinha, ex.: em um erro grave.
 */
export function sacudirTela({ alvo, intensidade = 12, duracao = 700, vinheta = true } = {}) {
  if (typeof document === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const el = alvo || document.body;
  if (el.animate) {
    const passos = 12;
    const quadros = [];
    for (let i = 0; i <= passos; i += 1) {
      const a = i === passos ? 0 : intensidade * (1 - i / passos);
      const lado = i % 2 ? 1 : -1;
      quadros.push({ transform: `translate(${lado * a}px, ${((i * 7) % 3 - 1) * a * 0.45}px) rotate(${-lado * a * 0.06}deg)` });
    }
    el.animate(quadros, { duration: duracao, easing: "linear" });
  }
  if (vinheta) {
    const v = document.createElement("div");
    v.setAttribute("aria-hidden", "true");
    v.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:2147483647;box-shadow:inset 0 0 140px 30px rgba(232,74,74,.45)";
    document.documentElement.appendChild(v);
    const anim = v.animate?.([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0 }], { duration: duracao + 300 });
    if (anim) anim.onfinish = () => v.remove();
    else setTimeout(() => v.remove(), duracao + 300);
  }
}

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
  tapandoOlhos: "Tapando os olhos",
  espiando: "Espiando",
  cocegas: "Rindo de cócegas",
  tonto: "Tonto",
  carinho: "Recebendo carinho",
  susto: "Assustado",
  irritado: "Irritado",
  foguete: "Indo pra Lua",
  calmo: "Calmo",
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
  tapandoOlhos: [-15, 15],
  espiando: [-15, 60],
  cocegas: [-40, 40],
  tonto: [-145, 145],
  carinho: [-112, 112],
  susto: [-20, 20],
  irritado: [-162, 162],
  foguete: [-162, 162],
  calmo: [-120, 120],
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
  tapandoOlhos: [-10, 10],
  espiando: [-4, 4],
  cocegas: [10, -10],
  tonto: [-16, 16],
  carinho: [14, -14],
  susto: [32, -32],
  irritado: [30, -30],
  foguete: [30, -30],
  calmo: [4, -4],
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

function coracao(cx, cy, r) {
  return `M${cx} ${cy + r * 0.9} C${cx - r * 1.6} ${cy - r * 0.2} ${cx - r * 0.9} ${cy - r * 1.3} ${cx} ${cy - r * 0.45} C${cx + r * 0.9} ${cy - r * 1.3} ${cx + r * 1.6} ${cy - r * 0.2} ${cx} ${cy + r * 0.9} Z`;
}

/** Mãos na frente do rosto (tapando os olhos / espiando). */
function Maos({ e, astronauta }) {
  if (e !== "tapandoOlhos" && e !== "espiando") return null;
  const C = CORES;
  const pele = astronauta ? C.traje : "#A4CFB1";
  const linha = astronauta ? C.trajeLinha : C.corpoEscuro;
  const mao = (cx, cy, giro) => (
    <g transform={`rotate(${giro} ${cx} ${cy})`}>
      <ellipse cx={cx} cy={cy} rx="20" ry="16" fill={pele} stroke={linha} strokeWidth="2.6" />
      <path d={`M${cx - 8} ${cy - 14} L${cx - 8} ${cy - 4} M${cx} ${cy - 16} L${cx} ${cy - 5} M${cx + 8} ${cy - 14} L${cx + 8} ${cy - 4}`} stroke={linha} strokeWidth="1.8" strokeLinecap="round" />
    </g>
  );
  return (
    <g className="msc-maos">
      {mao(80, 107, -8)}
      {e === "tapandoOlhos" ? mao(120, 107, 8) : null}
    </g>
  );
}

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
  if (e === "cocegas") {
    return (
      <g {...traco} strokeWidth="4.5" strokeLinejoin="round">
        <path d="M72 101 L87 108 L72 115" />
        <path d="M128 101 L113 108 L128 115" />
      </g>
    );
  }
  if (e === "tonto") {
    const espiral = (cx, cy) =>
      `M${cx} ${cy} a2 2 0 1 1 3 1.5 a4.5 4.5 0 1 1 -7.5 -4 a7 7 0 1 1 11.5 6.5`;
    return (
      <g {...traco} strokeWidth="2.6">
        <path className="msc-espiral" d={espiral(80, 108)} />
        <path className="msc-espiral" d={espiral(120, 108)} />
      </g>
    );
  }
  if (e === "carinho" || e === "calmo") {
    return (
      <g {...traco} strokeWidth="4.5">
        <path d="M72 109 Q80 101 88 109" />
        <path d="M112 109 Q120 101 128 109" />
      </g>
    );
  }
  if (e === "susto") {
    return (
      <g>
        <circle cx="80" cy="106" r="11" fill="#fff" stroke={C.olho} strokeWidth="2.5" />
        <circle cx="120" cy="106" r="11" fill="#fff" stroke={C.olho} strokeWidth="2.5" />
        <circle cx="80" cy="106" r="3.6" fill={C.olho} />
        <circle cx="120" cy="106" r="3.6" fill={C.olho} />
      </g>
    );
  }
  if (e === "irritado") {
    return (
      <g>
        <path d="M71 102 L89 108 Q89 118 80 118 Q71 118 71 109 Z" fill={C.olho} />
        <path d="M129 102 L111 108 Q111 118 120 118 Q129 118 129 109 Z" fill={C.olho} />
        <circle cx="77" cy="111" r="1.8" fill="#fff" />
        <circle cx="117" cy="111" r="1.8" fill="#fff" />
      </g>
    );
  }
  if (e === "espiando") {
    return <Olho cx={121} cy={109} r={8} />;
  }
  if (e === "tapandoOlhos") return null;
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
    <g className={e === "parado" ? "msc-espiar" : e === "faltando" ? "msc-pensar" : ""}>
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
  cocegas: ["M70 93 Q78 86 87 91", "M113 91 Q122 86 130 93"],
  carinho: ["M72 96 Q79 92 86 95", "M114 95 Q121 92 128 96"],
  susto: ["M70 88 Q79 79 88 85", "M112 85 Q121 79 130 88"],
  tapandoOlhos: ["M70 88 L86 84", "M114 84 L130 88"],
  espiando: ["M70 88 L86 84", "M112 90 Q121 83 130 89"],
  irritado: ["M69 91 L90 100", "M110 100 L131 91"],
};

function Sobrancelhas({ e }) {
  const d = SOBRANCELHAS[e];
  if (!d) return null;
  return (
    <g className={`msc-sobrancelhas msc-sobr--${e}`} stroke={CORES.olho} strokeWidth={e === "irritado" ? 5.5 : 3.6} strokeLinecap="round" fill="none">
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
  cocegas: { rx: 13, ry: 8, op: 1 },
  carinho: { rx: 14, ry: 8.5, op: 1 },
  susto: { rx: 9, ry: 5.5, op: 0.5 },
  tapandoOlhos: { rx: 12, ry: 7, op: 1 },
  espiando: { rx: 12, ry: 7, op: 1 },
  irritado: { rx: 14, ry: 8, op: 1 },
};

const CORPO_D = "M100 38 C156 38 171 82 170 130 C169 182 152 206 100 206 C48 206 31 182 30 130 C29 82 44 38 100 38 Z";
const REGIAO_ROUPA = "M14 152 Q100 136 186 152 L186 232 L14 232 Z";

export const ROUPAS = ["normal", "astronauta", "cientista", "dev"];
const PESOS_PADRAO = { normal: 1, astronauta: 1, cientista: 1, dev: 1 };

function sortearRoupa(sorteio, pesos = PESOS_PADRAO) {
  const lista = Object.entries(pesos).filter(([nome, p]) => ROUPAS.includes(nome) && p > 0);
  const total = lista.reduce((t, [, p]) => t + p, 0);
  if (!total) return "normal";
  let acumulado = 0;
  for (const [nome, p] of lista) {
    acumulado += p / total;
    if (sorteio < acumulado) return nome;
  }
  return lista[lista.length - 1][0];
}

// cores de braços, pernas e sapatos em cada roupa
const ESTILO_ROUPA = {
  normal: { braco: ["#7DAA8B", "none"], perna: ["#6A967A", "none"], sapato: null },
  astronauta: { braco: ["#F3F5F7", "#AFB9C2"], perna: ["#F3F5F7", "#AFB9C2"], sapato: ["#AFB9C2", "none"] },
  cientista: { braco: ["#F7F8F6", "#BCC5CC"], perna: ["#6A967A", "none"], sapato: ["#56636D", "none"] },
  dev: { braco: ["#34404C", "none"], perna: ["#3B4F7A", "none"], sapato: ["#F4F6F8", "#AEB6BE"] },
};

const LAB = { jaleco: "#F7F8F6", sombra: "#E3E8EB", linha: "#BCC5CC", alca: "#56636D", lente: "#BFE6F5" };
const DEV = { moletom: "#34404C", gola: "#4A5866", fone: "#2B3540", destaque: "#5B8DEF", terminal: "#8FE3A8", cordao: "#E8ECEF" };

function ClipesRoupa({ uid }) {
  return (
    <defs>
      <clipPath id={`${uid}-corpo-clip`}>
        <path d={CORPO_D} />
      </clipPath>
      <clipPath id={`${uid}-roupa-clip`}>
        <path d={REGIAO_ROUPA} />
      </clipPath>
    </defs>
  );
}

function Cientista({ uid, parte }) {
  if (parte === "traje") {
    return (
      <g>
        <ClipesRoupa uid={uid} />
        <g clipPath={`url(#${uid}-corpo-clip)`}>
          <path d={REGIAO_ROUPA} fill={LAB.jaleco} />
          <path d="M30 192 Q100 216 170 192 L170 232 L30 232 Z" fill={LAB.sombra} />
          {/* gola em V mostrando o corpinho */}
          <path d="M86 143 L100 184 L114 143 Z" fill="#7DAA8B" />
          <path d="M87 143.5 L68 145 L94 171 Z" fill={LAB.sombra} stroke={LAB.linha} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M113 143.5 L132 145 L106 171 Z" fill={LAB.sombra} stroke={LAB.linha} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M14 152 Q100 136 186 152" stroke={LAB.linha} strokeWidth="2" fill="none" />
          <line x1="100" y1="184" x2="100" y2="214" stroke={LAB.linha} strokeWidth="1.6" />
          <circle cx="106" cy="193" r="2.3" fill={LAB.linha} />
          <circle cx="106" cy="204" r="2.3" fill={LAB.linha} />
          {/* bolso com canetas */}
          <rect x="128" y="151" width="5" height="17" rx="2" fill="#5B8DEF" />
          <rect x="135" y="154" width="5" height="15" rx="2" fill="#E86A6A" />
          <rect x="124" y="161" width="22" height="18" rx="3" fill={LAB.jaleco} stroke={LAB.linha} strokeWidth="1.6" />
        </g>
        <g clipPath={`url(#${uid}-roupa-clip)`}>
          <path d={CORPO_D} fill="none" stroke={LAB.linha} strokeWidth="2" />
        </g>
      </g>
    );
  }
  if (parte === "acessorio") {
    // óculos de proteção na testa (descem para os olhos quando ele está "carregando")
    return (
      <g className="msc-oculos-lab">
        <path d="M36 80 Q100 62 164 80" stroke={LAB.alca} strokeWidth="5" fill="none" strokeLinecap="round" />
        <rect x="63" y="59" width="33" height="21" rx="9" fill={LAB.lente} fillOpacity=".5" stroke={LAB.alca} strokeWidth="3" />
        <rect x="104" y="59" width="33" height="21" rx="9" fill={LAB.lente} fillOpacity=".5" stroke={LAB.alca} strokeWidth="3" />
        <path d="M96 68 Q100 64 104 68" stroke={LAB.alca} strokeWidth="3" fill="none" />
        <path d="M69 66 Q72 63 78 63 M110 66 Q113 63 119 63" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".9" />
      </g>
    );
  }
  return null;
}

function Dev({ uid, parte }) {
  if (parte === "traje") {
    return (
      <g>
        <ClipesRoupa uid={uid} />
        <g clipPath={`url(#${uid}-corpo-clip)`}>
          <path d={REGIAO_ROUPA} fill={DEV.moletom} />
          <path d="M14 152 Q100 136 186 152" stroke={DEV.gola} strokeWidth="7" fill="none" />
          <path d="M90 149 L88 171 M110 149 L112 171" stroke={DEV.cordao} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="88" cy="173" r="2.6" fill={DEV.cordao} />
          <circle cx="112" cy="173" r="2.6" fill={DEV.cordao} />
          <text x="100" y="197" textAnchor="middle" fontSize="17" fontWeight="700" fontFamily="ui-monospace, Menlo, Consolas, monospace" fill={DEV.terminal}>
            {"</>"}
          </text>
        </g>
      </g>
    );
  }
  if (parte === "acessorio") {
    return (
      <g>
        {/* óculos redondos */}
        <g stroke={DEV.fone} strokeWidth="3" strokeLinecap="round">
          <circle cx="80" cy="108" r="14" fill="#fff" fillOpacity=".12" />
          <circle cx="120" cy="108" r="14" fill="#fff" fillOpacity=".12" />
          <path d="M94 106 Q100 101 106 106 M66 105 L42 102 M134 105 L158 102" fill="none" />
        </g>
        {/* fones de ouvido */}
        <path d="M32 112 C24 14 176 14 168 112" stroke={DEV.fone} strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M44 66 C56 30 144 30 156 66" stroke="#56636E" strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx="30" cy="114" rx="11" ry="18" fill={DEV.fone} />
        <ellipse cx="33" cy="114" rx="6" ry="12" fill={DEV.destaque} />
        <ellipse cx="170" cy="114" rx="11" ry="18" fill={DEV.fone} />
        <ellipse cx="167" cy="114" rx="6" ry="12" fill={DEV.destaque} />
      </g>
    );
  }
  return null;
}

function Roupa({ roupa, uid, parte }) {
  if (roupa === "astronauta") return <Astronauta uid={uid} parte={parte === "acessorio" ? "capacete" : parte} />;
  if (roupa === "cientista") return <Cientista uid={uid} parte={parte} />;
  if (roupa === "dev") return <Dev uid={uid} parte={parte} />;
  return null;
}

/** Detalhes que só aparecem com certas roupas em certos estados. */
function ExtrasRoupa({ roupa, e }) {
  if (roupa === "dev" && ["parado", "caminhando", "calmo"].includes(e)) {
    // música saindo do fone
    return (
      <g fill={DEV.destaque} fontFamily="system-ui, sans-serif" fontWeight="700">
        <text className="msc-nota" x="178" y="96" fontSize="17">♪</text>
        <text className="msc-nota msc-nota-2" x="186" y="104" fontSize="14">♫</text>
      </g>
    );
  }
  if (roupa === "dev" && e === "erro") {
    // um bug passeando na testa
    return (
      <g className="msc-bug" style={{ transform: "translate(66px, 62px)" }}>
        <g className="msc-bug-vira">
          <path className="msc-bug-pernas" d="M-4 -4 L-7 -8 M-4 4 L-7 8 M1 -5 L1 -9 M1 5 L1 9 M5 -4 L8 -8 M5 4 L8 8" stroke="#3A2A2A" strokeWidth="1.5" strokeLinecap="round" />
          <ellipse cx="0" cy="0" rx="8" ry="5.5" fill="#D9473F" />
          <line x1="-7" y1="0" x2="6" y2="0" stroke="#8E2A24" strokeWidth="1.2" />
          <circle cx="-3" cy="-2.4" r="1.3" fill="#3A2A2A" />
          <circle cx="2" cy="2.4" r="1.3" fill="#3A2A2A" />
          <circle cx="8.5" cy="0" r="3.4" fill="#3A2A2A" />
          <path d="M10.5 -1.5 L14 -5 M10.5 1.5 L14 5" stroke="#3A2A2A" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      </g>
    );
  }
  if (roupa === "cientista" && e === "erro") {
    // experimento explodiu: fuligem no rosto e fumacinha
    return (
      <g>
        <g fill="#4A4F55" opacity=".32">
          <ellipse cx="58" cy="98" rx="9" ry="5" transform="rotate(-15 58 98)" />
          <ellipse cx="146" cy="140" rx="8" ry="4.5" />
          <ellipse cx="128" cy="92" rx="5" ry="3" />
        </g>
        <g fill="#9AA3AA" stroke="#C3CAD0" strokeWidth="1">
          {[[86, 24, 0], [114, 18, 0.45], [100, 8, 0.9]].map(([x, y, d]) => (
            <g key={x} className="msc-vapor" style={{ animationDelay: `${d}s` }}>
              <circle cx={x} cy={y} r="7" />
              <circle cx={x - 6} cy={y + 4} r="5" />
              <circle cx={x + 6} cy={y + 4} r="5.5" />
            </g>
          ))}
        </g>
      </g>
    );
  }
  return null;
}

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
    case "cocegas":
      return (
        <g>
          <path d="M82 119 Q100 150 118 119 Z" fill={C.olho} strokeLinejoin="round" />
          <ellipse cx="100" cy="131" rx="7" ry="3.6" fill={C.lingua} />
        </g>
      );
    case "tonto":
      return <path d="M86 130 Q90 124 94 130 Q98 136 102 130 Q106 124 110 130 Q112 133 114 131" {...traco} strokeWidth="3.5" />;
    case "carinho":
      return <path d="M90 124 Q95 130 100 125 Q105 130 110 124" {...traco} />;
    case "susto":
      return <ellipse cx="100" cy="131" rx="6" ry="7.5" fill={C.olho} />;
    case "calmo":
      return <path d="M92 124 Q100 131 108 124" {...traco} />;
    case "irritado":
      return (
        <g>
          <rect x="85" y="123" width="30" height="14" rx="5" fill="#fff" stroke={C.olho} strokeWidth="3" />
          <path d="M85 130 L115 130 M92.5 123 L92.5 137 M100 123 L100 137 M107.5 123 L107.5 137" stroke={C.olho} strokeWidth="1.8" />
        </g>
      );
    case "tapandoOlhos":
      return <path d="M91 131 Q100 126 109 131" {...traco} />;
    case "espiando":
      return <ellipse cx="102" cy="131" rx="4" ry="4.5" fill={C.olho} />;
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
  if (e === "irritado") {
    const vapor = (x, y, d) => (
      <g key={x + "-" + y} className="msc-vapor" style={{ animationDelay: `${d}s` }}>
        <circle cx={x} cy={y} r="8" />
        <circle cx={x - 7} cy={y + 5} r="6" />
        <circle cx={x + 7} cy={y + 4} r="6.5" />
      </g>
    );
    return (
      <g>
        <g fill="#fff" stroke="#C9D3D8" strokeWidth="1.5">
          {vapor(36, 44, 0)}
          {vapor(164, 42, 0.35)}
          {vapor(28, 64, 0.7)}
        </g>
        <g transform="translate(150 70)">
          <path
            className="msc-veia"
            d="M-9 -3 Q-3 -3 -3 -9 M3 -9 Q3 -3 9 -3 M9 3 Q3 3 3 9 M-3 9 Q-3 3 -9 3"
            stroke="#E84A4A"
            strokeWidth="3.4"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      </g>
    );
  }
  if (e === "carinho") {
    return (
      <g>
        {[[156, 66, 0, 1.2], [42, 60, 0.5, 1], [176, 36, 1, 0.8]].map(([x, y, d, esc]) => (
          <path
            key={x}
            className="msc-coracao"
            d={coracao(x, y, 9 * esc)}
            fill="#F07A8E"
            style={{ animationDelay: `${d}s` }}
          />
        ))}
      </g>
    );
  }
  if (e === "tonto") {
    return (
      // órbita achatada (elipse) com as estrelas contra-girando para não deformar
      <g transform="translate(100 24) scale(1 .42) translate(-100 -24)">
        <g className="msc-orbita">
          <circle cx="100" cy="24" r="56" fill="none" />
          {[0, 120, 240].map((a) => {
            const rad = (a * Math.PI) / 180;
            return (
              <path
                key={a}
                className="msc-orbita-estrela"
                d={estrela(100 + 48 * Math.cos(rad), 24 + 48 * Math.sin(rad), 8)}
                fill={C.estrela}
                stroke="#D9A82E"
                strokeWidth="1"
              />
            );
          })}
        </g>
      </g>
    );
  }
  if (e === "susto") {
    return (
      <g>
        <text className="msc-exclama" x="160" y="44" fontSize="40" fontWeight="900" fill="#E86A6A" fontFamily="system-ui, sans-serif">!</text>
        <g className="msc-arrepio" stroke={C.corpoEscuro} strokeWidth="3" strokeLinecap="round">
          <path d="M26 66 L16 58" />
          <path d="M22 84 L10 82" />
          <path d="M150 62 L160 56" />
        </g>
      </g>
    );
  }
  if (e === "cocegas") {
    return (
      <g fill={C.olho} fontFamily="system-ui, sans-serif" fontWeight="900">
        <g transform="rotate(14 166 66)">
          <text className="msc-hi" x="166" y="66" fontSize="22">hi</text>
        </g>
        <g transform="rotate(-16 -14 60)">
          <text className="msc-hi msc-hi-2" x="-14" y="60" fontSize="19">hi</text>
        </g>
      </g>
    );
  }
  if (e === "dormindo") {
    return (
      <g fill={C.corpoEscuro} fontFamily="system-ui, sans-serif" fontWeight="800">
        {[[14, 0], [19, 1], [25, 2]].map(([t, d]) => (
          <text key={t} className="msc-z" x="140" y="70" fontSize={t} style={{ animationDelay: `${d}s` }}>z</text>
        ))}
      </g>
    );
  }
  if (e === "naoEncontrado") {
    return (
      <g className="msc-borboleta" style={{ transform: "translate(178px, 16px)" }}>
       <g className="msc-borboleta-giro">
       <g className="msc-borboleta-bob">
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
  if (e === "carregando") {
    return (
      <g fill={C.corpoEscuro}>
        {[0, 1, 2].map((i) => (
          <circle key={i} className="msc-ponto" cx={178 + i * 13} cy="150" r="4.5" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </g>
    );
  }
  if (e === "caminhando") {
    return (
      <g fill="#C3D3C7">
        <g className="msc-poeira msc-poeira-e">
          <circle cx="64" cy="221" r="5.5" />
          <circle cx="55" cy="218" r="3.8" />
        </g>
        <g className="msc-poeira msc-poeira-d">
          <circle cx="136" cy="221" r="5.5" />
          <circle cx="145" cy="218" r="3.8" />
        </g>
      </g>
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
.msc-palco{display:flex;flex-direction:column;align-items:center;transform-origin:50% 100%}
.msc-svg{display:block;overflow:visible;transform-origin:50% 92%}
.msc-svg *{transform-box:view-box}
.msc-camada{transform-origin:100px 222px}
.msc-sombra{width:calc(var(--msc-tam)*.42);height:calc(var(--msc-tam)*.05);margin-top:calc(var(--msc-tam)*-.085);border-radius:50%;background:var(--mascote-sombra,rgba(30,50,38,.18));transform-origin:center}
.msc-balao{position:relative;max-width:min(300px,86vw);padding:10px 14px;border-radius:16px;background:var(--mascote-balao-fundo,#fff);color:var(--mascote-balao-texto,#1e2a22);border:1.5px solid var(--mascote-balao-borda,#cfe0d4);box-shadow:0 6px 18px rgba(30,50,38,.10);font-size:14px;line-height:1.45;transform-origin:50% 100%;animation:msc-balao .45s cubic-bezier(.34,1.56,.64,1) both}
.msc-balao::after{content:"";position:absolute;left:50%;bottom:-8px;width:13px;height:13px;background:inherit;border-right:inherit;border-bottom:inherit;transform:translateX(-50%) rotate(45deg)}
.msc-balao-texto{margin:0}
.msc-balao-extra{margin-top:10px}

/* entrada de estado: corpo dá um "boing" e o rosto salta para a nova expressão */
.msc-pop{animation:msc-pop .55s both}
.msc-rosto{transform-origin:100px 114px;animation:msc-rosto .34s cubic-bezier(.34,1.7,.6,1) both}

/* poses: braços e folhas mudam com mola, um pouco defasados entre si */
.msc-braco-d,.msc-aceno-d{transform-origin:160px 138px}
.msc-braco-e,.msc-aceno-e{transform-origin:40px 138px}
.msc-braco-e{transition:transform .5s cubic-bezier(.34,1.56,.64,1)}
.msc-braco-d{transition:transform .5s cubic-bezier(.34,1.56,.64,1) .05s}
.msc-folhas,.msc-folha-e,.msc-folha-d,.msc-folha-e-mov,.msc-folha-d-mov{transform-origin:100px 22px}
.msc-folha-e{transition:transform .65s cubic-bezier(.34,1.9,.6,1)}
.msc-folha-d{transition:transform .65s cubic-bezier(.34,1.9,.6,1) .06s}
.msc-perna-e{transform-origin:79px 192px}
.msc-perna-d{transform-origin:121px 192px}

/* olhos */
.msc-piscar{transform-origin:100px 106px;animation:msc-piscar 6.2s infinite}
.msc-espiar{animation:msc-espiar 7s ease-in-out infinite}
.msc-seguindo .msc-espiar{animation:none}
.msc-olhar-cursor{transition:transform .25s cubic-bezier(.2,.8,.3,1)}
.msc-sobr--faltando{animation:msc-sobr 1.3s ease-in-out infinite alternate}

/* interativo */
.msc-interativo .msc-svg{cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:pan-y}
.msc-interativo .msc-svg:hover{filter:brightness(1.04)}
.msc-interativo .msc-svg:focus:not(:focus-visible){outline:none}
.msc-interativo .msc-svg:focus-visible{outline:3px solid var(--mascote-foco,#2E6A48);outline-offset:4px;border-radius:24px}

/* ---- parado: respira e muda o peso de lado; folhas acompanham com atraso ---- */
.msc--parado .msc-svg{animation:msc-respira 6.4s ease-in-out infinite}
.msc--parado .msc-folhas{animation:msc-folhas-idle 6.4s ease-in-out infinite}
.msc--parado .msc-folha-e-mov{animation:msc-tremula 2.3s ease-in-out infinite}
.msc--parado .msc-folha-d-mov{animation:msc-tremula 2.9s ease-in-out infinite reverse}
.msc-astro.msc--parado .msc-svg,.msc-astro.msc--calmo .msc-svg{transform-origin:50% 55%;animation:msc-gravidade 6s ease-in-out infinite}
.msc-astro.msc--parado .msc-sombra,.msc-astro.msc--calmo .msc-sombra{animation:msc-sombra-flutua 6s ease-in-out infinite}
.msc-astro.msc--parado .msc-folhas{animation:msc-folhas-idle 9s ease-in-out infinite}
.msc-antena{transform-box:fill-box;transform-origin:center;animation:msc-antena 1.6s ease-in-out infinite}
.msc-led{animation:msc-tracos .9s steps(2) infinite}

/* ---- sucesso: antecipação, salto, flutua no topo, aterrissa amassando ---- */
.msc--sucesso .msc-svg{animation:msc-pulo 1.3s infinite}
.msc--sucesso .msc-sombra{animation:msc-sombra-pulo 1.3s infinite}
.msc--sucesso .msc-folha-e-mov{animation:msc-folha-pulo-e 1.3s ease-in-out infinite}
.msc--sucesso .msc-folha-d-mov{animation:msc-folha-pulo-d 1.3s ease-in-out infinite}
.msc--sucesso .msc-aceno-e{animation:msc-braco-pulo-e 1.3s ease-in-out infinite}
.msc--sucesso .msc-aceno-d{animation:msc-braco-pulo-d 1.3s ease-in-out infinite}
.msc-sobr--sucesso{animation:msc-sobr-pulo 1.3s ease-in-out infinite}
.msc--sucesso .msc-bochechas,.msc--naoEncontrado .msc-bochechas{animation:msc-corar 1.3s ease-in-out infinite alternate}
.msc-estrela{transform-box:fill-box;transform-origin:center;animation:msc-cintila 1.2s ease-in-out infinite}
.msc-confete{opacity:0;transform-box:fill-box;transform-origin:center;animation:msc-confete 1.5s .1s 1}

/* ---- erro: susto, tremedeira e depois suspiros desanimados ---- */
.msc--erro .msc-svg{animation:msc-choque .8s cubic-bezier(.3,0,.3,1),msc-suspiro 3.6s ease-in-out .8s infinite}
.msc--erro .msc-sombra{animation:msc-sombra-choque .8s cubic-bezier(.3,0,.3,1)}
.msc--erro .msc-folha-e-mov{animation:msc-folha-choque-e .8s ease-out,msc-folha-suspiro-e 3.6s ease-in-out .8s infinite}
.msc--erro .msc-folha-d-mov{animation:msc-folha-choque-d .8s ease-out,msc-folha-suspiro-d 3.6s ease-in-out .8s infinite}
.msc--erro .msc-aceno-e{animation:msc-braco-suspiro-e 3.6s ease-in-out .8s infinite}
.msc--erro .msc-aceno-d{animation:msc-braco-suspiro-d 3.6s ease-in-out .8s infinite}
.msc-lagrima{transform-box:fill-box;transform-origin:50% 0;animation:msc-lagrima 1.5s cubic-bezier(.55,0,1,.45) infinite}
.msc-lagrima-2{animation-delay:.75s}
.msc-gota{transform-box:fill-box;transform-origin:50% 0;animation:msc-gota 2s cubic-bezier(.55,0,1,.45) infinite}

/* ---- faltou informação: inclina a cabeça de um lado pro outro, olhando pra cima ---- */
.msc--faltando .msc-svg{animation:msc-inclinar 3.4s ease-in-out infinite}
.msc--faltando .msc-folhas{animation:msc-folhas-inclinar 3.4s ease-in-out infinite}
.msc--faltando .msc-aceno-e{animation:msc-ombro-e 3.4s ease-in-out infinite}
.msc--faltando .msc-aceno-d{animation:msc-ombro-d 3.4s ease-in-out infinite}
.msc-pensar{animation:msc-pensar 3.4s ease-in-out infinite}
.msc-interroga{transform-box:fill-box;transform-origin:50% 100%;animation:msc-surgir .45s cubic-bezier(.34,1.8,.6,1) both,msc-interroga 1.7s ease-in-out .45s infinite}

/* ---- 404: tudo sincronizado com o voo da borboleta (oito no ar) ---- */
.msc--naoEncontrado .msc-svg{animation:msc-inclina-voo 6s linear infinite}
.msc--naoEncontrado .msc-folhas{animation:msc-folhas-idle 3.2s ease-in-out infinite}
.msc--naoEncontrado .msc-aceno-d{animation:msc-alcanca-d 6s linear infinite}
.msc--naoEncontrado .msc-aceno-e{animation:msc-alcanca-e 6s linear infinite}
.msc-segue{animation:msc-segue 6s linear infinite}
.msc-borboleta{animation:msc-voo 6s linear infinite}
.msc-borboleta-giro{transform-box:fill-box;transform-origin:center;animation:msc-borboleta-giro 6s linear infinite}
.msc-borboleta-bob{transform-box:fill-box;transform-origin:center;animation:msc-borboleta-bob .5s ease-in-out infinite alternate}
.msc-asas{transform-box:fill-box;transform-origin:center;animation:msc-bater .24s ease-in-out infinite}
.msc-404{display:flex;align-items:center;justify-content:center;gap:2px;max-width:100%}
.msc-4{font-family:var(--mascote-fonte-404,"Fredoka","Baloo 2","Arial Rounded MT Bold",system-ui,sans-serif);font-weight:800;line-height:1;font-size:min(calc(var(--msc-tam)*.78),24vw);color:var(--mascote-404,#6A967A);margin-bottom:calc(var(--msc-tam)*.06);margin-inline:calc(var(--msc-tam)*-.07);user-select:none;display:inline-block;animation:msc-4 2.6s ease-in-out infinite}
.msc-404>.msc-4:last-child{animation-delay:-1.3s}
.msc-404 .msc-svg{width:min(var(--msc-tam),40vw);height:auto}

/* ---- carregando: hélice acelera, ele paira e se equilibra ---- */
.msc--carregando .msc-svg{animation:msc-flutuar 1.3s ease-in-out infinite alternate}
.msc--carregando .msc-sombra{animation:msc-sombra-flutuar 1.3s ease-in-out infinite alternate}
.msc--carregando .msc-folhas{animation:msc-gira-acelera .7s cubic-bezier(.5,0,1,1),msc-gira .42s linear .7s infinite}
.msc--carregando .msc-aceno-e{animation:msc-equilibrio 1.3s ease-in-out infinite alternate}
.msc--carregando .msc-aceno-d{animation:msc-equilibrio 1.3s ease-in-out infinite alternate-reverse}
.msc-ponto{transform-box:fill-box;transform-origin:center;animation:msc-ponto 1s ease-in-out infinite}

/* ---- ajuda: tchau-tchau-tchau e pausa, o corpo acompanha ---- */
.msc--ajuda .msc-svg{animation:msc-acena-corpo 2.4s ease-in-out infinite}
.msc--ajuda .msc-aceno-d{animation:msc-acenar 2.4s ease-in-out infinite}
.msc--ajuda .msc-folhas{animation:msc-folhas-idle 2.4s ease-in-out infinite}
.msc-tracos{animation:msc-tracos-aceno 2.4s ease-in-out infinite}

/* ---- falando ---- */
.msc--falando .msc-svg{animation:msc-respira 6.4s ease-in-out infinite}
.msc--falando .msc-folhas{animation:msc-folhas-idle 3.2s ease-in-out infinite}
.msc-tagarela .msc-svg{animation:msc-fala-corpo 1.1s ease-in-out infinite}
.msc-tagarela .msc-aceno-d{animation:msc-gesto 1.7s ease-in-out infinite}
.msc-tagarela .msc-sobrancelhas{animation:msc-sobr-fala .9s ease-in-out infinite}
.msc-boca-fala{transform-origin:100px 122px;animation:msc-falar .52s ease-in-out infinite}

/* ---- dormindo: respiração funda, cochilo de vez em quando ---- */
.msc--dormindo .msc-svg{animation:msc-dormir 4.2s ease-in-out infinite}
.msc--dormindo .msc-camada{animation:msc-cochilo 12.6s ease-in-out infinite}
.msc--dormindo .msc-folhas{animation:msc-folhas-sono 4.2s ease-in-out infinite}
.msc-bolha{transform-box:fill-box;transform-origin:left center;animation:msc-bolha 4.2s ease-in-out infinite}
.msc-z{opacity:0;transform-box:fill-box;transform-origin:center;animation:msc-z 3s ease-out infinite}

/* ---- caminhando: ciclo de passo com subida/descida, poeira no contato ---- */
.msc--caminhando .msc-svg{animation:msc-andar .64s infinite}
.msc--caminhando .msc-sombra{animation:msc-sombra-anda .32s ease-in-out infinite alternate}
.msc--caminhando .msc-perna-e{animation:msc-passo .64s infinite}
.msc--caminhando .msc-perna-d{animation:msc-passo .64s infinite -.32s}
.msc--caminhando .msc-aceno-e{animation:msc-braco-anda .64s ease-in-out infinite}
.msc--caminhando .msc-aceno-d{animation:msc-braco-anda .64s ease-in-out infinite -.32s}
.msc--caminhando .msc-folhas{animation:msc-folhas-anda .64s ease-in-out infinite -.54s}
.msc--caminhando .msc-folha-e-mov{animation:msc-folha-quica-e .32s ease-in-out infinite -.27s}
.msc--caminhando .msc-folha-d-mov{animation:msc-folha-quica-d .32s ease-in-out infinite -.27s}
.msc-poeira{opacity:0;transform-box:fill-box;transform-origin:50% 100%}
.msc-poeira-e{animation:msc-poeira-e .64s ease-out infinite -.34s}
.msc-poeira-d{animation:msc-poeira-d .64s ease-out infinite -.02s}

/* ---- cócegas: pulinhos de risada ---- */
.msc--cocegas .msc-svg{animation:msc-cocegas .5s infinite}
.msc--cocegas .msc-sombra{animation:msc-sombra-cocegas .25s ease-in-out infinite alternate}
.msc--cocegas .msc-aceno-e{animation:msc-agita .18s ease-in-out infinite alternate}
.msc--cocegas .msc-aceno-d{animation:msc-agita .18s ease-in-out infinite alternate-reverse}
.msc--cocegas .msc-folha-e-mov{animation:msc-folha-quica-e .25s ease-in-out infinite}
.msc--cocegas .msc-folha-d-mov{animation:msc-folha-quica-d .25s ease-in-out infinite}
.msc-hi{transform-box:fill-box;transform-origin:center;animation:msc-hi .5s ease-out infinite}
.msc-hi-2{animation-delay:-.25s}

/* ---- tonto: corpo gira em círculo, estrelas em órbita ---- */
.msc--tonto .msc-svg{animation:msc-tonto 1.2s linear infinite}
.msc--tonto .msc-sombra{animation:msc-sombra-tonto 1.2s linear infinite}
.msc--tonto .msc-aceno-e,.msc--tonto .msc-aceno-d{animation:msc-mole 1.2s ease-in-out infinite}
.msc--tonto .msc-folhas{animation:msc-folhas-tonto 1.2s ease-in-out infinite}
.msc-espiral{transform-box:fill-box;transform-origin:center;animation:msc-gira .9s linear infinite}
.msc-orbita{transform-box:fill-box;transform-origin:center;animation:msc-gira 1.6s linear infinite}
.msc-orbita-estrela{transform-box:fill-box;transform-origin:center;animation:msc-contra 1.6s linear infinite}

/* ---- carinho ---- */
.msc--carinho .msc-svg{animation:msc-carinho 1.6s ease-in-out infinite}
.msc--carinho .msc-folha-e-mov{animation:msc-folha-quica-e .4s ease-in-out infinite}
.msc--carinho .msc-folha-d-mov{animation:msc-folha-quica-d .4s ease-in-out infinite}
.msc--carinho .msc-aceno-e{animation:msc-mole 1.6s ease-in-out infinite}
.msc--carinho .msc-aceno-d{animation:msc-mole 1.6s ease-in-out infinite reverse}
.msc-coracao{opacity:0;transform-box:fill-box;transform-origin:center;animation:msc-coracao 1.8s ease-out infinite}

/* ---- susto ---- */
.msc--susto .msc-svg{animation:msc-susto .9s both}
.msc--susto .msc-sombra{animation:msc-sombra-susto .9s both}
.msc--susto .msc-aceno-e{animation:msc-agita .1s linear infinite alternate}
.msc--susto .msc-aceno-d{animation:msc-agita .1s linear infinite alternate-reverse}
.msc-exclama{transform-box:fill-box;transform-origin:50% 100%;animation:msc-surgir .35s cubic-bezier(.34,2,.6,1) both}
.msc-arrepio{animation:msc-tracos .12s ease-in-out 6 alternate}

/* ---- tapando os olhos / espiando ---- */
.msc--tapandoOlhos .msc-svg{animation:msc-timido 2.2s ease-in-out infinite}
.msc--tapandoOlhos .msc-folha-e-mov,.msc--espiando .msc-folha-e-mov{animation:msc-tremula 1.1s ease-in-out infinite}
.msc--tapandoOlhos .msc-folha-d-mov,.msc--espiando .msc-folha-d-mov{animation:msc-tremula 1.1s ease-in-out infinite reverse}
.msc--espiando .msc-svg{animation:msc-espiada .45s cubic-bezier(.34,1.56,.64,1) both}
.msc-maos{transform-origin:100px 150px;animation:msc-maos .42s cubic-bezier(.34,1.6,.6,1) both}

/* ---- irritado ---- */
.msc--irritado .msc-svg{animation:msc-raiva .08s linear infinite alternate}
.msc--irritado .msc-camada{animation:msc-bufar .36s ease-in-out infinite}
.msc--irritado .msc-folhas{animation:msc-raiva-folha .1s linear infinite alternate}
.msc--irritado .msc-aceno-e{animation:msc-treme-braco .08s linear infinite alternate}
.msc--irritado .msc-aceno-d{animation:msc-treme-braco .08s linear infinite alternate-reverse}
.msc--irritado .msc-perna-e{animation:msc-pisar .36s infinite}
.msc--irritado .msc-perna-d{animation:msc-pisar .36s infinite -.18s}
.msc--irritado .msc-sombra{animation:msc-sombra-raiva .18s ease-in-out infinite alternate}
.msc-vermelho{opacity:.8;animation:msc-pulso-vermelho .36s ease-in-out infinite}
.msc-vapor{opacity:0;transform-box:fill-box;transform-origin:center;animation:msc-vapor 1.1s ease-out infinite}
.msc-veia{transform-box:fill-box;transform-origin:center;animation:msc-veia .36s ease-in-out infinite}

/* ---- calmo: volta da Lua descendo devagar ---- */
.msc--calmo .msc-svg{animation:msc-respira 6.4s ease-in-out infinite}
.msc--calmo .msc-palco{animation:msc-volta 1.4s both}
.msc-ausente .msc-palco{visibility:hidden}

/* ---- viagem pra Lua ---- */
.msc-ceu{position:fixed;inset:0;z-index:2147483000;pointer-events:none;opacity:0;overflow:hidden;
  background:radial-gradient(120% 90% at 85% 0%,rgba(46,58,110,.94),rgba(10,15,36,.96))}
.msc-fumacas{position:fixed;inset:0;z-index:2147483000;pointer-events:none;overflow:hidden}
.msc-fumaca{position:absolute;border-radius:50%;box-shadow:0 0 6px rgba(255,255,255,.4)}
.msc-ceu-estrela{position:absolute;border-radius:50%;background:#fff;animation:msc-cintila 1.8s ease-in-out infinite}
.msc-lua{position:absolute;top:calc(env(safe-area-inset-top,0px) + 48px);right:calc(env(safe-area-inset-right,0px) + 48px);
  width:min(120px,24vw);aspect-ratio:1;border-radius:50%;
  background:radial-gradient(circle at 35% 35%,#FFFBE6,#EADFB2 70%,#D8CB98);animation:msc-lua-brilho 2.6s ease-in-out infinite alternate}
.msc-cratera{position:absolute;border-radius:50%;background:rgba(170,155,105,.35);box-shadow:inset 2px 2px 3px rgba(120,105,70,.35)}
.msc-bandeira{position:absolute;width:34%;left:52%;top:-30%;transform-origin:bottom left;animation:msc-bandeira .55s cubic-bezier(.34,1.8,.6,1) both}
.msc-bandeira-pano{transform-box:fill-box;transform-origin:left center;animation:msc-tremular .45s ease-in-out .5s infinite alternate}
.msc-legenda-lua{position:absolute;top:calc(env(safe-area-inset-top,0px) + 48px + min(120px,24vw) + 18px);right:calc(env(safe-area-inset-right,0px) + 24px);
  margin:0;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.12);color:#F3F1E4;font:600 14px/1.3 system-ui,sans-serif;
  transform-origin:100% 0;animation:msc-balao .45s cubic-bezier(.34,1.56,.64,1) .15s both}
.msc-viagem{position:fixed;z-index:2147483001;pointer-events:none;transform-origin:50% 60%}
.msc-viagem .msc-sombra{display:none}
.msc-viagem .msc-svg{animation:none!important}
.msc-foguete{position:absolute;left:2%;top:64%;width:96%;overflow:visible;animation:msc-foguete-entra .5s cubic-bezier(.34,1.56,.64,1) both}
.msc-chama{transform-box:fill-box;transform-origin:right center;animation:msc-chama .08s linear infinite alternate}
.msc-fase-voo .msc-chama{animation:msc-chama-forte .06s linear infinite alternate}

/* ---- roupas ---- */
.msc-oculos-lab{transition:transform .45s cubic-bezier(.34,1.56,.64,1)}
.msc-roupa-cientista.msc--carregando .msc-oculos-lab{transform:translateY(38px)}
.msc-roupa-dev.msc--parado .msc-svg{animation:msc-curtir 1.2s ease-in-out infinite}
.msc-roupa-dev.msc--parado .msc-folhas{animation:msc-folhas-anda 1.2s ease-in-out infinite -1s}
.msc-nota{opacity:0;transform-box:fill-box;transform-origin:center;animation:msc-nota 2.4s ease-out infinite}
.msc-nota-2{animation-delay:1.2s}
.msc-bug{animation:msc-bug-anda 3.4s ease-in-out infinite}
.msc-bug-vira{transform-box:fill-box;transform-origin:center;animation:msc-bug-vira 3.4s linear infinite}
.msc-bug-pernas{transform-box:fill-box;transform-origin:center;animation:msc-bug-pernas .14s linear infinite alternate}

/* ===================== keyframes ===================== */
@keyframes msc-curtir{0%,50%,100%{transform:translateY(0) scale(1.015,.985) rotate(0deg)}25%{transform:translateY(-1%) scale(1,1) rotate(-2deg)}75%{transform:translateY(-1%) scale(1,1) rotate(2deg)}}
@keyframes msc-nota{0%{transform:translate(0,6px) scale(.5) rotate(0deg);opacity:0}20%{transform:translate(3px,-2px) scale(1) rotate(-10deg);opacity:1}60%{transform:translate(-3px,-16px) scale(1) rotate(10deg);opacity:.9}100%{transform:translate(4px,-30px) scale(.9) rotate(-6deg);opacity:0}}
@keyframes msc-bug-anda{0%,4%{transform:translate(66px,62px)}46%,54%{transform:translate(134px,62px)}96%,100%{transform:translate(66px,62px)}}
@keyframes msc-bug-vira{0%,46%{transform:scaleX(1)}50%,96%{transform:scaleX(-1)}100%{transform:scaleX(1)}}
@keyframes msc-bug-pernas{from{transform:scaleY(.75)}to{transform:scaleY(1.05)}}
@keyframes msc-balao{0%{opacity:0;transform:translateY(10px) scale(.7) rotate(-3deg)}60%{opacity:1}100%{opacity:1;transform:translateY(0) scale(1) rotate(0deg)}}
@keyframes msc-pop{
  0%{transform:translateY(0) scale(1,1);animation-timing-function:cubic-bezier(.3,0,.5,1)}
  18%{transform:translateY(0) scale(1.12,.86);animation-timing-function:cubic-bezier(.2,.7,.4,1)}
  45%{transform:translateY(-4%) scale(.93,1.09);animation-timing-function:cubic-bezier(.5,0,.6,1)}
  70%{transform:translateY(0) scale(1.04,.97)}
  100%{transform:translateY(0) scale(1,1)}}
@keyframes msc-rosto{from{transform:scale(.7,.45)}to{transform:scale(1,1)}}
@keyframes msc-piscar{0%,35%,39.5%,87%,90.5%,92%,95.5%,100%{transform:scaleY(1)}37%,88.8%,93.8%{transform:scaleY(.08)}}
@keyframes msc-espiar{0%,30%,100%{transform:translate(0,0)}38%,52%{transform:translate(-4px,0)}60%,74%{transform:translate(4px,-1px)}}
@keyframes msc-sobr{from{transform:translateY(0)}to{transform:translateY(-3px)}}
@keyframes msc-respira{0%,50%,100%{transform:translateY(0) scale(1,1) rotate(0deg)}25%{transform:translateY(-.6%) scale(.985,1.022) rotate(-.8deg)}75%{transform:translateY(-.6%) scale(.985,1.022) rotate(.8deg)}}
@keyframes msc-folhas-idle{0%,100%{transform:rotate(0deg)}32%{transform:rotate(4deg)}57%{transform:rotate(0deg)}82%{transform:rotate(-4deg)}}
@keyframes msc-tremula{0%,100%{transform:rotate(0deg)}50%{transform:rotate(4deg)}}
@keyframes msc-gravidade{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-8%) rotate(5deg)}}
@keyframes msc-sombra-flutua{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.68);opacity:.55}}
@keyframes msc-antena{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.7);opacity:.45}}
@keyframes msc-tracos{from{opacity:.25}to{opacity:1}}

@keyframes msc-pulo{
  0%{transform:translateY(0) scale(1,1) rotate(0deg);animation-timing-function:cubic-bezier(.4,0,.6,1)}
  12%{transform:translateY(0) scale(1.16,.82) rotate(0deg);animation-timing-function:cubic-bezier(.2,.8,.4,1)}
  22%{transform:translateY(-13%) scale(.86,1.16) rotate(-2deg);animation-timing-function:cubic-bezier(.2,.6,.4,1)}
  40%{transform:translateY(-27%) scale(.98,1.03) rotate(-5deg);animation-timing-function:ease-in-out}
  48%{transform:translateY(-27%) scale(1,1) rotate(4deg);animation-timing-function:cubic-bezier(.6,0,1,.6)}
  62%{transform:translateY(0) scale(.9,1.12) rotate(1deg);animation-timing-function:linear}
  67%{transform:translateY(0) scale(1.18,.8) rotate(0deg);animation-timing-function:cubic-bezier(.3,1.5,.5,1)}
  82%{transform:translateY(0) scale(.97,1.04) rotate(0deg);animation-timing-function:ease-in-out}
  100%{transform:translateY(0) scale(1,1) rotate(0deg)}}
@keyframes msc-sombra-pulo{
  0%{transform:scale(1);opacity:1;animation-timing-function:cubic-bezier(.4,0,.6,1)}
  12%{transform:scale(1.18);opacity:1;animation-timing-function:cubic-bezier(.2,.8,.4,1)}
  22%{transform:scale(.8);opacity:.8;animation-timing-function:cubic-bezier(.2,.6,.4,1)}
  40%,48%{transform:scale(.55);opacity:.45;animation-timing-function:cubic-bezier(.6,0,1,.6)}
  62%{transform:scale(.95);opacity:.9;animation-timing-function:linear}
  67%{transform:scale(1.22);opacity:1}
  82%{transform:scale(.98);opacity:1}
  100%{transform:scale(1);opacity:1}}
@keyframes msc-folha-pulo-e{0%,100%{transform:rotate(0deg)}12%{transform:rotate(10deg)}26%{transform:rotate(-24deg)}44%{transform:rotate(14deg)}60%{transform:rotate(26deg)}68%{transform:rotate(-20deg)}80%{transform:rotate(8deg)}90%{transform:rotate(-3deg)}}
@keyframes msc-folha-pulo-d{0%,100%{transform:rotate(0deg)}12%{transform:rotate(-10deg)}26%{transform:rotate(24deg)}44%{transform:rotate(-14deg)}60%{transform:rotate(-26deg)}68%{transform:rotate(20deg)}80%{transform:rotate(-8deg)}90%{transform:rotate(3deg)}}
@keyframes msc-braco-pulo-e{0%,100%{transform:rotate(0deg)}12%{transform:rotate(-24deg)}24%{transform:rotate(16deg)}44%{transform:rotate(4deg)}60%{transform:rotate(12deg)}68%{transform:rotate(-18deg)}82%{transform:rotate(6deg)}}
@keyframes msc-braco-pulo-d{0%,100%{transform:rotate(0deg)}12%{transform:rotate(24deg)}24%{transform:rotate(-16deg)}44%{transform:rotate(-4deg)}60%{transform:rotate(-12deg)}68%{transform:rotate(18deg)}82%{transform:rotate(-6deg)}}
@keyframes msc-sobr-pulo{0%,100%{transform:translateY(0)}12%{transform:translateY(1.5px)}40%{transform:translateY(-4px)}67%{transform:translateY(2px)}82%{transform:translateY(-1px)}}
@keyframes msc-corar{from{opacity:.8}to{opacity:1}}
@keyframes msc-cintila{0%,100%{transform:scale(.4);opacity:.3}50%{transform:scale(1.15);opacity:1}}
@keyframes msc-confete{
  0%{opacity:1;transform:translate(0,0) rotate(0deg) scale(.5);animation-timing-function:cubic-bezier(.1,.7,.3,1)}
  40%{opacity:1;transform:translate(var(--dx),var(--dy)) rotate(calc(var(--rot) * .5)) scale(1);animation-timing-function:cubic-bezier(.5,0,1,.5)}
  100%{opacity:0;transform:translate(calc(var(--dx) * 1.2),calc(var(--dy) + 80px)) rotate(var(--rot)) scale(.9)}}

@keyframes msc-choque{
  0%{transform:translate(0,0) scale(1,1) rotate(0deg)}
  10%{transform:translate(0,2%) scale(1.07,.93) rotate(0deg)}
  24%{transform:translate(0,-13%) scale(.85,1.18) rotate(-2deg)}
  40%{transform:translate(0,0) scale(1.12,.88) rotate(1deg)}
  52%{transform:translate(-2%,0) scale(1,1) rotate(-4deg)}
  64%{transform:translate(2%,0) scale(1,1) rotate(4deg)}
  76%{transform:translate(-1%,0) scale(1,.98) rotate(-2.5deg)}
  88%{transform:translate(.5%,0) scale(1,.97) rotate(1.2deg)}
  100%{transform:translate(0,0) scale(1,.97) rotate(0deg)}}
@keyframes msc-suspiro{0%,100%{transform:translate(0,0) scale(1,.97) rotate(0deg)}30%,42%{transform:translate(0,-1.4%) scale(.985,1.01) rotate(-1deg)}72%{transform:translate(0,0) scale(1.05,.915) rotate(1.5deg)}}
@keyframes msc-sombra-choque{0%,100%{transform:scale(1);opacity:1}10%{transform:scale(1.08);opacity:1}24%{transform:scale(.7);opacity:.6}40%{transform:scale(1.12);opacity:1}}
@keyframes msc-folha-choque-e{0%,100%{transform:rotate(0deg)}24%{transform:rotate(-20deg)}40%{transform:rotate(18deg)}60%{transform:rotate(-8deg)}}
@keyframes msc-folha-choque-d{0%,100%{transform:rotate(0deg)}24%{transform:rotate(20deg)}40%{transform:rotate(-18deg)}60%{transform:rotate(8deg)}}
@keyframes msc-folha-suspiro-e{0%,100%{transform:rotate(0deg)}36%{transform:rotate(7deg)}72%{transform:rotate(-12deg)}}
@keyframes msc-folha-suspiro-d{0%,100%{transform:rotate(0deg)}36%{transform:rotate(-7deg)}72%{transform:rotate(12deg)}}
@keyframes msc-braco-suspiro-e{0%,100%{transform:rotate(0deg)}36%{transform:rotate(4deg)}72%{transform:rotate(-6deg)}}
@keyframes msc-braco-suspiro-d{0%,100%{transform:rotate(0deg)}36%{transform:rotate(-4deg)}72%{transform:rotate(6deg)}}
@keyframes msc-lagrima{0%{transform:translateY(0) scale(.3,.3);opacity:0}15%{transform:translateY(0) scale(1,1);opacity:1}35%{transform:translateY(1px) scale(1,1.1);opacity:1}100%{transform:translateY(20px) scale(.8,1.3);opacity:0}}
@keyframes msc-gota{0%{transform:translateY(-4px) scale(.4,.4);opacity:0}20%{transform:translateY(0) scale(1,1);opacity:1}60%{transform:translateY(4px) scale(1,1.05);opacity:1}100%{transform:translateY(16px) scale(.85,1.2);opacity:0}}

@keyframes msc-inclinar{0%{transform:rotate(-7deg)}5%{transform:rotate(-9.5deg)}11%,40%{transform:rotate(-8deg)}45%{transform:rotate(-10deg)}57%{transform:rotate(9.5deg)}63%,88%{transform:rotate(7.5deg)}93%{transform:rotate(9.5deg)}100%{transform:rotate(-7deg)}}
@keyframes msc-folhas-inclinar{0%{transform:rotate(6deg)}11%{transform:rotate(-3deg)}20%,40%{transform:rotate(0deg)}48%{transform:rotate(4deg)}60%{transform:rotate(-7deg)}70%{transform:rotate(3deg)}80%,92%{transform:rotate(0deg)}100%{transform:rotate(6deg)}}
@keyframes msc-pensar{0%,44%{transform:translate(3px,-3px)}52%{transform:translate(0,-1px)}60%,93%{transform:translate(-3px,-3px)}100%{transform:translate(3px,-3px)}}
@keyframes msc-ombro-e{0%,100%{transform:rotate(10deg)}8%,42%{transform:rotate(0deg)}50%{transform:rotate(14deg)}60%,90%{transform:rotate(0deg)}}
@keyframes msc-ombro-d{0%,100%{transform:rotate(-10deg)}8%,42%{transform:rotate(0deg)}50%{transform:rotate(-14deg)}60%,90%{transform:rotate(0deg)}}
@keyframes msc-surgir{from{transform:scale(0) rotate(-20deg);opacity:0}to{transform:scale(1) rotate(0deg);opacity:1}}
@keyframes msc-interroga{0%,100%{transform:translateY(0) rotate(0deg)}30%{transform:translateY(-5px) rotate(10deg)}70%{transform:translateY(-3px) rotate(-8deg)}}

@keyframes msc-voo{0%{transform:translate(178.0px,16.0px)}4.167%{transform:translate(175.3px,26.0px)}8.333%{transform:translate(167.5px,33.3px)}12.5%{transform:translate(155.2px,36.0px)}16.667%{transform:translate(139.0px,33.3px)}20.833%{transform:translate(120.2px,26.0px)}25%{transform:translate(100.0px,16.0px)}29.167%{transform:translate(79.8px,6.0px)}33.333%{transform:translate(61.0px,-1.3px)}37.5%{transform:translate(44.8px,-4.0px)}41.667%{transform:translate(32.5px,-1.3px)}45.833%{transform:translate(24.7px,6.0px)}50%{transform:translate(22.0px,16.0px)}54.167%{transform:translate(24.7px,26.0px)}58.333%{transform:translate(32.5px,33.3px)}62.5%{transform:translate(44.8px,36.0px)}66.667%{transform:translate(61.0px,33.3px)}70.833%{transform:translate(79.8px,26.0px)}75%{transform:translate(100.0px,16.0px)}79.167%{transform:translate(120.2px,6.0px)}83.333%{transform:translate(139.0px,-1.3px)}87.5%{transform:translate(155.2px,-4.0px)}91.667%{transform:translate(167.5px,-1.3px)}95.833%{transform:translate(175.3px,6.0px)}100%{transform:translate(178.0px,16.0px)}}
@keyframes msc-segue{0%{transform:translate(5.57px,-3.00px)}4.167%{transform:translate(5.38px,-2.00px)}8.333%{transform:translate(4.82px,-1.27px)}12.5%{transform:translate(3.94px,-1.00px)}16.667%{transform:translate(2.79px,-1.27px)}20.833%{transform:translate(1.44px,-2.00px)}25%{transform:translate(0.00px,-3.00px)}29.167%{transform:translate(-1.44px,-4.00px)}33.333%{transform:translate(-2.79px,-4.73px)}37.5%{transform:translate(-3.94px,-5.00px)}41.667%{transform:translate(-4.82px,-4.73px)}45.833%{transform:translate(-5.38px,-4.00px)}50%{transform:translate(-5.57px,-3.00px)}54.167%{transform:translate(-5.38px,-2.00px)}58.333%{transform:translate(-4.82px,-1.27px)}62.5%{transform:translate(-3.94px,-1.00px)}66.667%{transform:translate(-2.79px,-1.27px)}70.833%{transform:translate(-1.44px,-2.00px)}75%{transform:translate(-0.00px,-3.00px)}79.167%{transform:translate(1.44px,-4.00px)}83.333%{transform:translate(2.79px,-4.73px)}87.5%{transform:translate(3.94px,-5.00px)}91.667%{transform:translate(4.82px,-4.73px)}95.833%{transform:translate(5.38px,-4.00px)}100%{transform:translate(5.57px,-3.00px)}}
@keyframes msc-inclina-voo{0%{transform:rotate(2.60deg)}4.167%{transform:rotate(2.51deg)}8.333%{transform:rotate(2.25deg)}12.5%{transform:rotate(1.84deg)}16.667%{transform:rotate(1.30deg)}20.833%{transform:rotate(0.67deg)}25%{transform:rotate(0.00deg)}29.167%{transform:rotate(-0.67deg)}33.333%{transform:rotate(-1.30deg)}37.5%{transform:rotate(-1.84deg)}41.667%{transform:rotate(-2.25deg)}45.833%{transform:rotate(-2.51deg)}50%{transform:rotate(-2.60deg)}54.167%{transform:rotate(-2.51deg)}58.333%{transform:rotate(-2.25deg)}62.5%{transform:rotate(-1.84deg)}66.667%{transform:rotate(-1.30deg)}70.833%{transform:rotate(-0.67deg)}75%{transform:rotate(-0.00deg)}79.167%{transform:rotate(0.67deg)}83.333%{transform:rotate(1.30deg)}87.5%{transform:rotate(1.84deg)}91.667%{transform:rotate(2.25deg)}95.833%{transform:rotate(2.51deg)}100%{transform:rotate(2.60deg)}}
@keyframes msc-borboleta-giro{0%{transform:rotate(-0.0deg)}4.167%{transform:rotate(-4.1deg)}8.333%{transform:rotate(-8.0deg)}12.5%{transform:rotate(-11.3deg)}16.667%{transform:rotate(-13.9deg)}20.833%{transform:rotate(-15.5deg)}25%{transform:rotate(-16.0deg)}29.167%{transform:rotate(-15.5deg)}33.333%{transform:rotate(-13.9deg)}37.5%{transform:rotate(-11.3deg)}41.667%{transform:rotate(-8.0deg)}45.833%{transform:rotate(-4.1deg)}50%{transform:rotate(-0.0deg)}54.167%{transform:rotate(4.1deg)}58.333%{transform:rotate(8.0deg)}62.5%{transform:rotate(11.3deg)}66.667%{transform:rotate(13.9deg)}70.833%{transform:rotate(15.5deg)}75%{transform:rotate(16.0deg)}79.167%{transform:rotate(15.5deg)}83.333%{transform:rotate(13.9deg)}87.5%{transform:rotate(11.3deg)}91.667%{transform:rotate(8.0deg)}95.833%{transform:rotate(4.1deg)}100%{transform:rotate(0.0deg)}}
@keyframes msc-alcanca-d{0%{transform:rotate(-18.0deg)}4.167%{transform:rotate(-14.7deg)}8.333%{transform:rotate(-4.8deg)}12.5%{transform:rotate(10.8deg)}16.667%{transform:rotate(31.1deg)}20.833%{transform:rotate(54.8deg)}25%{transform:rotate(55.0deg)}29.167%{transform:rotate(55.0deg)}33.333%{transform:rotate(55.0deg)}37.5%{transform:rotate(55.0deg)}41.667%{transform:rotate(55.0deg)}45.833%{transform:rotate(55.0deg)}50%{transform:rotate(55.0deg)}54.167%{transform:rotate(55.0deg)}58.333%{transform:rotate(55.0deg)}62.5%{transform:rotate(55.0deg)}66.667%{transform:rotate(55.0deg)}70.833%{transform:rotate(55.0deg)}75%{transform:rotate(55.0deg)}79.167%{transform:rotate(54.8deg)}83.333%{transform:rotate(31.1deg)}87.5%{transform:rotate(10.8deg)}91.667%{transform:rotate(-4.8deg)}95.833%{transform:rotate(-14.7deg)}100%{transform:rotate(-18.0deg)}}
@keyframes msc-alcanca-e{0%{transform:rotate(0.0deg)}4.167%{transform:rotate(0.0deg)}8.333%{transform:rotate(0.0deg)}12.5%{transform:rotate(0.0deg)}16.667%{transform:rotate(0.0deg)}20.833%{transform:rotate(0.0deg)}25%{transform:rotate(0.0deg)}29.167%{transform:rotate(0.4deg)}33.333%{transform:rotate(37.7deg)}37.5%{transform:rotate(69.7deg)}41.667%{transform:rotate(94.3deg)}45.833%{transform:rotate(109.7deg)}50%{transform:rotate(115.0deg)}54.167%{transform:rotate(109.7deg)}58.333%{transform:rotate(94.3deg)}62.5%{transform:rotate(69.7deg)}66.667%{transform:rotate(37.7deg)}70.833%{transform:rotate(0.4deg)}75%{transform:rotate(0.0deg)}79.167%{transform:rotate(0.0deg)}83.333%{transform:rotate(0.0deg)}87.5%{transform:rotate(0.0deg)}91.667%{transform:rotate(0.0deg)}95.833%{transform:rotate(0.0deg)}100%{transform:rotate(0.0deg)}}
@keyframes msc-borboleta-bob{from{transform:translateY(-3px)}to{transform:translateY(3px)}}
@keyframes msc-bater{0%,100%{transform:scaleX(1)}45%{transform:scaleX(.18)}}
@keyframes msc-4{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-5%) rotate(-3deg)}}

@keyframes msc-flutuar{from{transform:translateY(0) rotate(-1.5deg)}to{transform:translateY(-7%) rotate(1.5deg)}}
@keyframes msc-sombra-flutuar{from{transform:scale(1);opacity:1}to{transform:scale(.72);opacity:.6}}
@keyframes msc-gira{to{transform:rotate(360deg)}}
@keyframes msc-gira-acelera{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes msc-equilibrio{from{transform:rotate(-8deg)}to{transform:rotate(8deg)}}
@keyframes msc-ponto{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-8px);opacity:1}}

@keyframes msc-acenar{0%,72%,100%{transform:rotate(0deg)}8%{transform:rotate(-14deg)}19%{transform:rotate(22deg)}30%{transform:rotate(-10deg)}41%{transform:rotate(22deg)}52%{transform:rotate(-6deg)}62%{transform:rotate(10deg)}}
@keyframes msc-acena-corpo{0%,72%,100%{transform:translateY(0) rotate(0deg)}19%{transform:translateY(-1.2%) rotate(2.2deg)}30%{transform:translateY(0) rotate(-.8deg)}41%{transform:translateY(-1.2%) rotate(2.2deg)}52%{transform:translateY(0) rotate(-.4deg)}}
@keyframes msc-tracos-aceno{0%,70%,100%{opacity:0}12%,55%{opacity:1}}

@keyframes msc-fala-corpo{0%,100%{transform:translateY(0) rotate(0deg)}25%{transform:translateY(-1.2%) rotate(1deg)}50%{transform:translateY(0) rotate(0deg)}70%{transform:translateY(-.8%) rotate(-1.2deg)}}
@keyframes msc-gesto{0%,100%{transform:rotate(0deg)}15%{transform:rotate(-18deg)}30%{transform:rotate(6deg)}48%{transform:rotate(-10deg)}64%{transform:rotate(8deg)}80%{transform:rotate(-14deg)}}
@keyframes msc-sobr-fala{0%,100%{transform:translateY(0)}20%{transform:translateY(-3px)}35%{transform:translateY(0)}70%{transform:translateY(-2px)}}
@keyframes msc-falar{0%,100%{transform:scale(1,.2)}14%{transform:scale(1,1)}28%{transform:scale(.8,.45)}42%{transform:scale(1.1,.9)}56%{transform:scale(.9,.25)}70%{transform:scale(1,.8)}85%{transform:scale(.85,.4)}}

@keyframes msc-dormir{0%,100%{transform:rotate(-4deg) scale(1,1)}45%,58%{transform:rotate(-3deg) scale(.975,1.035)}}
@keyframes msc-cochilo{0%,78%,100%{transform:translateY(0) rotate(0deg)}84%{transform:translateY(1.5%) rotate(5deg)}87%{transform:translateY(-1%) rotate(-2deg)}90%{transform:translateY(0) rotate(.5deg)}93%{transform:translateY(0) rotate(0deg)}}
@keyframes msc-folhas-sono{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(3deg)}}
@keyframes msc-bolha{0%,100%{transform:scale(.3)}45%{transform:scale(1.3)}58%{transform:scale(1.35)}}
@keyframes msc-z{0%{transform:translate(0,6px) scale(.5) rotate(0deg);opacity:0}18%{transform:translate(5px,-4px) scale(.85) rotate(-6deg);opacity:1}45%{transform:translate(1px,-20px) scale(1) rotate(-12deg);opacity:1}72%{transform:translate(14px,-34px) scale(1.1) rotate(8deg);opacity:.8}100%{transform:translate(22px,-50px) scale(1.2) rotate(-4deg);opacity:0}}

@keyframes msc-andar{
  0%,50%,100%{transform:translateY(0) scale(1.03,.97) rotate(0deg);animation-timing-function:cubic-bezier(.2,.6,.4,1)}
  25%{transform:translateY(-4%) scale(.98,1.02) rotate(2.5deg);animation-timing-function:cubic-bezier(.6,0,.8,.4)}
  75%{transform:translateY(-4%) scale(.98,1.02) rotate(-2.5deg);animation-timing-function:cubic-bezier(.6,0,.8,.4)}}
@keyframes msc-passo{
  0%{transform:translateY(0) rotate(0deg);animation-timing-function:cubic-bezier(.2,.6,.4,1)}
  25%{transform:translateY(-10px) rotate(-12deg);animation-timing-function:cubic-bezier(.6,0,.8,.4)}
  45%{transform:translateY(1px) rotate(3deg)}
  52%,100%{transform:translateY(0) rotate(0deg)}}
@keyframes msc-sombra-anda{from{transform:scale(1.04)}to{transform:scale(.94)}}
@keyframes msc-braco-anda{0%,100%{transform:rotate(-16deg)}50%{transform:rotate(16deg)}}
@keyframes msc-folhas-anda{0%,50%,100%{transform:rotate(0deg)}25%{transform:rotate(-4deg)}75%{transform:rotate(4deg)}}
@keyframes msc-folha-quica-e{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(5deg)}}
@keyframes msc-folha-quica-d{0%,100%{transform:rotate(7deg)}50%{transform:rotate(-5deg)}}
@keyframes msc-poeira-e{0%{transform:translateX(0) scale(.3);opacity:0}8%{transform:translateX(-2px) scale(.7);opacity:.9}55%,100%{transform:translateX(-10px) scale(1.4);opacity:0}}
@keyframes msc-poeira-d{0%{transform:translateX(0) scale(.3);opacity:0}8%{transform:translateX(2px) scale(.7);opacity:.9}55%,100%{transform:translateX(10px) scale(1.4);opacity:0}}

@keyframes msc-cocegas{
  0%,100%{transform:translateY(0) scale(1.08,.92) rotate(-2deg);animation-timing-function:cubic-bezier(.2,.7,.4,1)}
  25%{transform:translateY(-6%) scale(.95,1.06) rotate(-6deg);animation-timing-function:cubic-bezier(.6,0,.8,.3)}
  50%{transform:translateY(0) scale(1.08,.92) rotate(2deg);animation-timing-function:cubic-bezier(.2,.7,.4,1)}
  75%{transform:translateY(-6%) scale(.95,1.06) rotate(6deg);animation-timing-function:cubic-bezier(.6,0,.8,.3)}}
@keyframes msc-sombra-cocegas{from{transform:scale(1.08)}to{transform:scale(.8)}}
@keyframes msc-agita{from{transform:rotate(-14deg)}to{transform:rotate(14deg)}}
@keyframes msc-hi{0%{transform:scale(.4) translateY(0);opacity:0}25%{transform:scale(1.2) translateY(0);opacity:1}60%{transform:scale(1) translateY(-3px);opacity:1}100%{transform:scale(.9) translateY(-8px);opacity:0}}

@keyframes msc-tonto{0%,100%{transform:translate(-2.5%,0) rotate(-6deg)}25%{transform:translate(0,-1.5%) rotate(0deg)}50%{transform:translate(2.5%,0) rotate(6deg)}75%{transform:translate(0,1%) rotate(0deg)}}
@keyframes msc-sombra-tonto{0%,100%{transform:translateX(-12%) scale(1)}25%{transform:translateX(0) scale(.92)}50%{transform:translateX(12%) scale(1)}75%{transform:translateX(0) scale(1.04)}}
@keyframes msc-mole{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(10deg)}}
@keyframes msc-folhas-tonto{0%,100%{transform:rotate(8deg)}50%{transform:rotate(-8deg)}}
@keyframes msc-contra{from{transform:rotate(0deg) scale(1,2.38)}to{transform:rotate(-360deg) scale(1,2.38)}}

@keyframes msc-carinho{0%,100%{transform:translateY(0) scale(1,1) rotate(-3deg)}50%{transform:translateY(.6%) scale(1.045,.95) rotate(3deg)}}
@keyframes msc-coracao{0%{transform:translate(0,0) scale(.3);opacity:0}15%{transform:translate(0,-3px) scale(1.15);opacity:1}40%{transform:translate(-5px,-14px) scale(1);opacity:1}70%{transform:translate(4px,-26px) scale(.95);opacity:.8}100%{transform:translate(-2px,-38px) scale(.85);opacity:0}}

@keyframes msc-susto{
  0%{transform:translateY(0) scale(1,1) rotate(0deg)}
  8%{transform:translateY(2%) scale(1.1,.9) rotate(0deg);animation-timing-function:cubic-bezier(.2,.8,.3,1)}
  28%{transform:translateY(-20%) scale(.84,1.2) rotate(-3deg);animation-timing-function:ease-in-out}
  44%{transform:translateY(-23%) scale(1,1) rotate(2deg);animation-timing-function:cubic-bezier(.6,0,1,.6)}
  62%{transform:translateY(0) scale(1.14,.86) rotate(0deg);animation-timing-function:cubic-bezier(.3,1.5,.5,1)}
  78%{transform:translateY(0) scale(.96,1.04) rotate(0deg)}
  100%{transform:translateY(0) scale(1,1) rotate(0deg)}}
@keyframes msc-sombra-susto{0%,100%{transform:scale(1);opacity:1}8%{transform:scale(1.1);opacity:1}28%{transform:scale(.62);opacity:.5}44%{transform:scale(.58);opacity:.45}62%{transform:scale(1.16);opacity:1}}

@keyframes msc-timido{0%,100%{transform:translateY(0) scale(1,1) rotate(-1.5deg)}50%{transform:translateY(.4%) scale(1.015,.985) rotate(1.5deg)}}
@keyframes msc-espiada{from{transform:translateX(0) rotate(0deg)}to{transform:translateX(1%) rotate(5deg)}}
@keyframes msc-maos{0%{transform:translateY(34px) scale(.8);opacity:0}60%{opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}

@keyframes msc-raiva{from{transform:translateX(-1.4%) rotate(-.8deg)}to{transform:translateX(1.4%) rotate(.8deg)}}
@keyframes msc-bufar{0%,50%,100%{transform:translateY(0) scale(1,1)}10%,60%{transform:translateY(1%) scale(1.03,.96)}30%,80%{transform:translateY(-.5%) scale(.99,1.01)}}
@keyframes msc-raiva-folha{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}
@keyframes msc-treme-braco{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}
@keyframes msc-pisar{0%{transform:translateY(0);animation-timing-function:cubic-bezier(.2,.7,.4,1)}35%{transform:translateY(-12px);animation-timing-function:cubic-bezier(.7,0,1,.5)}50%{transform:translateY(1px)}60%,100%{transform:translateY(0)}}
@keyframes msc-sombra-raiva{from{transform:scale(1.04)}to{transform:scale(.96)}}
@keyframes msc-pulso-vermelho{0%,50%,100%{opacity:.65}10%,60%{opacity:1}}
@keyframes msc-vapor{0%{transform:translate(0,8px) scale(.35);opacity:0}20%{transform:translate(2px,0) scale(.8);opacity:.95}60%{transform:translate(-3px,-16px) scale(1.15);opacity:.6}100%{transform:translate(2px,-30px) scale(1.45);opacity:0}}
@keyframes msc-veia{0%,50%,100%{transform:scale(.9)}10%,60%{transform:scale(1.25)}}

@keyframes msc-volta{
  0%{transform:translateY(-260px) rotate(-10deg) scale(1,1);opacity:0;animation-timing-function:cubic-bezier(.2,.6,.4,1)}
  12%{opacity:1}
  55%{transform:translateY(-30px) rotate(6deg) scale(1,1);animation-timing-function:cubic-bezier(.5,0,.9,.5)}
  72%{transform:translateY(0) rotate(0deg) scale(1.12,.86);animation-timing-function:cubic-bezier(.3,1.5,.5,1)}
  86%{transform:translateY(0) rotate(0deg) scale(.97,1.03)}
  100%{transform:translateY(0) rotate(0deg) scale(1,1);opacity:1}}
@keyframes msc-foguete-entra{from{transform:translateY(40px) rotate(8deg);opacity:0}to{transform:translateY(0) rotate(0deg);opacity:1}}
@keyframes msc-chama{from{transform:scale(.7,.85)}to{transform:scale(1.1,1)}}
@keyframes msc-chama-forte{from{transform:scale(1.5,1.05)}to{transform:scale(2,1.2)}}
@keyframes msc-bandeira{from{transform:scale(0) rotate(-30deg)}to{transform:scale(1) rotate(0deg)}}
@keyframes msc-tremular{from{transform:skewY(-6deg) scaleX(.94)}to{transform:skewY(5deg) scaleX(1)}}
@keyframes msc-lua-brilho{from{box-shadow:0 0 40px 6px rgba(255,240,190,.28)}to{box-shadow:0 0 64px 16px rgba(255,240,190,.45)}}

@media (prefers-reduced-motion: reduce){
  .msc *,.msc .msc-svg,.msc-viagem *{animation:none!important;transition:none!important}
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

/* ---------------- Interação ---------------- */

// estados em que os olhos podem seguir o cursor
const SEGUE_OLHAR = ["parado", "falando", "ajuda", "caminhando", "faltando", "carregando", "sucesso", "carinho", "cocegas"];

function useInteracao({ ativo, estado, svgRef, onInteracao, onAcordar, astronauta, easterEgg }) {
  const [reacao, setReacao] = useState(null);
  const [olho, setOlho] = useState({ x: 0, y: 0 });
  const timer = useRef();
  const cliques = useRef([]);
  const cutucoes = useRef([]);
  const carinho = useRef({ x: null, dir: 0, viradas: [] });

  const reagirRef = useRef();
  const reagir = useCallback(
    (tipo) => {
      clearTimeout(timer.current);
      setReacao(tipo);
      onInteracao?.(tipo);
      const { duracao, proxima } = REACOES[tipo];
      timer.current = setTimeout(() => (proxima ? reagirRef.current(proxima) : setReacao(null)), duracao);
    },
    [onInteracao]
  );
  reagirRef.current = reagir;
  useEffect(() => () => clearTimeout(timer.current), []);

  // olhos seguem o cursor pela página toda
  useEffect(() => {
    if (!ativo || typeof window === "undefined") return;
    let quadro = 0;
    const mover = (ev) => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        const el = svgRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.45;
        const dx = (ev.clientX - cx) / Math.max(r.width * 1.5, 1);
        const dy = (ev.clientY - cy) / Math.max(r.height * 1.5, 1);
        setOlho({ x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) });
      });
    };
    window.addEventListener("pointermove", mover, { passive: true });
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("pointermove", mover);
    };
  }, [ativo, svgRef]);

  const handlers = !ativo
    ? {}
    : {
        role: "button",
        tabIndex: 0,
        "aria-label": "Mascote. Clique para interagir.",
        onPointerDown: () => {
          if (estado === "dormindo") {
            reagir("susto");
            onAcordar?.();
            cliques.current = [];
          }
        },
        onClick: () => {
          if (["susto", "irritado", "foguete", "calmo"].includes(reacao)) return;
          if (reacao === "tonto") {
            // continuar cutucando enquanto ele está tonto deixa ele irritado
            const agora = Date.now();
            cutucoes.current = [...cutucoes.current.filter((t) => agora - t < 2000), agora];
            if (cutucoes.current.length >= 3) {
              cutucoes.current = [];
              const semMovimento = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
              reagir(astronauta && easterEgg && !semMovimento ? "foguete" : "irritado");
            }
            return;
          }
          const agora = Date.now();
          cliques.current = [...cliques.current.filter((t) => agora - t < 1600), agora];
          if (cliques.current.length >= 5) {
            cliques.current = [];
            reagir("tonto");
          } else {
            reagir("cocegas");
          }
        },
        onKeyDown: (ev) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            if (estado === "dormindo") {
              reagir("susto");
              onAcordar?.();
            } else reagir("cocegas");
          }
        },
        // carinho: passar o cursor (ou o dedo) de um lado pro outro em cima dele
        onPointerMove: (ev) => {
          if (["tonto", "foguete", "calmo", "irritado"].includes(reacao) || estado === "dormindo") return;
          const c = carinho.current;
          const agora = Date.now();
          if (c.x !== null) {
            const d = Math.sign(ev.clientX - c.x);
            if (d && Math.abs(ev.clientX - c.x) > 2) {
              if (c.dir && d !== c.dir) c.viradas = [...c.viradas.filter((t) => agora - t < 1400), agora];
              c.dir = d;
            }
          }
          c.x = ev.clientX;
          if (c.viradas.length >= 4 && reacao !== "carinho") {
            c.viradas = [];
            reagir("carinho");
          }
        },
        onPointerLeave: () => {
          carinho.current = { x: null, dir: 0, viradas: [] };
        },
      };

  return { reacao, olho, handlers };
}

/* ---------------- Easter egg: viagem pra Lua ---------------- */

function Foguete() {
  return (
    <svg className="msc-foguete" viewBox="0 0 200 80" aria-hidden="true">
      <g className="msc-chama">
        <path d="M36 25 C16 25 4 40 -10 40 C4 40 16 55 36 55 Z" fill="#F5A04A" />
        <path d="M36 31 C24 31 14 40 6 40 C14 40 24 49 36 49 Z" fill="#FFE07A" />
      </g>
      <path d="M44 22 L72 22 L58 1 L36 1 Z" fill="#E86A6A" />
      <path d="M44 58 L72 58 L58 79 L36 79 Z" fill="#E86A6A" />
      <path d="M34 18 L150 18 C175 18 192 30 198 40 C192 50 175 62 150 62 L34 62 Q27 40 34 18 Z" fill="#F3F5F7" stroke="#AFB9C2" strokeWidth="2" />
      <path d="M150 18 C175 18 192 30 198 40 C192 50 175 62 150 62 Z" fill="#E86A6A" />
      <rect x="58" y="36" width="34" height="8" rx="4" fill="#5B8DEF" />
      <circle cx="120" cy="40" r="11" fill="#9CD2EE" stroke="#AFB9C2" strokeWidth="3" />
      <path d="M114 36 Q117 32 122 32" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function ViagemLua({ origem, onFim }) {
  const sprite = useRef(null);
  const ceu = useRef(null);
  const lua = useRef(null);
  const fumacas = useRef(null);
  const [fase, setFase] = useState("preparo");
  const [estrelas] = useState(() =>
    Array.from({ length: 46 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      t: 1 + Math.random() * 2.2,
      d: Math.random() * 2,
    }))
  );

  useEffect(() => {
    const el = sprite.current;
    const caixa = fumacas.current;
    const timers = [];
    const intervalos = [];
    const fumaca = (x, y, { tam = 18, dur = 900, dx = 0, dy = 0, cor = "rgba(236,240,244,.92)" } = {}) => {
      if (!caixa) return;
      const p = document.createElement("span");
      p.className = "msc-fumaca";
      p.style.cssText = `left:${x}px;top:${y}px;width:${tam}px;height:${tam}px;background:${cor}`;
      caixa.appendChild(p);
      const a = p.animate?.(
        [
          { transform: "translate(-50%,-50%) scale(.4)", opacity: 0.95 },
          { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(1.8)`, opacity: 0 },
        ],
        { duration: dur, easing: "cubic-bezier(.2,.6,.4,1)" }
      );
      if (a) a.onfinish = () => p.remove();
      else setTimeout(() => p.remove(), dur);
    };
    const cauda = () => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width * 0.16, y: r.top + r.height * 0.84, w: r.width };
    };
    const rand = (a, b) => a + Math.random() * (b - a);

    ceu.current?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 700, fill: "forwards" });
    // ronco do motor: tremor que vai aumentando
    el?.animate?.(
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => ({
        transform: `translate(${(i % 2 ? 1 : -1) * (0.6 + i * 0.25)}px, ${(i % 3) - 1}px)`,
      })),
      { duration: 800 }
    );
    timers.push(
      setTimeout(() => {
        intervalos.push(
          setInterval(() => {
            const c = cauda();
            fumaca(c.x, c.y, { tam: rand(14, 28), dur: 900, dx: rand(-40, -10), dy: rand(-6, 14) });
          }, 70)
        );
      }, 250)
    );
    timers.push(
      setTimeout(() => {
        if (!el || !lua.current) return;
        intervalos.forEach(clearInterval);
        setFase("voo");
        intervalos.push(
          setInterval(() => {
            const c = cauda();
            const esc = Math.max(0.15, c.w / origem.width);
            fumaca(c.x, c.y, { tam: 8 + 18 * esc, dur: 750, dx: rand(-14, 4), dy: rand(0, 18) * esc });
          }, 45)
        );
        sacudirTela({ intensidade: 6, duracao: 500, vinheta: false });
        const lr = lua.current.getBoundingClientRect();
        const sr = el.getBoundingClientRect();
        const dx = lr.left + lr.width / 2 - (sr.left + sr.width / 2);
        const dy = lr.top + lr.height / 2 - (sr.top + sr.height / 2);
        const voo = el.animate(
          [
            { transform: "translate(0,0) rotate(0deg) scale(1)", opacity: 1 },
            { transform: "translate(0px,-40px) rotate(-12deg) scale(1)", opacity: 1, offset: 0.18 },
            { transform: `translate(${dx * 0.35}px,${dy * 0.62}px) rotate(-38deg) scale(.7)`, opacity: 1, offset: 0.55 },
            { transform: `translate(${dx}px,${dy}px) rotate(-30deg) scale(.12)`, opacity: 1, offset: 0.96 },
            { transform: `translate(${dx}px,${dy}px) rotate(-30deg) scale(.05)`, opacity: 0 },
          ],
          { duration: 2300, easing: "cubic-bezier(.45,0,.7,1)", fill: "forwards" }
        );
        voo.onfinish = () => {
          intervalos.forEach(clearInterval);
          setFase("lua");
          const lr2 = lua.current?.getBoundingClientRect();
          if (lr2) {
            for (let i = 0; i < 12; i += 1) {
              const a = (i / 12) * Math.PI * 2;
              fumaca(lr2.left + lr2.width / 2 + Math.cos(a) * lr2.width * 0.42, lr2.top + lr2.height / 2 + Math.sin(a) * lr2.height * 0.42, {
                tam: 18,
                dur: 800,
                dx: Math.cos(a) * 34,
                dy: Math.sin(a) * 34,
                cor: "rgba(245,238,210,.9)",
              });
            }
          }
          lua.current?.animate?.(
            [{ transform: "scale(1)" }, { transform: "scale(1.15) rotate(-8deg)" }, { transform: "scale(1)" }],
            { duration: 550, easing: "ease-out" }
          );
        };
      }, 800)
    );
    timers.push(setTimeout(() => ceu.current?.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" }), 5300));
    timers.push(setTimeout(() => onFim?.(), 5900));
    return () => {
      timers.forEach(clearTimeout);
      intervalos.forEach(clearInterval);
    };
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <div className="msc-ceu" ref={ceu} aria-hidden="true">
        {estrelas.map((e, i) => (
          <span key={i} className="msc-ceu-estrela" style={{ left: `${e.x}%`, top: `${e.y}%`, width: e.t, height: e.t, animationDelay: `${e.d}s` }} />
        ))}
        <div className="msc-lua" ref={lua}>
          <span className="msc-cratera" style={{ left: "22%", top: "30%", width: "22%", height: "22%" }} />
          <span className="msc-cratera" style={{ left: "58%", top: "52%", width: "16%", height: "16%" }} />
          <span className="msc-cratera" style={{ left: "38%", top: "66%", width: "11%", height: "11%" }} />
          {fase === "lua" && (
            <svg className="msc-bandeira" viewBox="0 0 40 50">
              <line x1="6" y1="4" x2="6" y2="48" stroke="#7A8590" strokeWidth="3" strokeLinecap="round" />
              <g className="msc-bandeira-pano">
                <path d="M7 5 L36 10 L7 22 Z" fill="#7DAA8B" />
                <path d="M16 15 Q20 9 25 11 Q21 16 16 15 Z" fill="#fff" />
              </g>
            </svg>
          )}
        </div>
        {fase === "lua" && <p className="msc-legenda-lua">Fui pra Lua respirar um pouco.</p>}
      </div>
      <div className="msc-fumacas" ref={fumacas} aria-hidden="true" />
      <div
        className={`msc-viagem msc-fase-${fase}`}
        ref={sprite}
        aria-hidden="true"
        style={{ left: origem.left, top: origem.top, width: origem.width, height: origem.height }}
      >
        <Mascote estado="irritado" roupa="astronauta" tamanho={origem.width} mostrarBalao={false} tremerTela={false} />
        <Foguete />
      </div>
    </>,
    document.body
  );
}

/* ---------------- Componente ---------------- */

export default function Mascote({
  estado = "parado",
  mensagem,
  tamanho = 180,
  mostrarBalao = true,
  mostrar404 = true,
  roupa = "normal",
  pesosRoupa = PESOS_PADRAO, // usado com roupa="aleatoria"
  interativo = false,
  olhar, // { x, y } de -1 a 1: força a direção do olhar (ex.: acompanhar o texto digitado)
  onInteracao,
  onAcordar,
  tremerTela = true, // sacode a tela quando ele fica irritado
  easterEgg = true, // irritado + traje de astronauta = viagem pra Lua
  children,
  className = "",
  style,
}) {
  useEstilos();
  const uid = useId().replace(/:/g, "");
  const svgRef = useRef(null);
  const e = estado in MENSAGENS || estado in REACOES ? estado : "parado";
  // roupa: "normal" | "astronauta" | "aleatoria" (sorteia uma vez ao montar)
  const [sorteio] = useState(() => Math.random());
  const roupaAtual = roupa === "aleatoria" ? sortearRoupa(sorteio, pesosRoupa) : ROUPAS.includes(roupa) ? roupa : "normal";
  const astronauta = roupaAtual === "astronauta";
  const estilo = ESTILO_ROUPA[roupaAtual];

  const { reacao, olho, handlers } = useInteracao({
    ativo: interativo, estado: e, svgRef, onInteracao, onAcordar, astronauta, easterEgg,
  });
  const v = reacao || e; // estado visual
  const [origemViagem, setOrigemViagem] = useState(null);
  useEffect(() => {
    if (v === "foguete" && svgRef.current) setOrigemViagem(svgRef.current.getBoundingClientRect());
    else setOrigemViagem(null);
  }, [v]);
  useEffect(() => {
    if (v === "irritado" && tremerTela) sacudirTela();
  }, [v, tremerTela]);
  const texto = reacao ? REACOES[reacao].mensagem : mensagem ?? MENSAGENS[e] ?? REACOES[e]?.mensagem;

  // "falando": o texto do balão aparece letra a letra enquanto a boca mexe
  const [digitado, setDigitado] = useState(null);
  useEffect(() => {
    const semMovimento =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (v !== "falando" || !texto || !mostrarBalao || semMovimento) {
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
  }, [v, texto, mostrarBalao]);
  const falandoAgora = v === "falando" && (digitado === null ? !mostrarBalao : digitado.length < texto.length);
  const [bE, bD] = BRACOS[v];
  const [fE, fD] = FOLHAS[v];
  const C = CORES;

  const alvoOlhar = olhar || (interativo ? olho : null);
  const desvio = alvoOlhar && SEGUE_OLHAR.includes(v) ? `translate(${alvoOlhar.x * 5}px, ${alvoOlhar.y * 4}px)` : "none";

  const classes = [
    "msc",
    `msc--${v}`,
    falandoAgora && "msc-tagarela",
    astronauta && "msc-astro",
    roupaAtual !== "normal" && `msc-roupa-${roupaAtual}`,
    interativo && "msc-interativo",
    alvoOlhar && "msc-seguindo",
    v === "foguete" && "msc-ausente",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div className={classes} style={{ "--msc-tam": `${tamanho}px`, ...style }}>
      {mostrarBalao && (texto || children) && (
        <div className="msc-balao" key={v + (texto || "")} aria-live="polite">
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
          {children && !reacao && <div className="msc-balao-extra">{children}</div>}
        </div>
      )}

      {(() => {
        const palco = (
      <div className="msc-palco msc-pop" key={e}>
        <svg
          ref={svgRef}
          className="msc-svg"
          viewBox="-20 0 240 240"
          width={tamanho}
          height={tamanho}
          {...(interativo ? handlers : { role: "img", "aria-label": `Mascote: ${ROTULOS[v]}` })}
        >
          <defs>
            <linearGradient id={`${uid}-corpo`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={C.corpoClaro} />
              <stop offset="1" stopColor={C.corpo} />
            </linearGradient>
            <linearGradient id={`${uid}-raiva`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#F04848" stopOpacity=".95" />
              <stop offset=".5" stopColor="#F04848" stopOpacity=".55" />
              <stop offset=".85" stopColor="#F04848" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g className="msc-camada">
          <Roupa roupa={roupaAtual} uid={uid} parte="fundo" />

          {/* braços (atrás do corpo) */}
          <g className="msc-braco-e" style={{ transform: `rotate(${bE}deg)` }}>
            <g className="msc-aceno-e">
              <ellipse cx="40" cy="113" rx="10.5" ry="23" fill={estilo.braco[0]} stroke={estilo.braco[1]} strokeWidth="2" />
            </g>
          </g>
          <g className="msc-braco-d" style={{ transform: `rotate(${bD}deg)` }}>
            <g className="msc-aceno-d">
              <ellipse cx="160" cy="113" rx="10.5" ry="23" fill={estilo.braco[0]} stroke={estilo.braco[1]} strokeWidth="2" />
            </g>
          </g>

          {/* pernas */}
          {[["msc-perna-e", 66], ["msc-perna-d", 108]].map(([cls, x]) => (
            <g key={cls} className={cls}>
              <rect x={x} y="188" width="26" height="34" rx="13" fill={estilo.perna[0]} stroke={estilo.perna[1]} strokeWidth="2" />
              {estilo.sapato && (
                <rect x={x - 1} y="210" width="28" height="13" rx="6.5" fill={estilo.sapato[0]} stroke={estilo.sapato[1]} strokeWidth="1.5" />
              )}
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
          {v === "irritado" && (
            <path
              className="msc-vermelho"
              d="M100 38 C156 38 171 82 170 130 C169 182 152 206 100 206 C48 206 31 182 30 130 C29 82 44 38 100 38 Z"
              fill={`url(#${uid}-raiva)`}
            />
          )}
          <Roupa roupa={roupaAtual} uid={uid} parte="traje" />

          {/* folhas */}
          <g className="msc-folhas">
            <g className="msc-folha-e" style={{ transform: `rotate(${fE}deg)` }}>
              <g className="msc-folha-e-mov">
                <path d="M100 22 C88 6 66 4 58 14 C68 30 90 30 100 22 Z" fill={C.folha} />
                <path d="M97 21 Q80 16 64 15" stroke={C.folhaVeia} strokeWidth="1.6" fill="none" strokeLinecap="round" />
              </g>
            </g>
            <g className="msc-folha-d" style={{ transform: `rotate(${fD}deg)` }}>
              <g className="msc-folha-d-mov">
                <path d="M100 22 C112 2 138 0 146 10 C136 28 112 30 100 22 Z" fill={C.folha} />
                <path d="M103 21 Q122 13 140 11" stroke={C.folhaVeia} strokeWidth="1.6" fill="none" strokeLinecap="round" />
              </g>
            </g>
          </g>

          {/* rosto (remonta a cada troca de estado para "saltar" na nova expressão) */}
          <g className="msc-rosto" key={"rosto-" + v}>
          {(() => {
            const b = BOCHECHAS[v] || { rx: 11, ry: 7, op: 0.85 };
            return (
              <g className="msc-bochechas" opacity={b.op}>
                <ellipse cx="65" cy="124" rx={b.rx} ry={b.ry} fill={C.bochecha} />
                <ellipse cx="135" cy="124" rx={b.rx} ry={b.ry} fill={C.bochecha} />
              </g>
            );
          })()}
          <Sobrancelhas e={v} />
          <g className="msc-olhar-cursor" style={{ transform: desvio }}>
            <Olhos e={v} />
          </g>
          <Boca e={v} falandoAgora={falandoAgora} />
          </g>

          <Roupa roupa={roupaAtual} uid={uid} parte="acessorio" />
          <Maos e={v} astronauta={astronauta} />
          <Extras e={v === "foguete" ? "irritado" : v} />
          <ExtrasRoupa roupa={roupaAtual} e={v} />
          </g>
        </svg>
        <div className="msc-sombra" />
      </div>
        );
        if (e !== "naoEncontrado" || !mostrar404) {
          return (
            <>
              {palco}
              {origemViagem && <ViagemLua origem={origemViagem} />}
            </>
          );
        }
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
