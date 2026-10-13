"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Check, ChevronDown, ExternalLink, Save, Search, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PropertyLite = {
  id: string;
  title: string;
  project_name: string | null;
  location: string | null;
  rent_price: number | null;
  sale_price: number | null;
  property_type: string | null;
};

type PartyForm = {
  full_name_th: string;
  full_name_en: string;
  phone: string;
  line_id: string;
  email: string;
  id_type: string;
  id_number: string;
  nationality: string;
  address: string;
  company_name: string;
  company_registration_number: string;
  notes: string;
};

const emptyParty = (): PartyForm => ({
  full_name_th: "", full_name_en: "", phone: "", line_id: "", email: "",
  id_type: "", id_number: "", nationality: "", address: "", company_name: "",
  company_registration_number: "", notes: "",
});

const input = "mt-2 h-12 w-full rounded-xl border border-[#D8D0BE] bg-white px-4 text-sm outline-none transition focus:border-[#B8863F] focus:ring-4 focus:ring-[#B8863F]/10";
const area = "mt-2 w-full rounded-xl border border-[#D8D0BE] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#B8863F] focus:ring-4 focus:ring-[#B8863F]/10";

export default function NewDealPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [properties, setProperties] = useState<PropertyLite[]>([]);
  const [propertySearch, setPropertySearch] = useState("");

  const [dealType, setDealType] = useState<"rental" | "sale">("rental");
  const [propertyMode, setPropertyMode] = useState<"baannest" | "external">("baannest");
  const [propertyId, setPropertyId] = useState("");
  const [externalName, setExternalName] = useState("");
  const [externalAddress, setExternalAddress] = useState("");
  const [externalPropertyType, setExternalPropertyType] = useState("");
  const [source, setSource] = useState("baannest");
  const [sourceDetail, setSourceDetail] = useState("");

  const [partyA, setPartyA] = useState<PartyForm>(emptyParty());
  const [partyB, setPartyB] = useState<PartyForm>(emptyParty());

  const [monthlyRent, setMonthlyRent] = useState("");
  const [agreedPrice, setAgreedPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [advanceRent, setAdvanceRent] = useState("");
  const [leaseStart, setLeaseStart] = useState("");
  const [leaseEnd, setLeaseEnd] = useState("");
  const [contractDate, setContractDate] = useState("");
  const [commission, setCommission] = useState("");
  const [coAgentCommission, setCoAgentCommission] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      router.replace(`/login?returnTo=${encodeURIComponent("/admin/deals/new")}`);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") {
      router.replace("/properties");
      return;
    }

    const { data } = await supabase
      .from("properties")
      .select("id,title,project_name,location,rent_price,sale_price,property_type")
      .order("created_at", { ascending: false })
      .limit(500);

    setProperties((data || []) as PropertyLite[]);
    setLoading(false);
  }

  const selectedProperty = properties.find((p) => p.id === propertyId) || null;
  const resolvedPropertyType =
    propertyMode === "baannest"
      ? selectedProperty?.property_type || ""
      : externalPropertyType;

  const filteredProperties = useMemo(() => {
    const q = propertySearch.trim().toLowerCase();
    if (!q) return properties.slice(0, 30);
    return properties.filter((p) =>
      [p.title, p.project_name, p.location].filter(Boolean).join(" ").toLowerCase().includes(q)
    ).slice(0, 30);
  }, [properties, propertySearch]);

  function updateParty(which: "a" | "b", field: keyof PartyForm, value: string) {
    const setter = which === "a" ? setPartyA : setPartyB;
    setter((old) => ({ ...old, [field]: value }));
  }

  function num(v: string) {
    return v.trim() === "" ? null : Number(v.replace(/,/g, ""));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (propertyMode === "baannest" && !propertyId) return setError("Choose a BaanNest property.");
    if (propertyMode === "external" && !externalName.trim()) return setError("Enter the external property name.");
    if (propertyMode === "external" && !externalPropertyType) return setError("Choose the external property type.");
    if (!resolvedPropertyType) return setError("This property does not have a property type yet. Choose or update its property type before creating the deal.");
    if (!partyA.full_name_th.trim() && !partyA.full_name_en.trim()) return setError(`Enter the ${dealType === "rental" ? "landlord" : "seller"} name.`);
    if (!partyB.full_name_th.trim() && !partyB.full_name_en.trim()) return setError(`Enter the ${dealType === "rental" ? "tenant" : "buyer"} name.`);
    if (dealType === "rental" && !monthlyRent) return setError("Enter the agreed monthly rent.");
    if (dealType === "sale" && !agreedPrice) return setError("Enter the agreed sale price.");

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return setError("Your session expired. Please sign in again."); }

    const dealNumber = `BN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const { data: deal, error: dealError } = await supabase.from("deals").insert({
      deal_number: dealNumber,
      deal_type: dealType,
      status: "preparing_contract",
      source,
      source_detail: sourceDetail.trim() || null,
      property_id: propertyMode === "baannest" ? propertyId : null,
      enquiry_id: null,
      is_external_property: propertyMode === "external",
      external_property_name: propertyMode === "external" ? externalName.trim() : null,
      external_property_address: propertyMode === "external" ? externalAddress.trim() || null : null,
      property_type: resolvedPropertyType,
      monthly_rent: dealType === "rental" ? num(monthlyRent) : null,
      agreed_price: dealType === "sale" ? num(agreedPrice) : null,
      security_deposit: dealType === "rental" ? num(deposit) : null,
      advance_rent: dealType === "rental" ? num(advanceRent) : null,
      commission_amount: num(commission),
      co_agent_commission: num(coAgentCommission),
      lease_start_date: dealType === "rental" ? leaseStart || null : null,
      lease_end_date: dealType === "rental" ? leaseEnd || null : null,
      contract_date: contractDate || null,
      internal_notes: notes.trim() || null,
      created_by: user.id,
    }).select("id").single();

    if (dealError || !deal) {
      setSaving(false);
      return setError(dealError?.message || "Could not create deal.");
    }

    const partyRows = [
      {
        deal_id: deal.id,
        party_role: dealType === "rental" ? "landlord" : "seller",
        ...cleanParty(partyA),
      },
      {
        deal_id: deal.id,
        party_role: dealType === "rental" ? "tenant" : "buyer",
        ...cleanParty(partyB),
      },
    ];

    const { error: partyError } = await supabase.from("deal_parties").insert(partyRows);

    if (partyError) {
      await supabase.from("deals").delete().eq("id", deal.id);
      setSaving(false);
      return setError(`Deal parties could not be saved: ${partyError.message}`);
    }

    router.push(`/admin/deals/${deal.id}`);
  }

  if (loading) return <main className="min-h-screen bg-[#F3EFE5] px-6 py-12"><div className="mx-auto max-w-6xl"><div className="h-12 w-72 animate-pulse rounded-xl bg-[#DDD6C3]"/></div></main>;

  const roleA = dealType === "rental" ? "Landlord" : "Seller";
  const roleB = dealType === "rental" ? "Tenant" : "Buyer";

  return (
    <main className="min-h-screen bg-[#F3EFE5] text-[#1F2E28]">
      <section className="border-b border-[#3C4B44] bg-[#1F2E28] text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <Link href="/admin/deals" className="inline-flex items-center gap-2 text-xs font-bold text-[#BFC9C2] hover:text-white"><ArrowLeft size={14}/> Deals</Link>
          <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C99A58]">BaanNest Brokerage</p>
          <h1 className="mt-2 font-display text-4xl">Create a deal</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#C9D1CB]">Record a confirmed transaction. This is separate from an enquiry and becomes the workspace for contract, parties and documents.</p>
        </div>
      </section>

      <form onSubmit={submit} className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

          <Card n="01" title="Deal type" subtitle="What transaction are you recording?">
            <div className="grid gap-3 sm:grid-cols-2">
              <Choice active={dealType==="rental"} onClick={()=>setDealType("rental")} title="Rental" text="Landlord → Tenant · lease dates and monthly rent"/>
              <Choice active={dealType==="sale"} onClick={()=>setDealType("sale")} title="Sale" text="Seller → Buyer · agreed sale price"/>
            </div>
          </Card>

          <Card n="02" title="Property" subtitle="Use a BaanNest listing or record a property that came from somewhere else.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Choice active={propertyMode==="baannest"} onClick={()=>setPropertyMode("baannest")} title="BaanNest property" text="Select an existing property"/>
              <Choice active={propertyMode==="external"} onClick={()=>setPropertyMode("external")} title="External / unlisted" text="Facebook, LINE, another website or offline"/>
            </div>

            {propertyMode === "baannest" ? (
              <div className="mt-5">
                <label className="text-sm font-bold">Find property *</label>
                <div className="relative mt-2"><Search className="absolute left-4 top-3.5 text-[#899089]" size={16}/><input value={propertySearch} onChange={e=>setPropertySearch(e.target.value)} placeholder="Search title, project or location..." className={`${input} mt-0 pl-11`}/></div>
                <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-[#E1D9C9] bg-[#FBFAF6]">
                  {filteredProperties.map(p=><button key={p.id} type="button" onClick={()=>setPropertyId(p.id)} className={`flex w-full items-center justify-between gap-3 border-b border-[#EEE8DC] px-4 py-3 text-left last:border-0 ${propertyId===p.id?"bg-[#EEF2EC]":"hover:bg-white"}`}><div className="min-w-0"><p className="truncate text-sm font-bold">{p.title}</p><p className="mt-1 truncate text-xs text-[#778078]">{[p.project_name,p.location].filter(Boolean).join(" · ") || "No location"}</p></div>{propertyId===p.id&&<Check size={17} className="shrink-0 text-[#39704A]"/>}</button>)}
                  {filteredProperties.length===0&&<p className="p-4 text-xs text-[#778078]">No matching properties.</p>}
                </div>
                {selectedProperty && (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-[#DDE5DC] bg-[#F3F7F1] px-4 py-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#728078]">Detected property type</p>
                      <p className="mt-1 text-sm font-bold">{selectedProperty.property_type ? pretty(selectedProperty.property_type) : "Missing property type"}</p>
                    </div>
                    {selectedProperty.property_type ? <Check size={17} className="text-[#39704A]"/> : <span className="text-xs font-bold text-[#9A6334]">Update listing first</span>}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                <div>
                  <p className="text-xs font-bold text-[#46544C]">Property type *</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                      ["condo", "Condo"],
                      ["house", "House"],
                      ["townhouse", "Townhouse"],
                      ["land", "Land"],
                      ["commercial", "Commercial"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setExternalPropertyType(value)}
                        className={`rounded-xl border px-3 py-3 text-xs font-bold transition ${
                          externalPropertyType === value
                            ? "border-[#1F2E28] bg-[#EEF2EC] text-[#1F2E28] ring-1 ring-[#1F2E28]"
                            : "border-[#DDD5C5] bg-white text-[#68736C] hover:border-[#B9AE98]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Property / project name *"><input value={externalName} onChange={e=>setExternalName(e.target.value)} placeholder="e.g. Life Ladprao, Unit 1802" className={input}/></Field>
                <Field label="Property address"><textarea value={externalAddress} onChange={e=>setExternalAddress(e.target.value)} rows={3} placeholder="Full property address for the deal / contract" className={area}/></Field>
              </div>
            )}
          </Card>

          <Card n="03" title="Lead source" subtitle="Where did this transaction originally come from?">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Source"><select value={source} onChange={e=>setSource(e.target.value)} className={input}><option value="baannest">BaanNest</option><option value="facebook">Facebook</option><option value="line">LINE</option><option value="external_website">External website</option><option value="external_agent">External agent</option><option value="referral">Referral</option><option value="other">Other</option></select></Field>
              <Field label="Source detail"><input value={sourceDetail} onChange={e=>setSourceDetail(e.target.value)} placeholder="e.g. Facebook Marketplace / agent name" className={input}/></Field>
            </div>
          </Card>

          <PartyCard n="04" title={roleA} subtitle={`${roleA} information for this transaction and future contract.`} value={partyA} onChange={(f,v)=>updateParty("a",f,v)}/>
          <PartyCard n="05" title={roleB} subtitle={`${roleB} information for this transaction and future contract.`} value={partyB} onChange={(f,v)=>updateParty("b",f,v)}/>

          <Card n="06" title="Transaction terms" subtitle="Record the agreed financial terms, not the advertised asking price.">
            {dealType==="rental" ? <div className="grid gap-4 sm:grid-cols-2">
              <Money label="Monthly rent *" value={monthlyRent} set={setMonthlyRent}/>
              <Money label="Security deposit" value={deposit} set={setDeposit}/>
              <Money label="Advance rent" value={advanceRent} set={setAdvanceRent}/>
              <Money label="BaanNest commission" value={commission} set={setCommission}/>
              <Money label="Co-agent commission" value={coAgentCommission} set={setCoAgentCommission}/>
            </div> : <div className="grid gap-4 sm:grid-cols-2">
              <Money label="Agreed sale price *" value={agreedPrice} set={setAgreedPrice}/>
              <Money label="BaanNest commission" value={commission} set={setCommission}/>
              <Money label="Co-agent commission" value={coAgentCommission} set={setCoAgentCommission}/>
            </div>}
          </Card>

          <Card n="07" title={dealType==="rental"?"Lease & contract dates":"Contract date"} subtitle="These dates will later be available to the contract generator.">
            <div className="grid gap-4 sm:grid-cols-3">
              {dealType==="rental"&&<><Field label="Lease start"><input type="date" value={leaseStart} onChange={e=>setLeaseStart(e.target.value)} className={input}/></Field><Field label="Lease end"><input type="date" value={leaseEnd} onChange={e=>setLeaseEnd(e.target.value)} className={input}/></Field></>}
              <Field label="Contract date"><input type="date" value={contractDate} onChange={e=>setContractDate(e.target.value)} className={input}/></Field>
            </div>
          </Card>

          <Card n="08" title="Internal notes" subtitle="Private BaanNest notes. These are not part of the contract.">
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={5} placeholder="Negotiation notes, special conditions, follow-ups..." className={area}/>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[1.6rem] border border-[#DCD4C2] bg-white p-6 shadow-[0_18px_50px_rgba(31,46,40,0.08)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A16F32]">Deal summary</p>
            <h2 className="mt-2 font-display text-2xl">{dealType==="rental"?"Rental deal":"Sale deal"}</h2>
            <p className="mt-1 text-xs font-bold text-[#8A602C]">
              {resolvedPropertyType ? `${pretty(dealType)} · ${pretty(resolvedPropertyType)}` : `${pretty(dealType)} · Property type not set`}
            </p>
            <Summary icon={<Building2 size={15}/>} label="Property" value={propertyMode==="external"?(externalName||"External property"):(selectedProperty?.title||"Choose property")}/>
            <Summary icon={<UserRound size={15}/>} label={roleA} value={partyA.full_name_en||partyA.full_name_th||`Add ${roleA.toLowerCase()}`}/>
            <Summary icon={<UserRound size={15}/>} label={roleB} value={partyB.full_name_en||partyB.full_name_th||`Add ${roleB.toLowerCase()}`}/>
            <Summary icon={<ExternalLink size={15}/>} label="Source" value={pretty(source)}/>
            <div className="mt-5 rounded-xl bg-[#F7F3EA] p-4"><p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#8A602C]">{dealType==="rental"?"Agreed rent":"Agreed price"}</p><p className="mt-1 font-display text-2xl">{dealType==="rental"?money(monthlyRent, "/mo"):money(agreedPrice)}</p></div>
            <div className="mt-5 border-t border-[#EEE8DC] pt-5">
              <p className="text-xs leading-5 text-[#748078]">Creating the deal saves the transaction and both parties. It starts in <b>Preparing Contract</b>.</p>
              <button disabled={saving} type="submit" className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1F2E28] px-5 text-xs font-bold text-white transition hover:bg-[#2D4037] disabled:opacity-50"><Save size={15}/>{saving?"Creating deal...":"Create deal"}</button>
              <Link href="/admin/deals" className="mt-2 flex h-11 items-center justify-center text-xs font-bold text-[#68736C]">Cancel</Link>
            </div>
          </div>
        </aside>
      </form>
    </main>
  );
}

function cleanParty(p: PartyForm) {
  return {
    full_name_th: p.full_name_th.trim() || null, full_name_en: p.full_name_en.trim() || null,
    phone: p.phone.trim() || null, line_id: p.line_id.trim() || null, email: p.email.trim() || null,
    id_type: p.id_type || null, id_number: p.id_number.trim() || null, nationality: p.nationality.trim() || null,
    address: p.address.trim() || null, company_name: p.company_name.trim() || null,
    company_registration_number: p.company_registration_number.trim() || null, notes: p.notes.trim() || null,
  };
}
function Card({n,title,subtitle,children}:{n:string;title:string;subtitle:string;children:React.ReactNode}) {
  return <section className="rounded-[1.6rem] border border-[#DCD4C2] bg-white p-6 md:p-7"><div className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1F2E28] text-xs font-bold text-white">{n}</span><div><h2 className="font-display text-2xl">{title}</h2><p className="mt-1 text-xs leading-5 text-[#748078]">{subtitle}</p></div></div><div className="mt-6">{children}</div></section>;
}
function Choice({active,onClick,title,text}:{active:boolean;onClick:()=>void;title:string;text:string}) {
  return <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left transition ${active?"border-[#1F2E28] bg-[#EEF2EC] ring-1 ring-[#1F2E28]":"border-[#DDD5C5] bg-white hover:border-[#B9AE98]"}`}><div className="flex items-center justify-between"><p className="text-sm font-bold">{title}</p>{active&&<Check size={16}/>}</div><p className="mt-1 text-xs leading-5 text-[#748078]">{text}</p></button>;
}
function Field({label,children}:{label:string;children:React.ReactNode}) { return <label className="block text-xs font-bold text-[#46544C]">{label}{children}</label>; }
function Money({label,value,set}:{label:string;value:string;set:(v:string)=>void}) { return <Field label={label}><div className="relative"><span className="absolute left-4 top-[22px] text-sm font-bold text-[#8A602C]">฿</span><input inputMode="decimal" value={value} onChange={e=>set(e.target.value.replace(/[^\d.,]/g,""))} placeholder="0" className={`${input} pl-9`}/></div></Field>; }
function PartyCard({n,title,subtitle,value,onChange}:{n:string;title:string;subtitle:string;value:PartyForm;onChange:(f:keyof PartyForm,v:string)=>void}) {
  return <Card n={n} title={title} subtitle={subtitle}><div className="grid gap-4 sm:grid-cols-2">
    <Field label="Full name (Thai)"><input value={value.full_name_th} onChange={e=>onChange("full_name_th",e.target.value)} placeholder="ชื่อ-นามสกุล" className={input}/></Field>
    <Field label="Full name (English)"><input value={value.full_name_en} onChange={e=>onChange("full_name_en",e.target.value)} placeholder="Full legal name" className={input}/></Field>
    <Field label="Phone"><input value={value.phone} onChange={e=>onChange("phone",e.target.value)} placeholder="Phone number" className={input}/></Field>
    <Field label="LINE ID"><input value={value.line_id} onChange={e=>onChange("line_id",e.target.value)} placeholder="LINE ID" className={input}/></Field>
    <Field label="Email"><input type="email" value={value.email} onChange={e=>onChange("email",e.target.value)} placeholder="Email address" className={input}/></Field>
    <Field label="Nationality"><input value={value.nationality} onChange={e=>onChange("nationality",e.target.value)} placeholder="e.g. Thai, British" className={input}/></Field>
    <Field label="ID type"><select value={value.id_type} onChange={e=>onChange("id_type",e.target.value)} className={input}><option value="">Select ID type</option><option value="thai_id">Thai ID</option><option value="passport">Passport</option><option value="company_registration">Company registration</option><option value="other">Other</option></select></Field>
    <Field label="ID / passport number"><input value={value.id_number} onChange={e=>onChange("id_number",e.target.value)} placeholder="Identification number" className={input}/></Field>
    <div className="sm:col-span-2"><Field label="Contract address"><textarea value={value.address} onChange={e=>onChange("address",e.target.value)} rows={3} placeholder="Address to appear in the contract" className={area}/></Field></div>
    <Field label="Company name (optional)"><input value={value.company_name} onChange={e=>onChange("company_name",e.target.value)} className={input}/></Field>
    <Field label="Company registration no. (optional)"><input value={value.company_registration_number} onChange={e=>onChange("company_registration_number",e.target.value)} className={input}/></Field>
    <div className="sm:col-span-2"><Field label="Party notes (private)"><textarea value={value.notes} onChange={e=>onChange("notes",e.target.value)} rows={2} className={area}/></Field></div>
  </div></Card>;
}
function Summary({icon,label,value}:{icon:React.ReactNode;label:string;value:string}) { return <div className="mt-4 flex gap-3 border-t border-[#EEE8DC] pt-4"><span className="mt-0.5 text-[#A16F32]">{icon}</span><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#969D97]">{label}</p><p className="mt-1 truncate text-xs font-bold">{value}</p></div></div>; }
function pretty(v:string){return v.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
function money(v:string,s=""){const n=Number(v.replace(/,/g,""));return !v||Number.isNaN(n)?"฿—":`฿${n.toLocaleString()}${s}`}
