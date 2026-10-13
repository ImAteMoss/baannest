"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Handshake,
  Inbox,
  BadgeDollarSign,
  Plus,
  RefreshCcw,
  Search,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Property = {
  id: string;
  title: string;
  property_type: string;
  listing_type: string;
  price: number;
  rent_price?: number | null;
  sale_price?: number | null;
  status: string;
  location: string | null;
  project_name?: string | null;
  district?: string | null;
  province?: string | null;
  created_at: string;
};

type Lead = {
  id: string;
  property_id: string;
  seeker_name: string;
  status: string;
  enquiry_type: "enquiry" | "co_work";
  next_follow_up_at: string | null;
  created_at: string;
};

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();

  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => { void loadDashboard(); }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      router.replace(`/login?returnTo=${encodeURIComponent("/admin")}`);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      router.replace("/properties");
      return;
    }

    const [propertyResult, leadResult] = await Promise.all([
      supabase
        .from("properties")
        .select("id,title,property_type,listing_type,price,rent_price,sale_price,status,location,project_name,district,province,created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("property_enquiries")
        .select("id,property_id,seeker_name,status,enquiry_type,next_follow_up_at,created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (propertyResult.error) setError(propertyResult.error.message);
    else setProperties((propertyResult.data || []) as Property[]);

    if (leadResult.error) {
      setError((current) => current || leadResult.error.message);
      setLeads([]);
    } else {
      setLeads((leadResult.data || []) as Lead[]);
    }

    setLoading(false);
  }

  const stats = useMemo(() => {
    const now = new Date();
    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);

    return {
      active: properties.filter((p) => p.status === "active").length,
      newLeads: leads.filter((x) => x.status === "new").length,
      viewings: leads.filter((x) => x.status === "viewing_arranged").length,
      negotiating: leads.filter((x) => x.status === "negotiating").length,
      coWork: leads.filter((x) => x.enquiry_type === "co_work").length,
      followUps: leads.filter((x) => {
        if (!x.next_follow_up_at || ["won", "lost"].includes(x.status)) return false;
        const d = new Date(x.next_follow_up_at);
        return d <= endToday;
      }).length,
      won: leads.filter((x) => x.status === "won").length,
      open: leads.filter((x) => !["won", "lost"].includes(x.status)).length,
    };
  }, [properties, leads]);

  const propertyMap = useMemo(() => {
    const map: Record<string, Property> = {};
    properties.forEach((p) => { map[p.id] = p; });
    return map;
  }, [properties]);

  const visibleProperties = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return properties.slice(0, 6);
    return properties.filter((p) =>
      [p.title, p.project_name, p.location, p.district, p.province, p.property_type]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    ).slice(0, 10);
  }, [properties, query]);

  const recentLeads = leads.slice(0, 5);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F3EFE5] px-6 py-12 text-[#1F2E28]">
        <div className="mx-auto max-w-7xl">
          <div className="h-12 w-72 animate-pulse rounded-xl bg-[#DDD6C3]"/>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1,2,3,4].map((x)=><div key={x} className="h-28 animate-pulse rounded-2xl bg-[#E5DFD2]"/>)}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F3EFE5] text-[#1F2E28]">
      <section className="border-b border-[#3C4B44] bg-[#1F2E28] text-[#F7F3E9]">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#C99A58]">BaanNest Management</p>
              <h1 className="mt-2 font-display text-4xl md:text-5xl">Command Center</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#C9D1CB]">
                Manage marketplace inventory, incoming property leads, co-work requests and follow-ups from one workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/admin/deals" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white transition hover:bg-white/15">
                <BadgeDollarSign size={15}/> Deals
              </Link>
              <Link href="/enquiries" className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white transition hover:bg-white/15">
                <Inbox size={15}/> Open Lead CRM
              </Link>
              <Link href="/list-property" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#C4924D] px-4 text-xs font-bold text-[#17231E] transition hover:bg-[#D2A45F]">
                <Plus size={15}/> Add property
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DarkMetric label="Active properties" value={stats.active} icon={<Building2 size={18}/>}/>
            <DarkMetric label="New leads" value={stats.newLeads} icon={<Inbox size={18}/>}/>
            <DarkMetric label="Viewings" value={stats.viewings} icon={<CalendarClock size={18}/>}/>
            <DarkMetric label="Negotiating" value={stats.negotiating} icon={<TrendingUp size={18}/>}/>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickCard href="/enquiries?type=co_work" label="Co-work requests" value={stats.coWork} icon={<Handshake size={19}/>}/>
          <QuickCard href="/enquiries" label="Open leads" value={stats.open} icon={<BriefcaseBusiness size={19}/>}/>
          <QuickCard href="/enquiries" label="Follow-ups due" value={stats.followUps} icon={<Clock3 size={19}/>}/>
          <QuickCard href="/enquiries?status=won" label="Won leads" value={stats.won} icon={<CheckCircle2 size={19}/>}/>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
          <section className="overflow-hidden rounded-[1.6rem] border border-[#DDD5C5] bg-white">
            <div className="flex items-center justify-between border-b border-[#EEE8DC] px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A16F32]">Lead pipeline</p>
                <h2 className="mt-1 font-display text-2xl">Recent enquiries</h2>
              </div>
              <Link href="/enquiries" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#657169] hover:text-[#A16F32]">View CRM <ArrowRight size={14}/></Link>
            </div>

            {recentLeads.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-[#6D7770]">No leads yet. New enquiries and co-work requests will appear here.</div>
            ) : (
              <div className="divide-y divide-[#EEE8DC]">
                {recentLeads.map((lead) => {
                  const property = propertyMap[lead.property_id];
                  return (
                    <Link key={lead.id} href="/enquiries" className="flex items-center gap-4 px-5 py-4 transition hover:bg-[#FBF9F4]">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${lead.enquiry_type === "co_work" ? "bg-[#E8F0EA] text-[#315A42]" : "bg-[#F2EEE3] text-[#A16F32]"}`}>
                        {lead.enquiry_type === "co_work" ? <Handshake size={17}/> : <Inbox size={17}/>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{property?.title || "Property enquiry"}</span>
                        <span className="mt-0.5 block truncate text-xs text-[#778078]">{lead.seeker_name} · {lead.enquiry_type === "co_work" ? "Co-work" : pretty(lead.status)}</span>
                      </span>
                      <span className="shrink-0 text-[10px] text-[#929991]">{formatShort(lead.created_at)}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-[1.6rem] border border-[#DDD5C5] bg-[#ECE6D8] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A16F32]">Workflow</p>
            <h2 className="mt-1 font-display text-2xl">BaanNest brokerage</h2>
            <p className="mt-3 text-sm leading-6 text-[#637068]">
              BaanNest remains the intermediary between the enquirer and the property lister. Private contact information stays inside the admin workflow.
            </p>
            <div className="mt-5 space-y-2">
              {[
                ["1", "Receive enquiry", "Customer or external agent contacts BaanNest."],
                ["2", "Contact both sides", "You coordinate separately with the enquirer and lister."],
                ["3", "Arrange viewing", "Track the appointment and follow-up in the CRM."],
                ["4", "Close the lead", "Move the opportunity to Won or Lost."],
              ].map(([n,title,desc])=>(
                <div key={n} className="flex gap-3 rounded-xl border border-[#D8D0BE] bg-white/65 p-3.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1F2E28] text-[10px] font-bold text-white">{n}</span>
                  <div><p className="text-xs font-bold">{title}</p><p className="mt-0.5 text-[11px] leading-5 text-[#748078]">{desc}</p></div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-8 overflow-hidden rounded-[1.6rem] border border-[#DDD5C5] bg-white">
          <div className="flex flex-col gap-4 border-b border-[#EEE8DC] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A16F32]">Marketplace inventory</p>
              <h2 className="mt-1 font-display text-2xl">Properties</h2>
            </div>
            <label className="flex h-10 items-center gap-2 rounded-xl border border-[#D8D0BE] bg-[#FBFAF6] px-3 sm:w-72">
              <Search size={14} className="text-[#879087]"/>
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search inventory" className="min-w-0 flex-1 bg-transparent text-xs outline-none"/>
            </label>
          </div>

          {visibleProperties.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-[#6D7770]">No properties match this search.</div>
          ) : (
            <div className="divide-y divide-[#EEE8DC]">
              {visibleProperties.map((property)=>(
                <div key={property.id} className="flex flex-col gap-4 px-5 py-4 transition hover:bg-[#FBF9F4] md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#A16F32]">{pretty(property.property_type)}</span>
                      <span className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${property.status === "active" ? "bg-[#EEF6EF] text-[#39704A]" : "bg-[#F1F1EE] text-[#707870]"}`}>{pretty(property.status)}</span>
                      <span className="rounded-full bg-[#F2EEE3] px-2 py-1 text-[9px] font-bold uppercase text-[#657169]">{property.listing_type === "both" ? "Rent & Sale" : pretty(property.listing_type)}</span>
                    </div>
                    <p className="mt-2 truncate text-sm font-bold">{property.title}</p>
                    <p className="mt-1 truncate text-xs text-[#778078]">{[property.project_name, property.district, property.province].filter(Boolean).join(" · ") || property.location || "Thailand"}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 md:justify-end">
                    <div className="text-right">
                      {property.listing_type === "both" ? (
                        <>
                          <p className="text-xs font-bold">฿{Number(property.rent_price ?? property.price).toLocaleString()} <span className="font-normal text-[#7B847E]">/mo</span></p>
                          <p className="mt-0.5 text-xs font-bold">฿{Number(property.sale_price ?? property.price).toLocaleString()} sale</p>
                        </>
                      ) : (
                        <p className="text-sm font-bold">฿{Number(property.listing_type === "rent" ? (property.rent_price ?? property.price) : (property.sale_price ?? property.price)).toLocaleString()}{property.listing_type === "rent" && <span className="font-normal text-[#7B847E]"> /mo</span>}</p>
                      )}
                    </div>
                    <Link href={`/properties/${property.id}`} className="rounded-xl border border-[#D8D0BE] px-3 py-2 text-xs font-bold hover:border-[#1F2E28]">View</Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-[#EEE8DC] bg-[#FBFAF6] px-5 py-4">
            <p className="text-xs text-[#7B847E]">{properties.length} properties in marketplace</p>
            <Link href="/properties" className="inline-flex items-center gap-1.5 text-xs font-bold hover:text-[#A16F32]">Marketplace <ArrowRight size={14}/></Link>
          </div>
        </section>
      </section>

      <footer className="mt-10 border-t border-[#DDD5C5]">
        <div className="mx-auto max-w-7xl px-6 py-8 text-xs text-[#788179]">© 2026 BaanNest · Admin</div>
      </footer>
    </main>
  );
}

function DarkMetric({label,value,icon}:{label:string;value:number;icon:React.ReactNode}) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#AEBAB3]">{label}</p><span className="text-[#D0A260]">{icon}</span></div><p className="mt-2 font-display text-3xl text-white">{value}</p></div>;
}

function QuickCard({href,label,value,icon}:{href:string;label:string;value:number;icon:React.ReactNode}) {
  return <Link href={href} className="group rounded-2xl border border-[#DDD5C5] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#C9B999] hover:shadow-[0_10px_30px_rgba(31,46,40,0.06)]"><div className="flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2EEE3] text-[#A16F32]">{icon}</span><ArrowRight size={15} className="text-[#9AA19B] transition group-hover:translate-x-0.5"/></div><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7B847E]">{label}</p><p className="mt-1 font-display text-3xl">{value}</p></Link>;
}

function pretty(value:string) {
  return value.replace(/_/g," ").replace(/\b\w/g,(c)=>c.toUpperCase());
}

function formatShort(value:string) {
  const d=new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-GB",{day:"numeric",month:"short"});
}
