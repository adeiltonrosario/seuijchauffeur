import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { DESCONTO_POR_INDICACAO, listarIndicacoes, type LinhaIndicacao } from "@/lib/indicacao";

export function TabelaIndicacoes() {
  const [linhas, setLinhas] = useState<LinhaIndicacao[]>([]);
  useEffect(() => {
    listarIndicacoes().then(setLinhas).catch(() => {});
  }, []);
  return (
    <Card className="border-border/60 p-5">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Indicações (Indique & Economize)</h2>
      {linhas.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum código gerado ainda.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="py-2">Código</th><th>Titular</th><th>Indicados</th><th>Desconto</th></tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.codigo} className="border-t border-border/60 align-top">
                  <td className="py-2 font-medium text-gold">{l.codigo}</td>
                  <td>{l.titular_nome || "—"}<br /><span className="text-xs text-muted-foreground">{l.titular_email}</span></td>
                  <td>
                    {l.indicados.length === 0 ? "—" : l.indicados.map((i) => (
                      <div key={i.email}>{i.nome || i.email} <span className="text-xs text-muted-foreground">{new Date(i.em).toLocaleDateString("pt-BR")}</span></div>
                    ))}
                    <span className="text-xs text-muted-foreground">{l.indicados.length}/4 vagas</span>
                  </td>
                  <td>{Math.min(l.indicados.length, 4) * DESCONTO_POR_INDICACAO}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
