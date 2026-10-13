"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  Eye,
  Heart,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
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
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  location: string | null;
  status: string;
  created_at: string;
  project_name?: string | null;
  subdistrict?: string | null;
  district?: string | null;
  province?: string | null;
  postal_code?: string | null;
  nearby_transit?: string | null;
  transit_distance_m?: number | null;
};

type PropertyPhoto = {
  id: string;
  property_id: string;
  image_url: string;
  sort_order: number;
};

type SaveCount = { property_id: string; save_count: number };
type Filter = "all" | "active" | "paused" | "closed";

export default function MyPropertiesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [properties, setProperties] = useState<Property[]>([]);
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [saveCounts, setSaveCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Property | null>(null);

  useEffect(() => { loadProperties(); }, []);

  async function loadProperties() {
    setLoading(true);
    setError("");

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(authError.message);
      if (!user) {
        router.replace(`/login?returnTo=${encodeURIComponent("/my-properties")}`);
        return;
      }

      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("id,title,property_type,listing_type,price,rent_price,sale_price,bedrooms,bathrooms,area_sqm,location,status,created_at,project_name,subdistrict,district,province,postal_code,nearby_transit,transit_distance_m")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (propertyError) throw new Error(propertyError.message);

      const loaded = (propertyData || []) as Property[];
      setProperties(loaded);

      if (!loaded.length) {
        setPhotos([]);
        setSaveCounts({});
        return;
      }

      const ids = loaded.map((p) => p.id);

      const [photoResult, countResult] = await Promise.all([
        supabase
          .from("property_photos")
          .select("id,property_id,image_url,sort_order")
          .in("property_id", ids)
          .order("sort_order", { ascending: true }),
        supabase.rpc("get_my_property_save_counts"),
      ]);

      if (photoResult.error) console.error("PHOTO LOAD:", photoResult.error.message);
      else setPhotos((photoResult.data || []) as PropertyPhoto[]);

      if (countResult.error) {
        console.warn("SAVE COUNTS:", countResult.error.message);
        setSaveCounts({});
      } else {
        const counts: Record<string, number> = {};
        ((countResult.data || []) as SaveCount[]).forEach((row) => {
          counts[row.property_id] = Number(row.save_count || 0);
        });
        setSaveCounts(counts);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load your properties.");
    } finally {
      setLoading(false);
    }
  }

  function getCover(propertyId: string) {
    return photos.find((p) => p.property_id === propertyId)?.image_url;
  }

  async function changeStatus(property: Property, status: string) {
    setBusyId(property.id);
    setMenuId(null);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace(`/login?returnTo=${encodeURIComponent("/my-properties")}`);
      return;
    }

    const { error } = await supabase
      .from("properties")
      .update({ status })
      .eq("id", property.id)
      .eq("owner_id", user.id);

    if (error) setError(error.message);
    else {
      setProperties((current) => current.map((p) => p.id === property.id ? { ...p, status } : p));
      setNotice(status === "active" ? "Listing is live again." : status === "paused" ? "Listing paused." : `Listing marked ${status}.`);
      window.setTimeout(() => setNotice(""), 2600);
    }
    setBusyId(null);
  }

  async function deleteProperty() {
    if (!confirmDelete) return;
    const property = confirmDelete;
    setBusyId(property.id);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace(`/login?returnTo=${encodeURIComponent("/my-properties")}`);
      return;
    }

    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", property.id)
      .eq("owner_id", user.id);
    if (error) setError(error.message);
    else {
      setProperties((current) => current.filter((p) => p.id !== property.id));
      setPhotos((current) => current.filter((p) => p.property_id !== property.id));
      setNotice("Property deleted.");
      window.setTimeout(() => setNotice(""), 2600);
    }
    setBusyId(null);
    setConfirmDelete(null);
  }

  const counts = useMemo(() => ({
    all: properties.length,
    active: properties.filter((p) => p.status === "active").length,
    paused: properties.filter((p) => p.status === "paused").length,
    closed: properties.filter((p) => ["rented", "sold"].includes(p.status)).length,
  }), [properties]);

  const totalSaves = useMemo(
    () => properties.reduce((sum, p) => sum + (saveCounts[p.id] || 0), 0),
    [properties, saveCounts]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return properties.filter((p) => {
      const statusMatch =
        filter === "all" ||
        (filter === "active" && p.status === "active") ||
        (filter === "paused" && p.status === "paused") ||
        (filter === "closed" && ["rented", "sold"].includes(p.status));
      const text = [p.title, p.project_name, p.location, p.subdistrict, p.district, p.province, p.postal_code, p.nearby_transit, p.property_type].filter(Boolean).join(" ").toLowerCase();
      return statusMatch && (!q || text.includes(q));
    });
  }, [properties, filter, query]);

  if (loading) return <LoadingState />;

  return (
    <main className="min-h-screen bg-[#F3EFE5] text-[#1F2E28]">
      <section className="border-b border-[#DDD5C5] bg-[#ECE6D8]">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:py-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A16F32]">Your listing workspace</p>
              <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight md:text-5xl">My Properties</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#647068]">
                Create and manage the properties you personally listed, update availability, and see which homes people are saving.
              </p>
            </div>
            <Link href="/list-property" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1F2E28] px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2D4038]">
              <Plus size={17}/> Add property
            </Link>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Total listings" value={counts.all} icon={<Building2 size={18}/>} />
            <Metric label="Live now" value={counts.active} icon={<CheckCircle2 size={18}/>} />
            <Metric label="Paused" value={counts.paused} icon={<PauseCircle size={18}/>} />
            <Metric label="Total saves" value={totalSaves} icon={<Heart size={18}/>} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {notice && <div className="mb-5 rounded-xl border border-[#BFD3C4] bg-[#F0F7F1] px-4 py-3 text-sm font-semibold text-[#3F6448]">{notice}</div>}
        {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

        <div className="flex flex-col gap-4 border-b border-[#DDD5C5] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 overflow-x-auto">
            <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>All <b>{counts.all}</b></FilterButton>
            <FilterButton active={filter === "active"} onClick={() => setFilter("active")}>Active <b>{counts.active}</b></FilterButton>
            <FilterButton active={filter === "paused"} onClick={() => setFilter("paused")}>Paused <b>{counts.paused}</b></FilterButton>
            <FilterButton active={filter === "closed"} onClick={() => setFilter("closed")}>Rented / sold <b>{counts.closed}</b></FilterButton>
          </div>

          <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-[#D8D0BE] bg-white px-3.5 lg:w-[310px]">
            <Search size={16} className="text-[#879087]"/>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your listings" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9AA19B]"/>
            {query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={15}/></button>}
          </label>
        </div>

        {properties.length === 0 ? (
          <EmptyState />
        ) : visible.length === 0 ? (
          <div className="py-20 text-center">
            <h2 className="font-serif text-2xl">No listings match this view</h2>
            <p className="mt-2 text-sm text-[#6D7770]">Try another status or clear your search.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {visible.map((property) => {
              const cover = getCover(property.id);
              const closed = ["rented", "sold"].includes(property.status);
              return (
                <article key={property.id} className="group rounded-[1.4rem] border border-[#DDD5C5] bg-white p-3 shadow-[0_8px_28px_rgba(31,46,40,0.04)] transition hover:border-[#CFC3AE] hover:shadow-[0_14px_38px_rgba(31,46,40,0.08)]">
                  <div className="grid gap-4 md:grid-cols-[210px_minmax(0,1fr)] lg:grid-cols-[230px_minmax(0,1fr)_auto] lg:items-center">
                    <Link href={`/properties/${property.id}`} className="relative block h-44 overflow-hidden rounded-[1rem] bg-[#E7E1D2] md:h-full md:min-h-[166px]">
                      {cover ? <img src={cover} alt={property.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"/> : <div className="flex h-full items-center justify-center text-[#8A918A]"><Building2 size={38} strokeWidth={1.4}/></div>}
                      <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] backdrop-blur ${statusClass(property.status)}`}>{pretty(property.status)}</span>
                    </Link>

                    <div className="min-w-0 px-1 py-1">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#A16F32]">
                        <span>{pretty(property.property_type)}</span><span className="text-[#C9C1B1]">•</span><span>{property.listing_type === "both" ? "For rent & sale" : property.listing_type === "rent" ? "For rent" : "For sale"}</span>
                      </div>
                      {property.project_name && <p className="mt-2 truncate text-xs font-bold uppercase tracking-[0.1em] text-[#7B847E]">{property.project_name}</p>}
                      <Link href={`/properties/${property.id}`}><h2 className="mt-1 line-clamp-1 font-serif text-2xl font-semibold transition hover:text-[#A16F32]">{property.title}</h2></Link>
                      <p className="mt-1.5 truncate text-sm text-[#68736C]">📍 {[property.subdistrict, property.district, property.province, property.postal_code].filter(Boolean).join(", ") || property.location || "Thailand"}</p>
                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-[#647068]">
                        {property.bedrooms != null && <span>{property.bedrooms === 0 ? "Studio" : `${property.bedrooms} bed`}</span>}
                        {property.bathrooms != null && <span>{property.bathrooms} bath</span>}
                        {property.area_sqm != null && <span>{property.area_sqm} m²</span>}
                        <span className="text-[#A16F32]">♥ {saveCounts[property.id] || 0} saves</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-[#EEE8DC] px-1 pt-4 lg:min-w-[270px] lg:border-l lg:border-t-0 lg:px-5 lg:py-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A918A]">{property.listing_type === "rent" ? "Monthly rent" : "Selling price"}</p>
                        <p className="mt-1 text-xl font-extrabold">฿{Number(property.price).toLocaleString()} {property.listing_type === "rent" && <span className="text-xs font-medium text-[#7B847E]">/mo</span>}</p>
                        <p className="mt-2 text-[11px] text-[#929991]">Listed {formatShort(property.created_at)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {!closed && (
                          <Link href={`/owner/properties/${property.id}/edit`} className="hidden h-10 items-center gap-2 rounded-xl border border-[#D8D0BE] px-3.5 text-xs font-bold transition hover:border-[#1F2E28] sm:inline-flex">
                            <Pencil size={14}/> Edit
                          </Link>
                        )}
                        <div className="relative">
                          <button type="button" onClick={() => setMenuId(menuId === property.id ? null : property.id)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D8D0BE] bg-[#FBFAF6] transition hover:border-[#1F2E28]" aria-label="Listing actions">
                            {busyId === property.id ? <RefreshCcw size={16} className="animate-spin"/> : <MoreHorizontal size={18}/>}
                          </button>
                          {menuId === property.id && (
                            <div className="absolute right-0 top-12 z-30 w-56 overflow-hidden rounded-xl border border-[#D8D0BE] bg-white p-1.5 shadow-xl">
                              <MenuLink href={`/properties/${property.id}`} icon={<Eye size={15}/>}>Preview listing</MenuLink>
                              <MenuLink href={`/owner/properties/${property.id}/edit`} icon={<Pencil size={15}/>}>Edit listing</MenuLink>
                              {property.status === "active" ? (
                                <MenuButton onClick={() => changeStatus(property, "paused")} icon={<PauseCircle size={15}/>}>Pause listing</MenuButton>
                              ) : property.status === "paused" ? (
                                <MenuButton onClick={() => changeStatus(property, "active")} icon={<CheckCircle2 size={15}/>}>Reactivate</MenuButton>
                              ) : (
                                <MenuButton onClick={() => changeStatus(property, "active")} icon={<CheckCircle2 size={15}/>}>List again</MenuButton>
                              )}
                              {property.listing_type === "rent" && property.status !== "rented" && <MenuButton onClick={() => changeStatus(property, "rented")} icon={<Archive size={15}/>}>Mark as rented</MenuButton>}
                              {property.listing_type === "sale" && property.status !== "sold" && <MenuButton onClick={() => changeStatus(property, "sold")} icon={<Archive size={15}/>}>Mark as sold</MenuButton>}
                              <div className="my-1 border-t border-[#EEE8DC]"/>
                              <MenuButton danger onClick={() => {setConfirmDelete(property); setMenuId(null);}} icon={<Trash2 size={15}/>}>Delete property</MenuButton>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#142019]/55 p-4 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-md rounded-[1.6rem] border border-white/20 bg-[#FBFAF6] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-700"><Trash2 size={19}/></div>
            <h2 className="mt-5 font-serif text-2xl font-semibold">Delete this property?</h2>
            <p className="mt-2 text-sm leading-6 text-[#68736C]"><b>{confirmDelete.title}</b> will be permanently removed. Use Pause if you may list it again later.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-xl border border-[#D8D0BE] px-4 py-3 text-sm font-bold">Cancel</button>
              <button onClick={deleteProperty} disabled={busyId === confirmDelete.id} className="flex-1 rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busyId === confirmDelete.id ? "Deleting..." : "Delete permanently"}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Metric({label,value,icon}:{label:string;value:number;icon:React.ReactNode}) {
  return <div className="rounded-2xl border border-[#D8D0BE] bg-white/70 p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B847E]">{label}</p><span className="text-[#A16F32]">{icon}</span></div><p className="mt-2 font-serif text-3xl font-semibold">{value}</p></div>
}
function FilterButton({active,onClick,children}:{active:boolean;onClick:()=>void;children:React.ReactNode}) {
  return <button onClick={onClick} className={`whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${active ? "bg-[#1F2E28] text-white" : "text-[#647068] hover:bg-white"}`}>{children}</button>
}
function MenuButton({onClick,icon,children,danger=false}:{onClick:()=>void;icon:React.ReactNode;children:React.ReactNode;danger?:boolean}) {
  return <button type="button" onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-xs font-bold transition ${danger ? "text-red-700 hover:bg-red-50" : "text-[#445149] hover:bg-[#F5F1E7]"}`}>{icon}{children}</button>
}
function MenuLink({href,icon,children}:{href:string;icon:React.ReactNode;children:React.ReactNode}) {
  return <Link href={href} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-bold text-[#445149] transition hover:bg-[#F5F1E7]">{icon}{children}</Link>
}
function EmptyState() {
  return <div className="mt-6 rounded-[1.6rem] border border-[#DDD5C5] bg-white px-6 py-20 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F3EFE5] text-[#A16F32]"><Building2/></div><h2 className="mt-5 font-serif text-2xl font-semibold">Your property portfolio starts here</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68736C]">Create your first listing, add photos and property details, then manage its availability from this dashboard.</p><Link href="/list-property" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1F2E28] px-5 py-3 text-sm font-bold text-white"><Plus size={16}/> Add property</Link></div>
}
function LoadingState() {
  return <main className="min-h-screen bg-[#F3EFE5] px-6 py-12"><div className="mx-auto max-w-7xl"><div className="h-12 w-64 animate-pulse rounded-xl bg-[#DDD6C3]"/><div className="mt-8 grid gap-3 sm:grid-cols-4">{[1,2,3,4].map(x=><div key={x} className="h-24 animate-pulse rounded-2xl bg-[#E5DFD2]"/>)}</div><div className="mt-8 space-y-4">{[1,2,3].map(x=><div key={x} className="h-48 animate-pulse rounded-2xl bg-[#E5DFD2]"/>)}</div></div></main>
}
function statusClass(status:string) {
  if (status === "active") return "bg-[#F0F7F1]/95 text-[#39704A]";
  if (status === "paused") return "bg-[#FFF5DD]/95 text-[#936A20]";
  if (["rented","sold"].includes(status)) return "bg-[#1F2E28]/90 text-white";
  return "bg-white/90 text-[#647068]";
}
function pretty(value:string){ return value.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase()); }
function formatShort(value:string){ const d=new Date(value); return Number.isNaN(d.getTime())?value:d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}); }
