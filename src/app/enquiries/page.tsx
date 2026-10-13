"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, CalendarDays, CheckCircle2, Inbox, Phone, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Enquiry = {
  id: string;
  property_id: string;
  seeker_id: string;
  seeker_name: string;
  seeker_phone: string;
  seeker_email: string | null;
  preferred_contact: string;
  viewing_date: string | null;
  message: string;
  status: string;
  internal_notes: string | null;
  next_follow_up_at: string | null;
  enquiry_type: "enquiry" | "co_work";
  created_at: string;
};

type ListerProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string | null;
};

type PropertyLite = {
  id: string;
  title: string;
  price: number;
  listing_type: string;
  project_name: string | null;
  owner_id: string;
};

const STATUSES = [
  "new",
  "seeker_contacted",
  "lister_contacted",
  "viewing_arranged",
  "negotiating",
  "won",
  "lost",
];

export default function EnquiriesPage() {
  const supabase = createClient();
  const router = useRouter();
  const [items, setItems] = useState<Enquiry[]>([]);
  const [properties, setProperties] = useState<Record<string, PropertyLite>>({});
  const [listers, setListers] = useState<Record<string, ListerProfile>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "enquiry" | "co_work">("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace(`/login?returnTo=${encodeURIComponent("/enquiries")}`);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role || "";
    const admin = role === "admin";
    setIsAdmin(admin);

    // Internal BaanNest team agents have no lead/enquiry access.
    // Owner/external-agent tags do not block someone from being a property seeker.
    if (role === "baannest_agent") {
      router.replace("/properties");
      return;
    }

    let request = supabase
      .from("property_enquiries")
      .select("id,property_id,seeker_id,seeker_name,seeker_phone,seeker_email,preferred_contact,viewing_date,message,status,internal_notes,next_follow_up_at,enquiry_type,created_at")
      .order("created_at", { ascending: false });

    if (!admin) request = request.eq("seeker_id", user.id);

    const { data, error: enquiryError } = await request;
    if (enquiryError) {
      setError(enquiryError.message);
      setLoading(false);
      return;
    }

    const loaded = (data || []) as Enquiry[];
    setItems(loaded);

    const ids = [...new Set(loaded.map((x) => x.property_id))];
    if (ids.length) {
      const { data: rows } = await supabase
        .from("properties")
        .select("id,title,price,listing_type,project_name,owner_id")
        .in("id", ids);

      const map: Record<string, PropertyLite> = {};
      ((rows || []) as PropertyLite[]).forEach((row) => { map[row.id] = row; });
      setProperties(map);

      if (admin) {
        const ownerIds = [...new Set(((rows || []) as PropertyLite[]).map((row) => row.owner_id).filter(Boolean))];
        if (ownerIds.length) {
          const { data: profileRows, error: profileError } = await supabase
            .from("profiles")
            .select("id,full_name,phone,email,role")
            .in("id", ownerIds);

          if (!profileError) {
            const listerMap: Record<string, ListerProfile> = {};
            ((profileRows || []) as ListerProfile[]).forEach((row) => { listerMap[row.id] = row; });
            setListers(listerMap);
          }
        }
      }
    }

    setLoading(false);
  }

  async function updateLead(id: string, changes: Partial<Pick<Enquiry, "status"|"internal_notes"|"next_follow_up_at">>) {
    const { error } = await supabase
      .from("property_enquiries")
      .update(changes)
      .eq("id", id);

    if (error) return setError(error.message);
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
  }

  const followUpState = (value: string | null) => {
    if (!value) return null;
    const due = new Date(value);
    const now = new Date();
    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);
    if (due < now) return "overdue";
    if (due <= endToday) return "today";
    return "upcoming";
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const property = properties[item.property_id];
      const matchesStatus = filter === "all" || item.status === filter;
      const matchesType = typeFilter === "all" || item.enquiry_type === typeFilter;
      const haystack = [
        item.seeker_name,
        item.seeker_phone,
        item.message,
        property?.title,
        property?.project_name,
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesStatus && matchesType && (!q || haystack.includes(q));
    });
  }, [items, properties, filter, typeFilter, query]);

  const normalCount = items.filter((x) => x.enquiry_type !== "co_work").length;
  const coWorkCount = items.filter((x) => x.enquiry_type === "co_work").length;

  if (loading) {
    return <main className="min-h-screen bg-[#F3EFE5] p-10 text-center text-[#647068]">Loading enquiries...</main>;
  }

  return (
    <main className="min-h-screen bg-[#F3EFE5] text-[#1F2E28]">
      <section className="border-b border-[#DDD5C5] bg-[#ECE6D8]">
        <div className="mx-auto max-w-6xl px-6 py-11">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A16F32]">
            {isAdmin ? "BaanNest internal workspace" : "Property search"}
          </p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">
            {isAdmin ? "Lead CRM" : "My Enquiries"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#647068]">
            {isAdmin
              ? "Manage both sides of each property lead without exposing seeker and lister contact details to one another."
              : "Track the progress of property enquiries you've sent to BaanNest."}
          </p>

          {isAdmin && (
            <div className="mt-7 grid gap-3 sm:grid-cols-4">
              <Metric label="New leads" value={items.filter(x => x.status === "new").length}/>
              <Metric label="Viewings" value={items.filter(x => x.status === "viewing_arranged").length}/>
              <Metric label="Negotiating" value={items.filter(x => x.status === "negotiating").length}/>
              <Metric label="Won" value={items.filter(x => x.status === "won").length}/>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8">
        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

        <div className="mb-5 flex gap-2 overflow-x-auto">
          <button onClick={() => setTypeFilter("all")} className={`rounded-xl px-4 py-3 text-xs font-bold ${typeFilter === "all" ? "bg-[#1F2E28] text-white" : "border border-[#D8D0BE] bg-white text-[#647068]"}`}>
            All {items.length}
          </button>
          <button onClick={() => setTypeFilter("enquiry")} className={`rounded-xl px-4 py-3 text-xs font-bold ${typeFilter === "enquiry" ? "bg-[#1F2E28] text-white" : "border border-[#D8D0BE] bg-white text-[#647068]"}`}>
            Property Enquiries {normalCount}
          </button>
          <button onClick={() => setTypeFilter("co_work")} className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold ${typeFilter === "co_work" ? "bg-[#A16F32] text-white" : "border border-[#D8D0BE] bg-white text-[#647068]"}`}>
            <BriefcaseBusiness size={14}/> Co-work Requests {coWorkCount}
          </button>
        </div>

        <div className="flex flex-col gap-4 border-b border-[#DDD5C5] pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-1 overflow-x-auto">
            {["all", ...STATUSES].map((value) => (
              <button key={value} onClick={() => setFilter(value)}
                className={`whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs font-bold ${filter === value ? "bg-[#1F2E28] text-white" : "text-[#647068] hover:bg-white"}`}>
                {pretty(value)}
              </button>
            ))}
          </div>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-[#D8D0BE] bg-white px-3.5 md:w-72">
            <Search size={15}/>
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search enquiries & co-work" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/>
          </label>
        </div>

        {visible.length === 0 ? (
          <div className="py-20 text-center">
            <Inbox className="mx-auto text-[#A16F32]" size={38}/>
            <h2 className="mt-4 font-display text-2xl">No enquiries here yet</h2>
            <p className="mt-2 text-sm text-[#68736C]">
              {isAdmin ? "New property enquiries and co-work requests will appear here." : "Your submitted property enquiries and co-work requests will appear here."}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {visible.map((item) => {
              const property = properties[item.property_id];
              return (
                <article key={item.id} className="rounded-[1.4rem] border border-[#DDD5C5] bg-white p-5 shadow-[0_8px_28px_rgba(31,46,40,0.04)] md:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#FFF1D7] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#8A5D1E]">{pretty(item.status)}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] ${item.enquiry_type === "co_work" ? "bg-[#E8F0EA] text-[#315A42]" : "bg-[#EEF0F5] text-[#566173]"}`}>
                          {item.enquiry_type === "co_work" ? "Co-work request" : "Property enquiry"}
                        </span>
                        <span className="text-xs text-[#899089]">{new Date(item.created_at).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"})}</span>
                      </div>

                      {isAdmin && item.next_follow_up_at && !["won","lost"].includes(item.status) && (
                        <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] ${
                          followUpState(item.next_follow_up_at) === "overdue"
                            ? "bg-red-50 text-red-700"
                            : followUpState(item.next_follow_up_at) === "today"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-[#F2EEE3] text-[#657169]"
                        }`}>
                          <CalendarDays size={12}/>
                          {followUpState(item.next_follow_up_at) === "overdue" ? "Follow-up overdue" : followUpState(item.next_follow_up_at) === "today" ? "Follow-up today" : `Follow-up ${new Date(item.next_follow_up_at).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}`}
                        </div>
                      )}

                      <Link href={`/properties/${item.property_id}`} className="mt-3 block font-display text-2xl font-semibold hover:text-[#A16F32]">
                        {property?.title || "Property listing"}
                      </Link>
                      {property?.project_name && <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#A16F32]">{property.project_name}</p>}

                      <div className="mt-4 rounded-xl bg-[#F7F3E9] p-4 text-sm leading-6 text-[#526158]">{item.message}</div>

                      {isAdmin ? (
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div className="rounded-xl border border-[#E5DED0] p-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A16F32]">{item.enquiry_type === "co_work" ? "External agent — private" : "Enquirer — private"}</p>
                            <p className="mt-2 text-sm font-bold">{item.seeker_name}</p>
                            <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#59675F]"><Phone size={13}/>{item.seeker_phone}</p>
                            {item.seeker_email && <p className="mt-1 text-xs text-[#59675F]">{item.seeker_email}</p>}
                            <p className="mt-2 text-xs capitalize text-[#7B847E]">Prefers {item.preferred_contact}</p>
                            {item.viewing_date && <p className="mt-2 inline-flex items-center gap-1 text-xs text-[#59675F]"><CalendarDays size={13}/>Requested: {new Date(item.viewing_date+"T00:00:00").toLocaleDateString("en-GB",{dateStyle:"medium"})}</p>}
                          </div>

                          <div className="rounded-xl border border-[#E5DED0] p-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A16F32]">Lister — admin private</p>
                            {property?.owner_id && listers[property.owner_id] ? (
                              <>
                                <p className="mt-2 text-sm font-bold">{listers[property.owner_id].full_name || "BaanNest lister"}</p>
                                {listers[property.owner_id].phone && <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#59675F]"><Phone size={13}/>{listers[property.owner_id].phone}</p>}
                                {listers[property.owner_id].email && <p className="mt-1 text-xs text-[#59675F]">{listers[property.owner_id].email}</p>}
                                <p className="mt-2 text-[11px] capitalize text-[#8A918A]">{pretty(listers[property.owner_id].role || "user")} · Private BaanNest workflow</p>
                              </>
                            ) : (
                              <>
                                <p className="mt-2 text-sm font-bold">Managed privately by BaanNest</p>
                                <p className="mt-1 text-xs leading-5 text-[#68736C]">Lister contact information is unavailable to this CRM view.</p>
                              </>
                            )}
                            <p className="mt-2 text-[11px] leading-5 text-[#8A918A]">These details are visible to Admin only and are never shown to the enquirer.</p>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-4 text-xs leading-5 text-[#68736C]">
                          BaanNest is coordinating this enquiry. The lister's private contact details are not shared through the platform.
                        </p>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="w-full shrink-0 space-y-3 lg:w-72">
                        <label className="block">
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#7B847E]">Lead stage</span>
                          <select value={item.status} onChange={(e)=>updateLead(item.id,{status:e.target.value})}
                            className="w-full rounded-xl border border-[#D8D0BE] bg-white px-3 py-3 text-xs font-bold outline-none">
                            {STATUSES.map((status)=><option key={status} value={status}>{pretty(status)}</option>)}
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#7B847E]">Follow up</span>
                          <input type="datetime-local"
                            value={item.next_follow_up_at ? toLocalInput(item.next_follow_up_at) : ""}
                            onChange={(e)=>updateLead(item.id,{next_follow_up_at:e.target.value ? new Date(e.target.value).toISOString() : null})}
                            className="w-full rounded-xl border border-[#D8D0BE] bg-white px-3 py-3 text-xs outline-none"/>
                        </label>

                        <label className="block">
                          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#7B847E]">Internal notes</span>
                          <textarea defaultValue={item.internal_notes || ""}
                            onBlur={(e)=>updateLead(item.id,{internal_notes:e.target.value || null})}
                            rows={4} placeholder="Only BaanNest admin can see this..."
                            className="w-full resize-none rounded-xl border border-[#D8D0BE] bg-white px-3 py-3 text-xs leading-5 outline-none"/>
                        </label>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({label,value}:{label:string;value:number}) {
  return <div className="rounded-2xl border border-[#D8D0BE] bg-white/70 p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B847E]">{label}</p><p className="mt-2 font-display text-3xl">{value}</p></div>;
}
function pretty(value:string) {
  return value.replace(/_/g," ").replace(/\b\w/g,(c)=>c.toUpperCase());
}
function toLocalInput(value:string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset()*60000);
  return local.toISOString().slice(0,16);
}
