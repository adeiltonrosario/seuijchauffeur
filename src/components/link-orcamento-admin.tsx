import { Copy, ExternalLink, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const LINKS = [
  { rotulo: "Link publicado", url: "https://seuijchauffeur.lovable.app/orcamento" },
  { rotulo: "Link de pré-visualização", url: "https://id-preview--01402ff0-2faa-46d3-9356-15952322dbe1.lovable.app/orcamento" },
];

export function LinkOrcamentoAdmin() {
  const copiar = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };
  return (
    <Card className="surface-luxe border-border/60 p-5 mb-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-gold">Orçamento livre (público)</h2>
      <p className="mt-1 text-sm text-muted-foreground">Envie este link para qualquer pessoa fazer orçamento e agendar sem login.</p>
      <div className="mt-4 space-y-3">
        {LINKS.map((l) => (
          <div key={l.url} className="rounded-lg border border-border/60 bg-secondary/30 p-3">
            <div className="text-xs text-muted-foreground">{l.rotulo}</div>
            <div className="mt-1 break-all text-sm">{l.url}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => copiar(l.url)}><Copy className="mr-1 h-4 w-4" />Copiar</Button>
              <Button size="sm" variant="outline" asChild>
                <a href={l.url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-4 w-4" />Abrir</a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={`https://wa.me/?text=${encodeURIComponent("Faça seu orçamento e agende: " + l.url)}`} target="_blank" rel="noreferrer"><MessageCircle className="mr-1 h-4 w-4" />WhatsApp</a>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
