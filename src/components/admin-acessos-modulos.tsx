import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const NOMES: Record<string, string> = { esportivo: "Esportivo", suporte_ia: "Suporte IA" };
type Acesso = { email: string; modulo: string };

export function AdminAcessosModulos() {
  const [lista, setLista] = useState<Acesso[]>([]);
  const [email, setEmail] = useState("");
  const [modulo, setModulo] = useState("esportivo");

  const carregar = async () => {
    const { data } = await supabase.from("acessos_modulos").select("email, modulo").order("email");
    setLista((data as Acesso[]) ?? []);
  };
  useEffect(() => { void carregar(); }, []);

  const liberar = async () => {
    const e = email.trim().toLowerCase();
    if (!e.includes("@")) { toast.error("Informe o e-mail do cliente."); return; }
    const { error } = await supabase.from("acessos_modulos").insert({ email: e, modulo });
    if (error) { toast.error("Não foi possível liberar (já liberado?)."); return; }
    toast.success("Acesso liberado.");
    setEmail("");
    void carregar();
  };
  const remover = async (a: Acesso) => {
    await supabase.from("acessos_modulos").delete().eq("email", a.email).eq("modulo", a.modulo);
    void carregar();
  };

  return (
    <Card className="surface-luxe border-border/60 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Acesso dos clientes a Esportivo e Suporte IA</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" type="email" placeholder="cliente@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select className="rounded-md border border-border bg-background px-3 text-sm" value={modulo} onChange={(e) => setModulo(e.target.value)}>
          <option value="esportivo">Esportivo</option>
          <option value="suporte_ia">Suporte IA</option>
        </select>
        <Button onClick={liberar}>Liberar</Button>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {lista.length === 0 ? <li className="text-muted-foreground">Nenhum cliente liberado.</li> : null}
        {lista.map((a) => (
          <li key={a.email + a.modulo} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
            <span>{a.email} — <span className="text-gold">{NOMES[a.modulo]}</span></span>
            <Button size="sm" variant="ghost" onClick={() => remover(a)}>Remover</Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
