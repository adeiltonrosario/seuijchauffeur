import { MarcaModelo } from "@/components/marca-modelo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck, Shirt, Snowflake, Clock, IdCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CATEGORIAS_CARGA,
  CATEGORIAS_PASSAGEIROS,
  ajudaCapacidade,
  capacidadeDaCategoria,
  capacidadeValida,
  faixaCapacidade,
  type CategoriaVeiculo,
} from "@/lib/dados";
import { formatarTelefone, validarContato } from "@/lib/contatos";
import { registrarPendente } from "@/lib/status-motorista";
import { cpfValido, criarAcesso, enviarDocumento, formatarCpf, validarSenhas } from "@/lib/cadastro-acesso";
import { extrairCnh, extrairCrlv, lerTextoPdf } from "@/lib/leitura-documentos";
import { gravarMotorista, gravarVeiculoFrota } from "@/lib/banco";

export const Route = createFileRoute("/seja-motorista")({
  head: () => ({
    meta: [
      { title: "Seja um motorista credenciado — SeuChauffeur" },
      { name: "description", content: "Solicite seu credenciamento na frota executiva SeuChauffeur. Análise pela gerência corporativa." },
      { property: "og:title", content: "Seja um motorista credenciado — SeuChauffeur" },
      { property: "og:description", content: "Candidate-se à frota executiva SeuChauffeur e atenda clientes com certeza e conforto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SejaMotorista,
});

const REQUISITOS = [
  { icone: IdCard, texto: "CNH válida com EAR (exerce atividade remunerada)" },
  { icone: Snowflake, texto: "Veículo climatizado e higienizado" },
  { icone: Shirt, texto: "Traje social e atendimento discreto" },
  { icone: Clock, texto: "Pontualidade: chegada 10 minutos antes" },
];

const DOCUMENTOS = [
  { chave: "foto", rotulo: "Foto de perfil (rosto) *" },
  { chave: "cnh", rotulo: "CNH com EAR (foto ou PDF) *" },
  { chave: "crlv", rotulo: "CRLV do veículo (foto ou PDF) *" },
] as const;

function SejaMotorista() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpf, setCpf] = useState("");
  const [cnh, setCnh] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [arquivos, setArquivos] = useState<Record<string, File | null>>({});
  const [modelo, setModelo] = useState("");
  const [placa, setPlaca] = useState("");
  const [cor, setCor] = useState("");
  const [categoria, setCategoriaState] = useState<CategoriaVeiculo>("Sedan");
  const [capacidade, setCapacidade] = useState(String(capacidadeDaCategoria("Sedan")));
  const [salvando, setSalvando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const [lendo, setLendo] = useState<string | null>(null);
  const [mmInicial, setMmInicial] = useState({ chave: 0, marca: "", modelo: "" });

  const anexar = async (chave: string, f: File | null) => {
    setArquivos((a) => ({ ...a, [chave]: f }));
    if (!f || (chave !== "cnh" && chave !== "crlv")) return;
    setLendo(chave);
    try {
      const texto = await lerTextoPdf(f);
      if (!texto.trim()) {
        toast.info("Documento anexado. Para preenchimento automático, envie o PDF digital (app Carteira Digital de Trânsito).");
        return;
      }
      if (chave === "cnh") {
        const d = extrairCnh(texto);
        if (d.nome) setNome(d.nome);
        if (d.cpf) setCpf(formatarCpf(d.cpf));
        if (d.registro) setCnh(d.registro);
        toast.success(d.nome || d.cpf ? "Dados da CNH preenchidos. Confira antes de enviar." : "Não consegui ler os dados da CNH. Preencha manualmente.");
      } else {
        const d = extrairCrlv(texto);
        if (d.placa) setPlaca(d.placa);
        if (d.cor) setCor(d.cor);
        if (d.marca) setMmInicial((m) => ({ chave: m.chave + 1, marca: d.marca!, modelo: d.modelo ?? "" }));
        if (d.lotacao) setCapacidade(String(d.lotacao));
        toast.success(d.placa ? "Dados do veículo preenchidos. Confira antes de enviar." : "Não consegui ler os dados do CRLV. Preencha manualmente.");
      }
    } catch {
      toast.info("Documento anexado. Preencha os dados manualmente.");
    } finally {
      setLendo(null);
    }
  };

  const setCategoria = (c: CategoriaVeiculo) => {
    setCategoriaState(c);
    setCapacidade(String(capacidadeDaCategoria(c)));
  };

  const enviar = async () => {
    if (salvando) return;
    if (!nome.trim()) return void toast.error("Informe seu nome completo.");
    const erro = validarContato(email, whatsapp);
    if (erro) return void toast.error(erro);
    if (!cpfValido(cpf)) return void toast.error("Informe um CPF válido.");
    if (!cnh.trim()) return void toast.error("Informe o número da sua CNH.");
    const erroSenha = validarSenhas(senha, confirmar);
    if (erroSenha) return void toast.error(erroSenha);
    if (!modelo || !placa || !cor) return void toast.error("Informe modelo, placa e cor do veículo.");
    const faixa = faixaCapacidade(categoria);
    const informada = Number(capacidade);
    if (faixa.ajustavel && (!Number.isFinite(informada) || informada < faixa.min || informada > faixa.max)) {
      return void toast.error(`Informe a lotação entre ${faixa.min} e ${faixa.max} ocupantes conforme o CRLV.`);
    }
    for (const d of DOCUMENTOS) {
      if (!arquivos[d.chave]) return void toast.error(`Anexe: ${d.rotulo.replace(" *", "")}.`);
    }
    setSalvando(true);
    try {
      const documentos: Record<string, string> = {};
      for (const d of DOCUMENTOS) {
        const f = arquivos[d.chave];
        if (f) documentos[d.chave] = await enviarDocumento(cpf, d.chave, f);
      }
      const erroAcesso = await criarAcesso(email, senha, "/");
      if (erroAcesso) { setSalvando(false); return void toast.error(erroAcesso); }
      const nomeM = nome.trim();
      await gravarMotorista({
        nome: nomeM,
        email: email.trim().toLowerCase(),
        whatsapp: whatsapp.trim(),
        status: "pendente",
        veiculo: `${modelo} — ${categoria}`,
        placa: placa.toUpperCase(),
        categoria,
        cpf: cpf.replace(/\D/g, ""),
        cnh: cnh.trim(),
        documentos,
      });
      await gravarVeiculoFrota(
        {
          placa,
          modelo,
          cor,
          categoria,
          capacidade: faixa.ajustavel ? capacidadeValida(categoria, informada) : capacidadeDaCategoria(categoria),
        },
        nomeM,
      );
      registrarPendente(nomeM);
      setEnviado(true);
    } catch (e) {
      toast.error("Não foi possível enviar os documentos: " + (e as Error).message);
    }
    setSalvando(false);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="text-xs uppercase tracking-[0.25em] text-primary">Frota executiva</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-gold sm:text-4xl">Seja um motorista credenciado</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Todos os motoristas passam por análise da gerência corporativa. Envie sua solicitação e aguarde o contato pelo WhatsApp.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="surface-luxe h-fit p-6">
          <p className="flex items-center gap-2 font-medium text-gold"><ShieldCheck className="size-5" /> Requisitos</p>
          <ul className="mt-4 space-y-3">
            {REQUISITOS.map(({ icone: Icone, texto }) => (
              <li key={texto} className="flex items-start gap-3 text-sm text-muted-foreground">
                <Icone className="mt-0.5 size-4 shrink-0 text-primary" /> {texto}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="surface-luxe p-6">
          {enviado ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto size-12 text-primary" />
              <p className="mt-4 font-display text-xl font-semibold text-gold">Solicitação recebida!</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Confirme seu e-mail pelo link que enviamos. Nossa gerência corporativa analisará seus documentos e entrará em contato via WhatsApp para ativar seu acesso.
              </p>
              <Button asChild className="mt-6"><Link to="/">Voltar ao início</Link></Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void enviar(); }}>
              <div className="space-y-2"><Label htmlFor="sm-nome">Nome completo *</Label>
                <Input id="sm-nome" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="sm-email">E-mail *</Label>
                  <Input id="sm-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" /></div>
                <div className="space-y-2"><Label htmlFor="sm-whats">Telefone (WhatsApp) *</Label>
                  <Input id="sm-whats" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(formatarTelefone(e.target.value))} placeholder="(71) 99999-9999" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="sm-cpf">CPF *</Label>
                  <Input id="sm-cpf" inputMode="numeric" value={cpf} onChange={(e) => setCpf(formatarCpf(e.target.value))} placeholder="000.000.000-00" /></div>
                <div className="space-y-2"><Label htmlFor="sm-cnh">Número da CNH *</Label>
                  <Input id="sm-cnh" inputMode="numeric" value={cnh} onChange={(e) => setCnh(e.target.value)} /></div>
              </div>

              <div className="rounded-lg border border-border/60 bg-secondary/30 p-4 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">Crie sua senha de acesso</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="sm-senha">Senha *</Label>
                    <Input id="sm-senha" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 8 caracteres" /></div>
                  <div className="space-y-2"><Label htmlFor="sm-senha2">Repetir senha *</Label>
                    <Input id="sm-senha2" type="password" autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} /></div>
                </div>
                {confirmar && senha !== confirmar ? <p className="text-xs text-destructive">As senhas não coincidem.</p> : null}
              </div>

              <div className="rounded-lg border border-border/60 bg-secondary/30 p-4 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">Documentos para análise</p>
                {DOCUMENTOS.map((d) => (
                  <div key={d.chave} className="space-y-1">
                    <Label htmlFor={`sm-doc-${d.chave}`}>{d.rotulo}</Label>
                    <Input id={`sm-doc-${d.chave}`} type="file" accept={d.chave === "foto" ? "image/*" : "image/*,application/pdf"}
                      onChange={(e) => void anexar(d.chave, e.target.files?.[0] ?? null)} />
                    {lendo === d.chave ? <p className="text-xs text-primary">Lendo documento...</p> : null}
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">Envie primeiro a CNH e o CRLV em PDF digital (gov.br) e os campos serão preenchidos automaticamente, sem custo. Arquivos de até 10 MB; só a equipe de administração pode ver.</p>
              </div>

              <div className="rounded-lg border border-border/60 bg-secondary/30 p-4 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">Seu veículo</p>
                <div className="sm:col-span-2"><MarcaModelo key={mmInicial.chave} id="sm" onChange={setModelo} marcaInicial={mmInicial.marca} modeloInicial={mmInicial.modelo} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="sm-placa">Placa *</Label>
                    <Input id="sm-placa" value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="ABC-1D23" /></div>
                  <div className="space-y-2"><Label htmlFor="sm-cor">Cor *</Label>
                    <Input id="sm-cor" value={cor} onChange={(e) => setCor(e.target.value)} placeholder="Preto" /></div>
                </div>
                {([
                  { titulo: "Passageiros", lista: CATEGORIAS_PASSAGEIROS },
                  { titulo: "Carga (carretos e mudanças)", lista: CATEGORIAS_CARGA },
                ] as const).map((g) => (
                  <div key={g.titulo} className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{g.titulo}</p>
                    <div className="flex flex-wrap gap-2">
                      {g.lista.map((c) => (
                        <button key={c} type="button" onClick={() => setCategoria(c)}
                          className={`rounded-full border px-4 py-2 text-sm transition-colors ${categoria === c ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {faixaCapacidade(categoria).ajustavel ? (
                  <div className="space-y-2">
                    <Label htmlFor="sm-cap">Ocupantes ({faixaCapacidade(categoria).min} a {faixaCapacidade(categoria).max})</Label>
                    <Input id="sm-cap" inputMode="numeric" value={capacidade} onChange={(e) => setCapacidade(e.target.value)} />
                    <p className="text-xs text-muted-foreground">{ajudaCapacidade(categoria)}</p>
                  </div>
                ) : null}
              </div>

              <Button type="submit" className="w-full" disabled={salvando}>
                {salvando ? "Enviando..." : "Enviar solicitação para análise"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Já é credenciado? <Link to="/" className="text-primary underline">Entrar</Link>
              </p>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
