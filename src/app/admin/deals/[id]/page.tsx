"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, BadgeDollarSign, Building2, CalendarDays, CheckCircle2,
  FileSignature, FolderLock, MapPin, Pencil, Phone, Mail, MessageCircle,
  ShieldCheck, Trash2, UserRound, XCircle
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";


type Deal = {
  id: string; deal_number: string | null; deal_type: string | null; property_type: string | null;
  status: string; source: string | null; source_detail: string | null; property_id: string | null;
  is_external_property: boolean | null; external_property_name: string | null;
  external_property_address: string | null; agreed_price: number | null; monthly_rent: number | null;
  security_deposit: number | null; advance_rent: number | null; commission_amount: number | null;
  co_agent_commission: number | null; lease_start_date: string | null; lease_end_date: string | null;
  contract_date: string | null; internal_notes: string | null; created_at: string;
};
type Party = {
  id: string; party_role: string; full_name_th: string | null; full_name_en: string | null;
  phone: string | null; line_id: string | null; email: string | null; id_type: string | null;
  id_number: string | null; nationality: string | null; address: string | null;
  company_name: string | null; company_registration_number: string | null; notes: string | null;
};
type Property = {
  id: string; title: string; project_name: string | null; location: string | null;
  property_type: string | null;
};

const STATUSES = ["preparing_contract","awaiting_signature","active","completed","cancelled"];

export default function DealWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const dealId = String(params.id || "");

  const [deal,setDeal] = useState<Deal|null>(null);
  const [parties,setParties] = useState<Party[]>([]);
  const [property,setProperty] = useState<Property|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [savingStatus,setSavingStatus] = useState(false);
  const [deleting,setDeleting] = useState(false);
  const [showSensitive,setShowSensitive] = useState<Record<string,boolean>>({});

  useEffect(()=>{ if(dealId) void load(); },[dealId]);

  async function load(){
    setLoading(true); setError("");
    const {data:{user}} = await supabase.auth.getUser();
    if(!user){ router.replace(`/login?returnTo=${encodeURIComponent(`/admin/deals/${dealId}`)}`); return; }
    const {data:profile} = await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
    if(profile?.role!=="admin"){ router.replace("/properties"); return; }

    const [{data:d,error:de},{data:ps,error:pe}] = await Promise.all([
      supabase.from("deals").select("id,deal_number,deal_type,property_type,status,source,source_detail,property_id,is_external_property,external_property_name,external_property_address,agreed_price,monthly_rent,security_deposit,advance_rent,commission_amount,co_agent_commission,lease_start_date,lease_end_date,contract_date,internal_notes,created_at").eq("id",dealId).single(),
      supabase.from("deal_parties").select("id,party_role,full_name_th,full_name_en,phone,line_id,email,id_type,id_number,nationality,address,company_name,company_registration_number,notes").eq("deal_id",dealId)
    ]);
    if(de||!d){ setError(de?.message||"Deal not found."); setLoading(false); return; }
    if(pe){ setError(pe.message); setLoading(false); return; }
    const row=d as Deal; setDeal(row); setParties((ps||[]) as Party[]);

    if(row.property_id){
      const {data:p}=await supabase.from("properties").select("id,title,project_name,location,property_type").eq("id",row.property_id).maybeSingle();
      setProperty((p as Property)||null);
    }
    setLoading(false);
  }

  async function changeStatus(status:string){
    if(!deal || status===deal.status) return;
    setSavingStatus(true); setError("");
    const patch:any={status,updated_at:new Date().toISOString()};
    if(status==="completed") patch.closed_at=new Date().toISOString();
    const {error:e}=await supabase.from("deals").update(patch).eq("id",deal.id);
    if(e) setError(e.message); else setDeal({...deal,status});
    setSavingStatus(false);
  }

  async function deleteDeal(){
    if(!deal || deleting) return;

    const label = deal.deal_number || "this deal";
    const confirmed = window.confirm(
      `Delete ${label} permanently?\n\nThis will also remove its deal parties and contract details. This action cannot be undone.`
    );

    if(!confirmed) return;

    setDeleting(true);
    setError("");

    const { error: deleteError } = await supabase
      .from("deals")
      .delete()
      .eq("id", deal.id);

    if(deleteError){
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    router.push("/admin/deals");
    router.refresh();
  }

  const partyA = parties.find(p=>["landlord","seller"].includes(p.party_role));
  const partyB = parties.find(p=>["tenant","buyer"].includes(p.party_role));
  const title = deal?.is_external_property ? deal.external_property_name : property?.title;
  const address = deal?.is_external_property ? deal.external_property_address : property?.location;
  const contractReady = useMemo(()=>{
    if(!deal||!partyA||!partyB) return false;
    const common=!!(partyA.id_number&&partyA.address&&partyB.id_number&&partyB.address&&deal.contract_date);
    return deal.deal_type==="rental" ? common&&!!(deal.monthly_rent&&deal.lease_start_date&&deal.lease_end_date) : common&&!!deal.agreed_price;
  },[deal,partyA,partyB]);

  if(loading) return <main className="min-h-screen bg-[#F3EFE5] px-6 py-12"><div className="mx-auto max-w-7xl"><div className="h-12 w-72 animate-pulse rounded-xl bg-[#DDD6C3]"/></div></main>;
  if(!deal) return <main className="min-h-screen bg-[#F3EFE5] px-6 py-12"><div className="mx-auto max-w-3xl rounded-2xl bg-white p-8"><h1 className="font-display text-3xl">Deal unavailable</h1><p className="mt-3 text-sm text-red-700">{error}</p><Link href="/admin/deals" className="mt-5 inline-flex text-sm font-bold">← Back to Deals</Link></div></main>;

  return <main className="min-h-screen bg-[#F3EFE5] text-[#1F2E28]">
    <section className="border-b border-[#3C4B44] bg-[#1F2E28] text-white">
      <div className="mx-auto max-w-7xl px-6 py-9">
        <Link href="/admin/deals" className="inline-flex items-center gap-2 text-xs font-bold text-[#BFC9C2] hover:text-white"><ArrowLeft size={14}/> Deals</Link>
        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C99A58]">{deal.deal_number||"Deal"}</p><Status status={deal.status}/></div>
            <h1 className="mt-2 font-display text-4xl">{title||"Property deal"}</h1>
            <p className="mt-2 text-sm text-[#C9D1CB]">{pretty(deal.deal_type||"deal")} · {pretty(deal.property_type||"property")} · {pretty(deal.source||"other")}{deal.source_detail?` · ${deal.source_detail}`:""}</p>
          </div>
          <div className="flex items-end gap-3">
  <Link
    href={`/admin/deals/${deal.id}/edit`}
    className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white transition hover:bg-white/20"
  >
    <Pencil size={15} />
    Edit Deal
  </Link>

  <button
    type="button"
    onClick={() => void deleteDeal()}
    disabled={deleting}
    className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-300/30 bg-red-500/10 px-4 text-xs font-bold text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
  >
    <Trash2 size={15} />
    {deleting ? "Deleting..." : "Delete Deal"}
  </button>

  <label className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#BFC9C2]">
    Deal status
    <select
      disabled={savingStatus}
      value={deal.status}
      onChange={e => void changeStatus(e.target.value)}
      className="mt-2 block h-11 min-w-56 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-bold text-white outline-none"
    >
      {STATUSES.map(s => (
        <option key={s} value={s} className="text-black">
          {pretty(s)}
        </option>
      ))}
    </select>
  </label>
</div>
        </div>
      </div>
    </section>

    <div className="mx-auto max-w-7xl px-6 py-8">
      {error&&<div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<BadgeDollarSign size={18}/>} label={deal.deal_type==="rental"?"Monthly rent":"Agreed price"} value={money(deal.deal_type==="rental"?deal.monthly_rent:deal.agreed_price,deal.deal_type==="rental"?"/mo":"")}/>
        <Metric icon={<BadgeDollarSign size={18}/>} label="Commission" value={money(deal.commission_amount)}/>
        <Metric icon={<CalendarDays size={18}/>} label={deal.deal_type==="rental"?"Lease period":"Contract date"} value={deal.deal_type==="rental"?`${date(deal.lease_start_date)} → ${date(deal.lease_end_date)}`:date(deal.contract_date)}/>
        <Metric icon={<FileSignature size={18}/>} label="Contract readiness" value={contractReady?"Core info ready":"Needs information"}/>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card title="Property" icon={<Building2 size={18}/>}>
            <div className="grid gap-5 md:grid-cols-2">
              <Info label="Property / project" value={title||"—"}/><Info label="Property type" value={pretty(deal.property_type||"—")}/>
              <Info label="Source" value={`${pretty(deal.source||"—")}${deal.source_detail?` · ${deal.source_detail}`:""}`}/><Info label="Record type" value={deal.is_external_property?"External / unlisted property":"BaanNest property"}/>
            </div>
            {address&&<div className="mt-5 flex gap-2 rounded-xl bg-[#F7F3EA] p-4 text-sm"><MapPin size={16} className="mt-0.5 shrink-0 text-[#A16F32]"/><span>{address}</span></div>}
          </Card>

          <Card title={deal.deal_type==="rental"?"Landlord & tenant":"Seller & buyer"} icon={<UserRound size={18}/>}>
            <div className="grid gap-4 lg:grid-cols-2">
              <PartyBox party={partyA} fallback={deal.deal_type==="rental"?"Landlord":"Seller"} show={!!partyA&&!!showSensitive[partyA.id]} toggle={()=>partyA&&setShowSensitive(x=>({...x,[partyA.id]:!x[partyA.id]}))}/>
              <PartyBox party={partyB} fallback={deal.deal_type==="rental"?"Tenant":"Buyer"} show={!!partyB&&!!showSensitive[partyB.id]} toggle={()=>partyB&&setShowSensitive(x=>({...x,[partyB.id]:!x[partyB.id]}))}/>
            </div>
            <p className="mt-4 text-xs text-[#7A837D]">Editing parties is the next workspace feature. Sensitive ID/passport numbers are masked by default on this page.</p>
          </Card>

          <Card title="Transaction terms" icon={<BadgeDollarSign size={18}/>}>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {deal.deal_type==="rental"&&<><Info label="Monthly rent" value={money(deal.monthly_rent)}/><Info label="Security deposit" value={money(deal.security_deposit)}/><Info label="Advance rent" value={money(deal.advance_rent)}/></>}
              {deal.deal_type==="sale"&&<Info label="Agreed sale price" value={money(deal.agreed_price)}/>}
              <Info label="BaanNest commission" value={money(deal.commission_amount)}/><Info label="Co-agent commission" value={money(deal.co_agent_commission)}/><Info label="Contract date" value={date(deal.contract_date)}/>
            </div>
          </Card>

          {deal.internal_notes&&<Card title="Internal notes" icon={<ShieldCheck size={18}/>}><p className="whitespace-pre-wrap text-sm leading-6 text-[#536159]">{deal.internal_notes}</p></Card>}
        </div>

        <aside className="space-y-5">
          <div className="rounded-[1.5rem] border border-[#DCD4C2] bg-white p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A16F32]">Contract</p>
            <div className="mt-3 flex items-start gap-3">
              {contractReady?<CheckCircle2 className="mt-0.5 text-[#39704A]" size={20}/>:<XCircle className="mt-0.5 text-[#A86C45]" size={20}/>}
              <div><p className="text-sm font-bold">{contractReady?"Core deal information is ready":"More contract information needed"}</p><p className="mt-1 text-xs leading-5 text-[#748078]">This only checks the shared Deal fields. Condo/house-specific contract fields will be mapped from your real Word templates later.</p></div>
            </div>
            {deal.deal_type === "rental" && ["condo", "house", "townhouse"].includes(deal.property_type || "") ? (
  <Link href={`/admin/deals/${deal.id}/contract`} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1F2E28] px-4 text-xs font-bold text-white transition hover:bg-[#2B4038]">
    <FileSignature size={15} />
    Make Contract
  </Link>
) : (
  <div className="mt-5 rounded-xl border border-[#E2D8C5] bg-[#F7F3EA] px-4 py-3 text-xs leading-5 text-[#746A58]">
    Contract creation is currently available for Rental · Condo, House and Townhouse deals.
  </div>
)}
          </div>

          <div className="rounded-[1.5rem] border border-[#DCD4C2] bg-white p-6">
            <div className="flex items-center gap-2"><FolderLock size={17} className="text-[#A16F32]"/><h3 className="font-display text-xl">Documents</h3></div>
            <p className="mt-2 text-xs leading-5 text-[#748078]">Private IDs, ownership documents and signed contracts will live here once private document storage is added.</p>
            <button disabled className="mt-4 h-10 w-full rounded-xl border border-[#DDD5C5] text-xs font-bold text-[#8A918C]">Upload documents — coming later</button>
          </div>

          <div className="rounded-[1.5rem] border border-[#DCD4C2] bg-[#ECE6D8] p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A602C]">Created</p>
            <p className="mt-2 text-sm font-bold">{date(deal.created_at)}</p>
            <p className="mt-4 text-xs leading-5 text-[#6D776F]">This workspace is private to BaanNest Admin under the RLS rules you already configured.</p>
          </div>
        </aside>
      </div>
    </div>
  </main>;
}

function Card({title,icon,children}:{title:string;icon:React.ReactNode;children:React.ReactNode}){return <section className="rounded-[1.5rem] border border-[#DCD4C2] bg-white p-6"><div className="flex items-center gap-2 text-[#1F2E28]"><span className="text-[#A16F32]">{icon}</span><h2 className="font-display text-2xl">{title}</h2></div><div className="mt-5">{children}</div></section>}
function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="rounded-2xl border border-[#DCD4C2] bg-white p-5"><div className="flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#8A938C]">{label}</p><span className="text-[#A16F32]">{icon}</span></div><p className="mt-2 text-sm font-bold">{value}</p></div>}
function Info({label,value}:{label:string;value:string}){return <div><p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#929A94]">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>}
function PartyBox({party,fallback,show,toggle}:{party:Party|undefined;fallback:string;show:boolean;toggle:()=>void}){
  if(!party)return <div className="rounded-xl border border-dashed border-[#D8D0BE] p-5 text-sm text-[#7A837D]">No {fallback.toLowerCase()} information found.</div>;
  const name=party.full_name_en||party.full_name_th||fallback;
  return <div className="rounded-2xl border border-[#E1D9C9] bg-[#FBFAF6] p-5">
    <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#A16F32]">{pretty(party.party_role)}</p><p className="mt-1 text-sm font-bold">{name}</p>{party.full_name_th&&party.full_name_en&&<p className="mt-1 text-xs text-[#748078]">{party.full_name_th}</p>}</div><Pencil size={14} className="text-[#A5AAA6]"/></div>
    <div className="mt-4 space-y-2 text-xs text-[#56635B]">
      {party.phone&&<p className="flex gap-2"><Phone size={13}/>{party.phone}</p>}
      {party.line_id&&<p className="flex gap-2"><MessageCircle size={13}/>LINE: {party.line_id}</p>}
      {party.email&&<p className="flex gap-2"><Mail size={13}/>{party.email}</p>}
      {party.nationality&&<p>Nationality: <b>{party.nationality}</b></p>}
      {party.id_number&&<p>ID: <b>{show?party.id_number:mask(party.id_number)}</b> <button type="button" onClick={toggle} className="ml-2 font-bold text-[#8A602C]">{show?"Hide":"Show"}</button></p>}
      {party.address&&<p className="leading-5">Address: {party.address}</p>}
      {party.company_name&&<p>Company: <b>{party.company_name}</b></p>}
    </div>
  </div>
}
function Status({status}:{status:string}){const c=status==="active"?"bg-[#DCECDF] text-[#315F3E]":status==="completed"?"bg-[#DDE8F0] text-[#3F5F78]":status==="cancelled"?"bg-[#F0DDDD] text-[#824747]":status==="awaiting_signature"?"bg-[#F4E4C7] text-[#765323]":"bg-white/10 text-[#E6E9E7]";return <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase ${c}`}>{pretty(status)}</span>}
function pretty(v:string){return v.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
function money(v:number|null|undefined,s=""){return v==null?"—":`฿${Number(v).toLocaleString()}${s}`}
function date(v:string|null|undefined){if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
function mask(v:string){const clean=v.trim();if(clean.length<=4)return"••••";return `${"•".repeat(Math.min(8,clean.length-4))}${clean.slice(-4)}`}
