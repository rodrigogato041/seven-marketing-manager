import { getDatabase } from "@/db/client";
import { getDashboardSummary, listLeads } from "@/features/leads/repository";
import { loadBusinessConfig } from "@/config/business";
import { addLead, scheduleDryRun, togglePause } from "./actions";

export const dynamic = "force-dynamic";

const stateLabels: Record<string,string> = { discovered:"Descoberto", qualified:"Qualificado", contacted:"Abordado", replied:"Respondeu", interested:"Interessado", whatsapp_handoff:"Encaminhado ao WhatsApp", registered:"Cadastrado", active_customer:"Cliente ativo", closed:"Encerrado" };

export default async function Dashboard() {
  const { db } = getDatabase();
  const [summary, allLeads] = await Promise.all([getDashboardSummary(db), listLeads(db)]);
  const business = loadBusinessConfig();
  return <main className="shell">
    <header className="topbar"><div><p className="eyebrow">Seven Prospect</p><h1>Operação comercial</h1><p className="subtitle">Prospecção assistida para a {business.companyName}, com rastreabilidade, bloqueio de alegações e respeito à lista de não contato.</p></div><span className={`badge ${summary.paused ? "" : "good"}`}>{summary.paused ? "Operação pausada" : "Dry-run ativo"}</span></header>
    <section className="metrics" aria-label="Indicadores"><Metric label="Leads" value={summary.leads}/><Metric label="Respostas" value={summary.replies}/><Metric label="Não contatar" value={summary.doNotContact}/><Metric label="Jobs pendentes" value={summary.pendingJobs}/><Metric label="Custo de IA no mês" value={`US$ ${summary.aiCostUsd.toFixed(2)}`}/></section>
    <section className="grid">
      <article className="card"><h2>Leads</h2><div className="table-wrap"><table><thead><tr><th>Perfil</th><th>Segmento</th><th>Score</th><th>Etapa</th><th>Canal</th><th>Simulação</th></tr></thead><tbody>
        {allLeads.length === 0 ? <tr><td className="empty" colSpan={6}>Nenhum lead cadastrado.</td></tr> : allLeads.map((lead) => <tr key={lead.id}><td><strong>{lead.displayName || lead.instagramHandle}</strong><br/><span className="note">{lead.instagramHandle}</span></td><td>{lead.segment}</td><td>{lead.score}</td><td><span className="status">{stateLabels[lead.pipelineState] ?? lead.pipelineState}</span></td><td><span className="status">{lead.channelOwner}</span></td><td><form action={scheduleDryRun} className="form"><input type="hidden" name="leadId" value={lead.id}/><input name="message" aria-label={`Mensagem para ${lead.instagramHandle}`} defaultValue={`Olá! Vi o trabalho de vocês em ${lead.segment.toLowerCase()} e achei interessante. Sou Rodrigo, da Seven Marketing. Posso te fazer uma pergunta rápida sobre a divulgação do negócio?`}/><button type="submit">Agendar dry-run</button></form></td></tr>)}
      </tbody></table></div></article>
      <aside className="stack">
        <article className="card"><h2>Novo lead</h2><form action={addLead} className="form"><label>Instagram<input required name="instagramHandle" placeholder="@empresa"/></label><label>Nome<input name="displayName" placeholder="Nome da empresa"/></label><label>Segmento<select name="segment">{business.icpSegments.map((segment)=><option key={segment}>{segment}</option>)}</select></label><div className="form-row"><label>Região<input name="geography" defaultValue="Vale do Ribeira/SP"/></label><label>Score<input name="score" type="number" min="0" max="100" defaultValue="50"/></label></div><button type="submit">Cadastrar lead</button></form></article>
        <article className="card"><h2>Controle da operação</h2><p className="note">O ambiente inicia com <strong>DRY_RUN=true</strong>. O worker registra o que faria, sem enviar mensagem.</p><form action={togglePause} className="actions"><input type="hidden" name="paused" value={String(!summary.paused)}/><button className={summary.paused ? "secondary" : "danger"}>{summary.paused ? "Retomar" : "Pausar tudo"}</button></form></article>
      </aside>
    </section>
  </main>;
}

function Metric({label,value}:{label:string;value:string|number}) { return <article className="card"><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong></article>; }
