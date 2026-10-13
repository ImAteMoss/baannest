"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Deal = {
  id:string; deal_number:string|null; deal_type:string|null; property_type:string|null; status:string;
  source:string|null; source_detail:string|null; is_external_property:boolean|null;
  external_property_name:string|null; external_property_address:string|null;
  agreed_price:number|null; monthly_rent:number|null; security_deposit:number|null; advance_rent:number|null;
  commission_amount:number|null; co_agent_commission:number|null; lease_start_date:string|null;
  lease_end_date:string|null; contract_date:string|null; internal_notes:string|null;
};
type Party = {
  id:string; party_role:string; full_name_th:string|null; full_name_en:string|null; phone:string|null;
  line_id:string|null; email:string|null; id_type:string|null; id_number:string|null; nationality:string|null;
  address:string|null; company_name:string|null; company_registration_number:string|null; notes:string|null;
};

const inp="mt-2 h-12 w-full rounded-xl border border-[#D8D0BE] bg-white px-4 text-sm outline-none focus:border-[#B8863F] focus:ring-4 focus:ring-[#B8863F]/10";
const area="mt-2 w-full rounded-xl border border-[#D8D0BE] bg-white px-4 py-3 text-sm outline-none focus:border-[#B8863F] focus:ring-4 focus:ring-[#B8863F]/10";

export default function EditDealPage(){
  const supabase=createClient(), router=useRouter(), params=useParams();
  const id=String(params.id||"");
  const [deal,setDeal]=useState<Deal|null>(null);
  const [parties,setParties]=useState<Party[]>([]);
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState("");

  useEffect(()=>{void load()},[id]);

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){router.replace(`/login?returnTo=${encodeURIComponent(`/admin/deals/${id}/edit`)}`);return}
    const {data:profile}=await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
    if(profile?.role!=="admin"){router.replace("/properties");return}
    const [{data:d,error:de},{data:ps,error:pe}]=await Promise.all([
      supabase.from("deals").select("id,deal_number,deal_type,property_type,status,source,source_detail,is_external_property,external_property_name,external_property_address,agreed_price,monthly_rent,security_deposit,advance_rent,commission_amount,co_agent_commission,lease_start_date,lease_end_date,contract_date,internal_notes").eq("id",id).single(),
      supabase.from("deal_parties").select("id,party_role,full_name_th,full_name_en,phone,line_id,email,id_type,id_number,nationality,address,company_name,company_registration_number,notes").eq("deal_id",id)
    ]);
    if(de||pe||!d){setError(de?.message||pe?.message||"Deal not found");setLoading(false);return}
    setDeal(d as Deal);setParties((ps||[]) as Party[]);setLoading(false);
  }

  function d<K extends keyof Deal>(key:K,value:Deal[K]){setDeal(x=>x?{...x,[key]:value}:x)}
  function p(pid:string,key:keyof Party,value:string|null){setParties(x=>x.map(a=>a.id===pid?{...a,[key]:value}:a))}
  const n=(v:string)=>v.trim()===""?null:Number(v.replace(/,/g,""));
  const s=(v:any)=>v==null?"":String(v);

  async function save(e:FormEvent){
    e.preventDefault(); if(!deal)return; setSaving(true);setError("");
    const {error:de}=await supabase.from("deals").update({
      source:deal.source||"baannest",source_detail:deal.source_detail||null,
      external_property_name:deal.external_property_name||null,external_property_address:deal.external_property_address||null,
      monthly_rent:deal.deal_type==="rental"?deal.monthly_rent:null,agreed_price:deal.deal_type==="sale"?deal.agreed_price:null,
      security_deposit:deal.deal_type==="rental"?deal.security_deposit:null,advance_rent:deal.deal_type==="rental"?deal.advance_rent:null,
      commission_amount:deal.commission_amount,co_agent_commission:deal.co_agent_commission,
      lease_start_date:deal.deal_type==="rental"?deal.lease_start_date:null,lease_end_date:deal.deal_type==="rental"?deal.lease_end_date:null,
      contract_date:deal.contract_date||null,internal_notes:deal.internal_notes||null,updated_at:new Date().toISOString()
    }).eq("id",deal.id);
    if(de){setError(de.message);setSaving(false);return}
    for(const party of parties){
      const {error:pe}=await supabase.from("deal_parties").update({
        full_name_th:party.full_name_th||null,full_name_en:party.full_name_en||null,phone:party.phone||null,
        line_id:party.line_id||null,email:party.email||null,id_type:party.id_type||null,id_number:party.id_number||null,
        nationality:party.nationality||null,address:party.address||null,company_name:party.company_name||null,
        company_registration_number:party.company_registration_number||null,notes:party.notes||null,updated_at:new Date().toISOString()
      }).eq("id",party.id);
      if(pe){setError(pe.message);setSaving(false);return}
    }
    router.push(`/admin/deals/${deal.id}`);router.refresh();
  }

  if(loading)return <main className="min-h-screen bg-[#F3EFE5] p-10">Loading deal…</main>;
  if(!deal)return <main className="min-h-screen bg-[#F3EFE5] p-10"><p className="text-red-700">{error||"Deal not found"}</p></main>;
  const a=parties.find(x=>["landlord","seller"].includes(x.party_role));
  const b=parties.find(x=>["tenant","buyer"].includes(x.party_role));

  return <main className="min-h-screen bg-[#F3EFE5] text-[#1F2E28]">
    <section className="bg-[#1F2E28] text-white"><div className="mx-auto max-w-6xl px-6 py-9">
      <Link href={`/admin/deals/${id}`} className="inline-flex items-center gap-2 text-xs font-bold text-[#BFC9C2]"><ArrowLeft size={14}/> Deal workspace</Link>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[.18em] text-[#C99A58]">{deal.deal_number}</p>
      <h1 className="mt-2 font-display text-4xl">Edit deal</h1>
      <p className="mt-2 text-sm text-[#C9D1CB]">Correct transaction and party information before preparing the contract.</p>
    </div></section>

    <form onSubmit={save} className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <Card title="Deal identity">
        <div className="grid gap-4 sm:grid-cols-3">
          <Read label="Deal number" value={deal.deal_number||"—"}/><Read label="Deal type" value={pretty(deal.deal_type||"—")}/><Read label="Property type" value={pretty(deal.property_type||"—")}/>
        </div>
        <p className="mt-4 text-xs text-[#7A837D]">Deal type, property type and deal number are intentionally locked here. Changing those can affect the future contract template.</p>
      </Card>

      <Card title="Source & property">
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Source"><select value={deal.source||"baannest"} onChange={e=>d("source",e.target.value)} className={inp}><option value="baannest">BaanNest</option><option value="facebook">Facebook</option><option value="line">LINE</option><option value="external_website">External website</option><option value="external_agent">External agent</option><option value="referral">Referral</option><option value="other">Other</option></select></F>
          <F label="Source detail"><input value={deal.source_detail||""} onChange={e=>d("source_detail",e.target.value)} className={inp}/></F>
          {deal.is_external_property&&<><F label="External property / project"><input value={deal.external_property_name||""} onChange={e=>d("external_property_name",e.target.value)} className={inp}/></F><F label="External property address"><textarea rows={3} value={deal.external_property_address||""} onChange={e=>d("external_property_address",e.target.value)} className={area}/></F></>}
        </div>
        {!deal.is_external_property&&<p className="mt-4 text-xs text-[#7A837D]">This deal is linked to a BaanNest listing. Edit the listing itself if its property information is wrong.</p>}
      </Card>

      {a&&<PartyEditor title={deal.deal_type==="rental"?"Landlord":"Seller"} party={a} change={p}/>}
      {b&&<PartyEditor title={deal.deal_type==="rental"?"Tenant":"Buyer"} party={b} change={p}/>}

      <Card title="Financial terms">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deal.deal_type==="rental"?<>
            <Money label="Monthly rent" value={s(deal.monthly_rent)} set={v=>d("monthly_rent",n(v))}/>
            <Money label="Security deposit" value={s(deal.security_deposit)} set={v=>d("security_deposit",n(v))}/>
            <Money label="Advance rent" value={s(deal.advance_rent)} set={v=>d("advance_rent",n(v))}/>
          </>:<Money label="Agreed sale price" value={s(deal.agreed_price)} set={v=>d("agreed_price",n(v))}/>}
          <Money label="BaanNest commission" value={s(deal.commission_amount)} set={v=>d("commission_amount",n(v))}/>
          <Money label="Co-agent commission" value={s(deal.co_agent_commission)} set={v=>d("co_agent_commission",n(v))}/>
        </div>
      </Card>

      <Card title="Dates">
        <div className="grid gap-4 sm:grid-cols-3">
          {deal.deal_type==="rental"&&<><F label="Lease start"><input type="date" value={deal.lease_start_date||""} onChange={e=>d("lease_start_date",e.target.value)} className={inp}/></F><F label="Lease end"><input type="date" value={deal.lease_end_date||""} onChange={e=>d("lease_end_date",e.target.value)} className={inp}/></F></>}
          <F label="Contract date"><input type="date" value={deal.contract_date||""} onChange={e=>d("contract_date",e.target.value)} className={inp}/></F>
        </div>
      </Card>

      <Card title="Internal notes"><textarea rows={5} value={deal.internal_notes||""} onChange={e=>d("internal_notes",e.target.value)} className={area}/></Card>

      <div className="sticky bottom-4 flex justify-end gap-3 rounded-2xl border border-[#DCD4C2] bg-white/95 p-4 shadow-xl backdrop-blur">
        <Link href={`/admin/deals/${id}`} className="inline-flex h-11 items-center px-5 text-xs font-bold text-[#68736C]">Cancel</Link>
        <button disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#1F2E28] px-5 text-xs font-bold text-white disabled:opacity-50"><Save size={15}/>{saving?"Saving…":"Save changes"}</button>
      </div>
    </form>
  </main>
}

function Card({title,children}:{title:string;children:React.ReactNode}){return <section className="rounded-[1.5rem] border border-[#DCD4C2] bg-white p-6"><h2 className="font-display text-2xl">{title}</h2><div className="mt-5">{children}</div></section>}
function F({label,children}:{label:string;children:React.ReactNode}){return <label className="block text-xs font-bold text-[#46544C]">{label}{children}</label>}
function Read({label,value}:{label:string;value:string}){return <div><p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#929A94]">{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div>}
function Money({label,value,set}:{label:string;value:string;set:(v:string)=>void}){return <F label={label}><div className="relative"><span className="absolute left-4 top-[22px] font-bold text-[#8A602C]">฿</span><input value={value} onChange={e=>set(e.target.value.replace(/[^\d.,]/g,""))} className={`${inp} pl-9`} inputMode="decimal"/></div></F>}
function PartyEditor({title,party,change}:{title:string;party:Party;change:(id:string,k:keyof Party,v:string|null)=>void}){return <Card title={title}><div className="grid gap-4 sm:grid-cols-2">
  <F label="Full name (Thai)"><input value={party.full_name_th||""} onChange={e=>change(party.id,"full_name_th",e.target.value)} className={inp}/></F>
  <F label="Full name (English)"><input value={party.full_name_en||""} onChange={e=>change(party.id,"full_name_en",e.target.value)} className={inp}/></F>
  <F label="Phone"><input value={party.phone||""} onChange={e=>change(party.id,"phone",e.target.value)} className={inp}/></F>
  <F label="LINE ID"><input value={party.line_id||""} onChange={e=>change(party.id,"line_id",e.target.value)} className={inp}/></F>
  <F label="Email"><input type="email" value={party.email||""} onChange={e=>change(party.id,"email",e.target.value)} className={inp}/></F>
  <F label="Nationality"><input value={party.nationality||""} onChange={e=>change(party.id,"nationality",e.target.value)} className={inp}/></F>
  <F label="ID type"><select value={party.id_type||""} onChange={e=>change(party.id,"id_type",e.target.value)} className={inp}><option value="">Select</option><option value="thai_id">Thai ID</option><option value="passport">Passport</option><option value="company_registration">Company registration</option><option value="other">Other</option></select></F>
  <F label="ID / passport number"><input value={party.id_number||""} onChange={e=>change(party.id,"id_number",e.target.value)} className={inp}/></F>
  <div className="sm:col-span-2"><F label="Contract address"><textarea rows={3} value={party.address||""} onChange={e=>change(party.id,"address",e.target.value)} className={area}/></F></div>
  <F label="Company name"><input value={party.company_name||""} onChange={e=>change(party.id,"company_name",e.target.value)} className={inp}/></F>
  <F label="Company registration number"><input value={party.company_registration_number||""} onChange={e=>change(party.id,"company_registration_number",e.target.value)} className={inp}/></F>
  <div className="sm:col-span-2"><F label="Private party notes"><textarea rows={2} value={party.notes||""} onChange={e=>change(party.id,"notes",e.target.value)} className={area}/></F></div>
</div></Card>}
function pretty(v:string){return v.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
