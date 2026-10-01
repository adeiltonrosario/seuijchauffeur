/**
 * Base visual do mapa em estilo "dark executivo": água, parques, quadras,
 * avenidas e ruas desenhadas em SVG para lembrar a malha urbana do Maps.
 */
export function MapaRuas() {
  return (
    <svg
      viewBox="0 0 1000 620"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="mapa-fundo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.21 0.012 260)" />
          <stop offset="100%" stopColor="oklch(0.16 0.014 265)" />
        </linearGradient>
        <linearGradient id="mapa-agua" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.33 0.055 235)" />
          <stop offset="100%" stopColor="oklch(0.26 0.05 240)" />
        </linearGradient>
      </defs>

      <rect width="1000" height="620" fill="url(#mapa-fundo)" />

      {/* Quadras */}
      <g fill="oklch(0.245 0.012 262)">
        {Array.from({ length: 7 }).map((_, linha) =>
          Array.from({ length: 11 }).map((_, coluna) => (
            <rect
              key={`q-${linha}-${coluna}`}
              x={coluna * 92 + 14}
              y={linha * 88 + 12}
              width={70}
              height={66}
              rx={6}
            />
          )),
        )}
      </g>

      {/* Parque */}
      <g>
        <rect x="104" y="366" width="200" height="158" rx="20" fill="oklch(0.33 0.06 150)" opacity="0.55" />
        <rect x="104" y="366" width="200" height="158" rx="20" fill="none" stroke="oklch(0.42 0.07 150)" strokeWidth="1.5" opacity="0.6" />
      </g>

      {/* Rio / represa */}
      <path
        d="M640 -20 C 700 110, 600 190, 680 300 C 760 410, 700 520, 780 640 L 1020 640 L 1020 -20 Z"
        fill="url(#mapa-agua)"
        opacity="0.9"
      />

      {/* Ruas locais */}
      <g stroke="oklch(0.33 0.012 260)" strokeWidth="5" strokeLinecap="round" opacity="0.95">
        {Array.from({ length: 8 }).map((_, i) => (
          <line key={`h-${i}`} x1="0" y1={i * 88 + 90} x2="1000" y2={i * 88 + 90} />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={`v-${i}`} x1={i * 92 + 96} y1="0" x2={i * 92 + 96} y2="620" />
        ))}
      </g>

      {/* Avenidas principais */}
      <g stroke="oklch(0.46 0.02 90)" strokeWidth="14" strokeLinecap="round" opacity="0.5">
        <line x1="0" y1="266" x2="1000" y2="266" />
        <line x1="372" y1="0" x2="372" y2="620" />
        <path d="M0 540 C 240 470, 420 560, 1000 440" fill="none" />
      </g>
      <g stroke="oklch(0.72 0.1 88)" strokeWidth="4" strokeLinecap="round" opacity="0.35">
        <line x1="0" y1="266" x2="1000" y2="266" strokeDasharray="22 18" />
        <line x1="372" y1="0" x2="372" y2="620" strokeDasharray="22 18" />
      </g>
    </svg>
  );
}
