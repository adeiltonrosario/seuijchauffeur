import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  INTERVALO_ROTACAO_MS,
  anunciosVisiveis,
  carregarAnuncios,
  type Anuncio,
} from "@/lib/publicidades";

export function BannerPublicidade({ publico }: { publico: "clientes" | "motoristas" }) {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setAnuncios(carregarAnuncios());
  }, []);

  const visiveis = useMemo(() => anunciosVisiveis(anuncios, publico), [anuncios, publico]);

  useEffect(() => {
    if (pausado || visiveis.length < 2) return;
    timer.current = setInterval(() => {
      setIndice((i) => (i + 1) % visiveis.length);
    }, INTERVALO_ROTACAO_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [pausado, visiveis.length]);

  useEffect(() => {
    if (indice >= visiveis.length) setIndice(0);
  }, [indice, visiveis.length]);

  if (!visiveis.length) return null;

  const atual = visiveis[Math.min(indice, visiveis.length - 1)]!;
  const avancar = (passo: number) =>
    setIndice((i) => (i + passo + visiveis.length) % visiveis.length);

  return (
    <Card
      className="surface-luxe border-primary/30 p-5"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onTouchStart={() => setPausado(true)}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          <Megaphone className="size-4 text-primary" /> Conheça também nossos aplicativos
        </h2>
        {visiveis.length > 1 ? (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" aria-label="Anúncio anterior" onClick={() => avancar(-1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Próximo anúncio" onClick={() => avancar(1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>

      <div key={atual.id} className="mt-4 flex animate-in gap-4 fade-in duration-500 sm:items-center">
        {atual.imagem ? (
          <img
            src={atual.imagem}
            alt={atual.titulo}
            className="size-20 shrink-0 rounded-lg border border-border/60 object-cover"
          />
        ) : (
          <div className="flex size-20 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
            <Megaphone className="size-7 text-primary" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold text-gold">{atual.titulo}</p>
          <p className="mt-1 text-sm text-muted-foreground">{atual.chamada}</p>
          <Button variant="secondary" size="sm" className="mt-3" asChild>
            <a href={atual.link} target="_blank" rel="noopener noreferrer">
              {atual.cta} <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </div>
      </div>

      {visiveis.length > 1 ? (
        <div className="mt-4 flex justify-center gap-2">
          {visiveis.map((a, i) => (
            <button
              key={a.id}
              type="button"
              aria-label={`Ver ${a.titulo}`}
              onClick={() => setIndice(i)}
              className={
                i === indice
                  ? "size-2 rounded-full bg-primary"
                  : "size-2 rounded-full bg-border transition-colors hover:bg-primary/50"
              }
            />
          ))}
        </div>
      ) : null}
    </Card>
  );
}
