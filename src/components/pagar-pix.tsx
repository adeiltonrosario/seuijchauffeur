import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatarBRL } from "@/lib/dados";
import { useChavePix } from "@/lib/chave-pix";

export function PagarPix({ valor }: { valor?: number }) {
  const pix = useChavePix();
  if (!pix) return null;
  if (!pix.chave) return <p className="text-sm text-muted-foreground">Chave Pix ainda não cadastrada pela empresa.</p>;
  const copiar = () => { void navigator.clipboard.writeText(pix.chave).then(() => toast.success("Chave Pix copiada.")); };
  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-left text-sm">
      {valor != null && <p className="text-muted-foreground">Valor a transferir: <span className="text-gold font-semibold">{formatarBRL(valor)}</span></p>}
      <p className="mt-1 text-muted-foreground">Chave Pix ({pix.tipo})</p>
      <p className="font-display break-all text-lg">{pix.chave}</p>
      <p className="text-muted-foreground">{pix.titular}{pix.banco ? ` · ${pix.banco}` : ""}</p>
      <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={copiar}><Copy /> Copiar chave Pix</Button>
      <p className="mt-2 text-xs text-muted-foreground">Após a transferência, seu agendamento fica pré-reservado até a confirmação do pagamento pela equipe.</p>
    </div>
  );
}
