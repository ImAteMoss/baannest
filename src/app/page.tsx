// src/app/page.tsx

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight,
  Bath,
  BedDouble,
  Building,
  Building2,
  GraduationCap,
  Heart,
  House,
  MapPin,
  Maximize2,
  PawPrint,
  Search,
  Sparkles,
  TrainFront,
  Trees,
  Warehouse,
  WalletCards,
  SlidersHorizontal,
  X,
  ChevronDown,
} from "lucide-react";

type Property = {
  id: string;
  title: string;
  property_type: string;
  listing_type: string;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  location: string | null;
};

type PropertyPhoto = {
  property_id: string;
  image_url: string;
  sort_order: number;
};

const propertyTypes = [
  { label: "Condos", type: "condo", icon: Building2, note: "City living & projects" },
  { label: "Houses", type: "house", icon: House, note: "More room to call home" },
  { label: "Townhouses", type: "townhouse", icon: Warehouse, note: "Space with city access" },
  { label: "Commercial", type: "commercial", icon: Building, note: "For work & business" },
];

const lifestyleSearches = [
  {
    label: "Near BTS / MRT",
    description: "Spend less time in Bangkok traffic.",
    href: "/properties?search=BTS",
    icon: TrainFront,
  },
  {
    label: "Pet friendly",
    description: "Homes where your companion is welcome.",
    href: "/properties?search=pet%20friendly",
    icon: PawPrint,
  },
  {
    label: "Under ฿15K",
    description: "Affordable rentals without endless searching.",
    href: "/properties?listing=rent&maxPrice=15000",
    icon: WalletCards,
  },
  {
    label: "Near university",
    description: "Convenient homes for students and staff.",
    href: "/properties?search=university",
    icon: GraduationCap,
  },
];

const popularAreas = [
  { name: "Sukhumvit", subtitle: "Connected city living", query: "Sukhumvit" },
  { name: "Thonglor", subtitle: "Dining, cafés & nightlife", query: "Thonglor" },
  { name: "Ari", subtitle: "Neighbourhood charm", query: "Ari" },
  { name: "Sathorn", subtitle: "Business meets residential", query: "Sathorn" },
  { name: "On Nut", subtitle: "Value with BTS access", query: "On Nut" },
  { name: "Rama 9", subtitle: "A fast-growing city hub", query: "Rama 9" },
];

export default function HomePage() {
  const supabase = createClient();

  const [properties, setProperties] = useState<Property[]>([]);
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [search, setSearch] = useState("");
  const [intent, setIntent] = useState<"rent" | "sale">("rent");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [propertyType, setPropertyType] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");

  useEffect(() => {
    async function loadFeatured() {
      const { data } = await supabase
        .from("properties")
        .select(
          "id,title,property_type,listing_type,price,bedrooms,bathrooms,area_sqm,location"
        )
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(6);

      const loaded = data || [];
      setProperties(loaded);

      if (loaded.length) {
        const ids = loaded.map((property) => property.id);

        const { data: photoData } = await supabase
          .from("property_photos")
          .select("property_id,image_url,sort_order")
          .in("property_id", ids)
          .order("sort_order", { ascending: true });

        setPhotos(photoData || []);
      }
    }

    loadFeatured();
  }, []);

  function coverPhoto(propertyId: string) {
    return photos.find((photo) => photo.property_id === propertyId)?.image_url;
  }

  function searchProperties(event: React.FormEvent) {
    event.preventDefault();

    const params = new URLSearchParams();
    params.set("listing", intent);

    const query = search.trim();
    if (query) params.set("search", query);
    if (propertyType !== "all") params.set("propertyType", propertyType);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (bedrooms) params.set("bedrooms", bedrooms);
    if (bathrooms) params.set("bathrooms", bathrooms);
    if (minArea) params.set("minArea", minArea);
    if (maxArea) params.set("maxArea", maxArea);

    window.location.href = `/properties?${params.toString()}`;
  }


  function clearAdvanced() {
    setPropertyType("all");
    setMinPrice("");
    setMaxPrice("");
    setBedrooms("");
    setBathrooms("");
    setMinArea("");
    setMaxArea("");
  }

  const activeAdvancedCount = [
    propertyType !== "all",
    !!minPrice,
    !!maxPrice,
    !!bedrooms,
    !!bathrooms,
    !!minArea,
    !!maxArea,
  ].filter(Boolean).length;

  return (
    <main className="min-h-screen bg-[#F2EEE3] text-[#1F2E28]">
      {/* HERO */}
      <section className="relative flex min-h-[790px] items-end overflow-hidden bg-[#17231F]">
        <video
          className="absolute inset-0 h-full w-full scale-[1.02] object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster="/hero-poster.jpg"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-[#0E1D17]/58" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D1B16] via-[#10201A]/30 to-[#10201A]/10" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 pt-44">
          <div className="max-w-5xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#F0C77E] backdrop-blur-md">
              <Sparkles size={14} />
              Bangkok property, made simpler
            </div>

            <h1 className="mt-6 max-w-4xl font-display text-6xl leading-[0.94] tracking-tight text-white md:text-7xl lg:text-[5.6rem]">
              Find somewhere
              <br />
              that feels like home.
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-7 text-white/75 md:text-lg">
              Search homes across Bangkok by area, lifestyle and what actually
              matters to you — whether you are renting, buying or just exploring.
            </p>

            {/* SEARCH HUB */}
            <div className="mt-9 max-w-4xl rounded-[1.65rem] border border-white/20 bg-[#F8F5ED]/95 p-2.5 shadow-[0_28px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              <div className="mb-2 flex gap-1 rounded-2xl bg-[#EAE4D6] p-1">
                <button
                  type="button"
                  onClick={() => setIntent("rent")}
                  className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
                    intent === "rent"
                      ? "bg-[#1F2E28] text-white shadow-md"
                      : "text-[#657168] hover:bg-white/60 hover:text-[#1F2E28]"
                  }`}
                >
                  Rent
                </button>
                <button
                  type="button"
                  onClick={() => setIntent("sale")}
                  className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
                    intent === "sale"
                      ? "bg-[#1F2E28] text-white shadow-md"
                      : "text-[#657168] hover:bg-white/60 hover:text-[#1F2E28]"
                  }`}
                >
                  Buy
                </button>
              </div>

              <form onSubmit={searchProperties}>
                <div className="flex flex-col gap-2 md:flex-row">
                  <div className="flex min-h-16 flex-1 items-center rounded-2xl bg-white px-5 shadow-sm ring-1 ring-[#DDD6C3] transition focus-within:ring-2 focus-within:ring-[#B8863F]">
                    <Search size={20} strokeWidth={1.8} className="mr-3 shrink-0 text-[#526259]" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Area, BTS/MRT, condo or project..."
                      className="w-full bg-transparent py-4 text-[15px] text-[#1F2E28] outline-none placeholder:text-[#879087]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((open) => !open)}
                    className={`flex min-h-16 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-bold transition duration-300 ${
                      advancedOpen || activeAdvancedCount
                        ? "border-[#B8863F] bg-[#FFF8EA] text-[#8C612B]"
                        : "border-[#DDD6C3] bg-white text-[#405047] hover:border-[#B8863F]"
                    }`}
                  >
                    <SlidersHorizontal size={17} />
                    Advanced
                    {activeAdvancedCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1F2E28] px-1.5 text-[10px] text-white">
                        {activeAdvancedCount}
                      </span>
                    )}
                    <ChevronDown size={15} className={`transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                  </button>

                  <button
                    type="submit"
                    className="group flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-[#B8863F] px-7 text-sm font-bold text-white shadow-lg transition duration-300 hover:-translate-y-0.5 hover:bg-[#A57432]"
                  >
                    Search
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>

                <div className={`grid transition-all duration-300 ease-out ${advancedOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                  <div className="overflow-hidden">
                    <div className="mt-2 rounded-2xl border border-[#DDD6C3] bg-white p-5 text-[#1F2E28] shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold">Refine your search</p>
                          <p className="mt-1 text-xs text-[#778078]">Only choose what matters. You can change everything later.</p>
                        </div>
                        {activeAdvancedCount > 0 && (
                          <button type="button" onClick={clearAdvanced} className="flex items-center gap-1 text-xs font-semibold text-[#7A6A55] hover:text-[#1F2E28]">
                            <X size={13} /> Clear
                          </button>
                        )}
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <label className="block">
                          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#7A817B]">Minimum budget</span>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#68736C]">฿</span>
                            <input type="number" min="0" inputMode="numeric" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Type minimum" className="w-full rounded-xl border border-[#DDD6C3] bg-[#F8F5ED] py-3 pl-9 pr-4 text-sm outline-none placeholder:text-[#9AA09B] focus:border-[#B8863F]" />
                          </div>
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#7A817B]">Maximum budget</span>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#68736C]">฿</span>
                            <input type="number" min="0" inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Type maximum" className="w-full rounded-xl border border-[#DDD6C3] bg-[#F8F5ED] py-3 pl-9 pr-4 text-sm outline-none placeholder:text-[#9AA09B] focus:border-[#B8863F]" />
                          </div>
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#7A817B]">Property type</span>
                          <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="w-full rounded-xl border border-[#DDD6C3] bg-[#F8F5ED] px-4 py-3 text-sm outline-none focus:border-[#B8863F]">
                            <option value="all">Any property</option>
                            <option value="condo">Condo</option>
                            <option value="house">House</option>
                            <option value="townhouse">Townhouse</option>
                            <option value="land">Land</option>
                            <option value="commercial">Commercial</option>
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#7A817B]">Bedrooms</span>
                          <input type="number" min="0" step="1" inputMode="numeric" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="Any" className="w-full rounded-xl border border-[#DDD6C3] bg-[#F8F5ED] px-4 py-3 text-sm outline-none placeholder:text-[#9AA09B] focus:border-[#B8863F]" />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#7A817B]">Bathrooms</span>
                          <input type="number" min="0" step="1" inputMode="numeric" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="Any" className="w-full rounded-xl border border-[#DDD6C3] bg-[#F8F5ED] px-4 py-3 text-sm outline-none placeholder:text-[#9AA09B] focus:border-[#B8863F]" />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#7A817B]">Minimum size</span>
                          <input type="number" min="0" value={minArea} onChange={(e) => setMinArea(e.target.value)} placeholder="e.g. 30 m²" className="w-full rounded-xl border border-[#DDD6C3] bg-[#F8F5ED] px-4 py-3 text-sm outline-none placeholder:text-[#9AA09B] focus:border-[#B8863F]" />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#7A817B]">Maximum size</span>
                          <input type="number" min="0" value={maxArea} onChange={(e) => setMaxArea(e.target.value)} placeholder="e.g. 120 m²" className="w-full rounded-xl border border-[#DDD6C3] bg-[#F8F5ED] px-4 py-3 text-sm outline-none placeholder:text-[#9AA09B] focus:border-[#B8863F]" />
                        </label>

                        <div className="flex items-end">
                          <button type="submit" className="w-full rounded-xl bg-[#1F2E28] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#2D4038]">
                            View matching properties
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-white/65">
              <span className="mr-1 text-white/45">Popular:</span>
              {["Sukhumvit", "Thonglor", "Ari", "Sathorn", "On Nut", "Rama 9"].map(
                (area) => (
                  <Link
                    key={area}
                    href={`/properties?listing=${intent}&search=${encodeURIComponent(area)}`}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                  >
                    {area}
                  </Link>
                )
              )}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 right-6 z-10 hidden text-right text-[11px] uppercase tracking-[0.24em] text-white/45 md:block">
          Explore Bangkok
          <div className="ml-auto mt-2 h-12 w-px bg-white/25" />
        </div>
      </section>

      {/* PROPERTY TYPES */}
      <section className="border-b border-[#DDD6C3] bg-[#FBF9F4]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#B8863F]">
                Explore BaanNest
              </p>
              <h2 className="mt-2 font-display text-4xl md:text-5xl">
                What are you looking for?
              </h2>
            </div>
            <Link
              href="/properties"
              className="group inline-flex items-center gap-2 text-sm font-semibold text-[#5C6B62] hover:text-[#B8863F]"
            >
              Browse everything
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {propertyTypes.map(({ label, type, icon: Icon, note }) => (
              <Link
                key={type}
                href={`/properties?propertyType=${type}`}
                className="group relative overflow-hidden rounded-[1.5rem] border border-[#DDD6C3] bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-[#C6B68F] hover:shadow-[0_18px_45px_rgba(31,46,40,0.10)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2EEE3] text-[#1F2E28] transition duration-300 group-hover:bg-[#1F2E28] group-hover:text-white">
                  <Icon size={22} strokeWidth={1.7} />
                </div>
                <p className="mt-6 text-lg font-bold">{label}</p>
                <p className="mt-1 text-sm text-[#727B74]">{note}</p>
                <ArrowRight
                  size={17}
                  className="absolute bottom-6 right-6 text-[#B8863F] transition-transform group-hover:translate-x-1"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* LIFESTYLE DISCOVERY */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#B8863F]">
              Search the way you live
            </p>
            <h2 className="mt-3 max-w-xl font-display text-4xl leading-tight md:text-5xl">
              You should not need to know a project name to find the right home.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-[#657168]">
              Start with the things that shape everyday life — transport, budget,
              pets or where you study — and let BaanNest narrow the search.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {lifestyleSearches.map(({ label, description, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="group rounded-[1.5rem] border border-[#DCD4C2] bg-[#E9E3D4]/65 p-5 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#1F2E28] shadow-sm">
                    <Icon size={20} strokeWidth={1.7} />
                  </div>
                  <ArrowRight size={16} className="mt-1 text-[#B8863F] transition-transform group-hover:translate-x-1" />
                </div>
                <h3 className="mt-5 text-base font-bold">{label}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[#6E786F]">{description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="border-y border-[#DDD6C3] bg-[#EDE8DC]">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#B8863F]">
                Fresh on BaanNest
              </p>
              <h2 className="mt-2 font-display text-4xl md:text-5xl">
                Recently added homes
              </h2>
              <p className="mt-3 text-sm text-[#667168]">
                New listings from owners and agents across Bangkok.
              </p>
            </div>

            <Link
              href="/properties"
              className="group hidden items-center gap-2 text-sm font-semibold text-[#5C6B62] transition hover:text-[#B8863F] md:flex"
            >
              View all properties
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {properties.length > 0 ? (
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => {
                const image = coverPhoto(property.id);

                return (
                  <Link
                    key={property.id}
                    href={`/properties/${property.id}`}
                    className="group overflow-hidden rounded-[1.7rem] border border-[#D8D0BE] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(31,46,40,0.12)]"
                  >
                    <div className="relative h-64 overflow-hidden bg-[#E7E1D2]">
                      {image ? (
                        <img
                          src={image}
                          alt={property.title}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <House size={44} strokeWidth={1.2} className="text-[#899087]" />
                        </div>
                      )}

                      <span className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#1F2E28] backdrop-blur">
                        {property.listing_type === "rent" ? "For Rent" : "For Sale"}
                      </span>

                      <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#1F2E28] backdrop-blur transition group-hover:bg-white">
                        <Heart size={16} strokeWidth={1.7} />
                      </span>
                    </div>

                    <div className="p-5">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#B8863F]">
                          {property.property_type}
                        </p>
                        <p className="text-xl font-bold">
                          ฿{Number(property.price).toLocaleString()}
                          {property.listing_type === "rent" && (
                            <span className="text-xs font-medium text-[#6C756E]"> /mo</span>
                          )}
                        </p>
                      </div>

                      <h3 className="mt-3 line-clamp-2 font-display text-2xl leading-tight transition group-hover:text-[#9B6A2F]">
                        {property.title}
                      </h3>

                      <div className="mt-3 flex items-center gap-1.5 text-sm text-[#5C6B62]">
                        <MapPin size={15} strokeWidth={1.8} />
                        <span className="line-clamp-1">{property.location || "Bangkok"}</span>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#EEE9DB] pt-4 text-sm text-[#5C6B62]">
                        <div className="flex items-center gap-1.5">
                          <BedDouble size={16} strokeWidth={1.7} />
                          <span>{property.bedrooms ?? "-"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Bath size={16} strokeWidth={1.7} />
                          <span>{property.bathrooms ?? "-"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Maximize2 size={15} strokeWidth={1.7} />
                          <span>{property.area_sqm ?? "-"} m²</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-10 rounded-3xl border border-[#D8D0BE] bg-white p-12 text-center text-[#6E786F]">
              New properties will appear here as they are listed.
            </div>
          )}

          <Link
            href="/properties"
            className="mt-8 block rounded-xl border border-[#D8D0BE] bg-white py-4 text-center text-sm font-semibold md:hidden"
          >
            View all properties
          </Link>
        </div>
      </section>

      {/* POPULAR AREAS */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#B8863F]">
              Explore Bangkok
            </p>
            <h2 className="mt-2 font-display text-4xl md:text-5xl">
              Start with a neighbourhood.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#68736C]">
            A faster way to jump into the areas people search most often.
          </p>
        </div>

        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {popularAreas.map((area, index) => (
            <Link
              key={area.name}
              href={`/properties?search=${encodeURIComponent(area.query)}`}
              className={`group relative min-h-44 overflow-hidden rounded-[1.6rem] border border-[#D9D1BF] p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
                index === 0 || index === 5
                  ? "bg-[#1F2E28] text-white"
                  : "bg-white text-[#1F2E28]"
              }`}
            >
              <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full border border-current opacity-[0.07]" />
              <div className="absolute -bottom-20 right-10 h-44 w-44 rounded-full border border-current opacity-[0.06]" />

              <div className="relative flex h-full flex-col justify-between">
                <MapPin
                  size={21}
                  strokeWidth={1.6}
                  className={index === 0 || index === 5 ? "text-[#E2B86A]" : "text-[#B8863F]"}
                />
                <div className="mt-12">
                  <h3 className="font-display text-3xl">{area.name}</h3>
                  <div className="mt-1 flex items-center justify-between gap-4">
                    <p className={index === 0 || index === 5 ? "text-sm text-white/60" : "text-sm text-[#727B74]"}>
                      {area.subtitle}
                    </p>
                    <ArrowRight size={16} className="shrink-0 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* BRAND / TRUST */}
      <section className="bg-[#1F2E28] text-[#F2EEE3]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#D9A95D]">
              Why BaanNest
            </p>
            <h2 className="mt-4 font-display text-5xl leading-tight">
              Less clutter.
              <br />
              Better property discovery.
            </h2>
          </div>

          <div className="space-y-6 text-sm leading-7 text-white/70">
            <p>
              BaanNest brings property seekers, owners and independent agents
              together in one straightforward Bangkok marketplace.
            </p>
            <p>
              Browse freely. Search by the way you actually live. Create an
              account only when you want to save, contact or manage a listing.
            </p>
            <Link
              href="/about"
              className="group inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Discover BaanNest
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* OWNER CTA */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="overflow-hidden rounded-[2rem] bg-[#E5DFCF]">
          <div className="grid md:grid-cols-2">
            <div className="p-8 md:p-14">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#B8863F]">
                Owners & agents
              </p>
              <h2 className="mt-4 font-display text-4xl leading-tight md:text-5xl">
                Have a property people should see?
              </h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-[#5C6B62]">
                Create your listing, keep it organised and connect with people
                actively looking for a home.
              </p>

              <Link
                href="/list-property"
                className="group mt-7 inline-flex items-center gap-2 rounded-xl bg-[#1F2E28] px-6 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#2D4038]"
              >
                List a property
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="relative min-h-72 overflow-hidden bg-[radial-gradient(circle_at_30%_30%,rgba(184,134,63,0.38),transparent_35%),linear-gradient(135deg,#2D4038,#15231E)]">
              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-white/10" />
              <div className="absolute -bottom-32 right-20 h-80 w-80 rounded-full border border-white/10" />
              <Trees className="absolute right-12 top-12 text-white/10" size={120} strokeWidth={0.8} />

              <div className="absolute bottom-8 left-8 right-8 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.22em] text-[#D9A95D]">
                  Your BaanNest
                </p>
                <p className="mt-2 max-w-sm font-display text-2xl text-white">
                  One account for searching, listing and managing property.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#DDD6C3] bg-[#F2EEE3]">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-6 py-8 text-sm text-[#6F776F] md:flex-row">
          <p>© 2026 BaanNest · Bangkok, Thailand</p>
          <div className="flex gap-5">
            <Link href="/properties" className="hover:text-[#1F2E28]">Properties</Link>
            <Link href="/about" className="hover:text-[#1F2E28]">About</Link>
            <Link href="/contact" className="hover:text-[#1F2E28]">Contact</Link>
            <Link href="/privacy" className="hover:text-[#1F2E28]">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
