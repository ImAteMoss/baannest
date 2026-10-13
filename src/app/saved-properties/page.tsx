"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bath, BedDouble, Heart, MapPin, Maximize2, TrainFront } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type SavedProperty = {
  property_id: string;
  created_at: string;
  properties: {
    id: string;
    title: string;
    property_type: string;
    listing_type: string;
    price: number;
    rent_price: number | null;
    sale_price: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    area_sqm: number | null;
    location: string | null;
    project_name: string | null;
    province: string | null;
    district: string | null;
    subdistrict: string | null;
    postal_code: string | null;
    nearby_transit: string | null;
    transit_distance_m: number | null;
    status: string;
    property_photos: { image_url: string | null; sort_order: number | null }[];
  } | null;
};

export default function SavedPropertiesPage() {
  const supabase = createClient();
  const router = useRouter();
  const [items, setItems] = useState<SavedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => { loadSaved(); }, []);

  async function loadSaved() {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      router.replace(`/login?returnTo=${encodeURIComponent("/saved-properties")}`);
      return;
    }

    const { data, error } = await supabase
      .from("saved_properties")
      .select(`property_id,created_at,properties(id,title,property_type,listing_type,price,rent_price,sale_price,bedrooms,bathrooms,area_sqm,location,project_name,province,district,subdistrict,postal_code,nearby_transit,transit_distance_m,status,property_photos(image_url,sort_order))`)
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: false });

    if (error) console.error("LOAD SAVED ERROR:", error);
    setItems(((data || []) as unknown as SavedProperty[]).filter((item) => item.properties?.status === "active"));
    setLoading(false);
  }

  async function removeSaved(propertyId: string) {
    setRemoving(propertyId);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    const { error } = await supabase.from("saved_properties").delete().eq("user_id", authData.user.id).eq("property_id", propertyId);
    if (!error) setItems((current) => current.filter((item) => item.property_id !== propertyId));
    else console.error("REMOVE SAVED ERROR:", error);
    setRemoving(null);
  }

  return (
    <main className="min-h-screen bg-[#F4F0E6] text-[#1F2E28]">
      <section className="border-b border-[#DDD6C3] bg-gradient-to-r from-[#EEF7F1] via-white to-[#F3F0E7]">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A16F32]">My BaanNest</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">Saved properties</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#647068]">Keep the homes you like in one place and come back to them from any device.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {loading ? (
          <div className="py-24 text-center text-[#68736C]">Loading your saved properties...</div>
        ) : items.length === 0 ? (
          <div className="rounded-[2rem] border border-[#DDD6C3] bg-white px-6 py-20 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F7F1E5] text-[#A16F32]"><Heart size={27}/></div>
            <h2 className="mt-5 font-display text-3xl">No saved homes yet</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#68736C]">Tap the heart on any property you like. It will appear here for easy comparison later.</p>
            <Link href="/properties" className="mt-7 inline-flex rounded-xl bg-[#1F2E28] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#2D4038]">Browse properties</Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-end justify-between gap-4">
              <p className="text-sm text-[#68736C]"><span className="font-bold text-[#1F2E28]">{items.length}</span> saved {items.length === 1 ? "property" : "properties"}</p>
              <Link href="/properties" className="text-sm font-bold text-[#8A602C] hover:underline">Find more homes</Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const property = item.properties!;
                const cover = [...(property.property_photos || [])].sort((a,b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]?.image_url;
                return (
                  <article key={property.id} className="group overflow-hidden rounded-2xl border border-[#DDD6C3] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="relative h-60 overflow-hidden bg-[#E7E1D2]">
                      <Link href={`/properties/${property.id}`} className="block h-full">
                        {cover ? <img src={cover} alt={property.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/> : <div className="flex h-full items-center justify-center text-5xl">🏠</div>}
                      </Link>
                      <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur-sm">{property.listing_type === "both" ? "For Rent & Sale" : property.listing_type === "rent" ? "For Rent" : "For Sale"}</span>
                      <button type="button" disabled={removing === property.id} onClick={() => removeSaved(property.id)} aria-label="Remove saved property" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#B8863F] bg-[#FFF7E8] text-[#8B602A] shadow-sm transition hover:scale-105 disabled:opacity-60"><Heart size={18} fill="currentColor"/></button>
                    </div>
                    <div className="p-5">
                      {property.project_name && <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A16F32]">{property.project_name}</p>}
                      <Link href={`/properties/${property.id}`}><h2 className="mt-1 line-clamp-2 font-display text-2xl transition hover:text-[#B8863F]">{property.title}</h2></Link>
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-[#5C6B62]"><MapPin size={14}/>{[property.subdistrict, property.district, property.province].filter(Boolean).join(", ") || property.location || "Thailand"}</p>
                      {property.nearby_transit && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#68756D]"><TrainFront size={14}/>{property.nearby_transit}{property.transit_distance_m != null ? ` · ${property.transit_distance_m.toLocaleString()} m` : ""}</p>}
                      <div className="mt-5 font-semibold">{property.listing_type === "both" ? <><p className="text-2xl">฿{Number(property.rent_price ?? property.price).toLocaleString()}<span className="text-sm font-normal text-[#5C6B62]"> / month</span></p><p className="mt-1 text-lg text-[#8A602C]">฿{Number(property.sale_price ?? property.price).toLocaleString()} <span className="text-xs font-normal">sale</span></p></> : property.listing_type === "rent" ? <p className="text-2xl">฿{Number(property.rent_price ?? property.price).toLocaleString()}<span className="text-sm font-normal text-[#5C6B62]"> / month</span></p> : <p className="text-2xl">฿{Number(property.sale_price ?? property.price).toLocaleString()}</p>}</div>
                      <div className="mt-5 flex flex-wrap gap-4 border-t border-[#EEE9DB] pt-5 text-sm text-[#5C6B62]">
                        {property.bedrooms != null && <span className="flex items-center gap-1"><BedDouble size={15}/>{property.bedrooms === 0 ? "Studio" : `${property.bedrooms} Beds`}</span>}
                        {property.bathrooms != null && <span className="flex items-center gap-1"><Bath size={15}/>{property.bathrooms} Baths</span>}
                        {property.area_sqm != null && <span className="flex items-center gap-1"><Maximize2 size={15}/>{property.area_sqm} m²</span>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
