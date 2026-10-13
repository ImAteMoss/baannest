"use client";



import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import { useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

import { Search, SlidersHorizontal, X, ChevronDown, ArrowUpDown, Building2, BedDouble, Bath, Banknote, Maximize2, Check, Heart } from "lucide-react";



import thailandGeography from "@/data/thailand-locations.json";



type Property = {

  id: string;

  title: string;

  description: string | null;

  property_type: string;

  listing_type: string;

  price: number;

  rent_price: number | null;

  sale_price: number | null;

  bedrooms: number | null;

  bathrooms: number | null;

  area_sqm: number | null;

  location: string | null;

  status: string;

  created_at: string;

  project_name: string | null;

  province: string | null;

  district: string | null;

  subdistrict: string | null;

  postal_code: string | null;

  floor_number: number | null;

  parking_spaces: number | null;

  furnishing: string | null;

  property_condition: string | null;

  nearby_transit: string | null;

  transit_distance_m: number | null;

  minimum_lease_months: number | null;

  available_from: string | null;

  pet_friendly: boolean | null;

  amenities: string[] | null;

};



type PropertyPhoto = {

  id: string;

  property_id: string;

  image_url: string;

  sort_order: number;

};



type SearchSuggestion = {

  key: string;

  label: string;

  secondary?: string;

  value: string;

  kind: "province" | "district" | "subdistrict" | "project" | "transit";

};



function normalizeSearch(value: string) {

  return value.trim().toLocaleLowerCase("th-TH");

}



export default function PropertiesPage() {

  const supabase = createClient();

  const searchParams = useSearchParams();



  const [properties, setProperties] = useState<Property[]>([]);

  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);

  const [loading, setLoading] = useState(true);

  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(new Set());

  const [savingPropertyId, setSavingPropertyId] = useState<string | null>(null);



  const [search, setSearch] = useState(() => searchParams.get("search") || "");

  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  const [listingType, setListingType] = useState(() => searchParams.get("listing") || "all");

  const [propertyType, setPropertyType] = useState(() => searchParams.get("propertyType") || "all");

  const [minPrice, setMinPrice] = useState(() => searchParams.get("minPrice") || "");

  const [maxPrice, setMaxPrice] = useState(() => searchParams.get("maxPrice") || "");

  const [bedrooms, setBedrooms] = useState(() => searchParams.get("bedrooms") || "");

  const [bathrooms, setBathrooms] = useState(() => searchParams.get("bathrooms") || "");

  const [minArea, setMinArea] = useState(() => searchParams.get("minArea") || "");

  const [maxArea, setMaxArea] = useState(() => searchParams.get("maxArea") || "");

  const [furnishing, setFurnishing] = useState(() => searchParams.get("furnishing") || "all");

  const [petFriendly, setPetFriendly] = useState(() => searchParams.get("petFriendly") === "true");

  const [parkingOnly, setParkingOnly] = useState(() => searchParams.get("parking") === "true");

  const [nearTransit, setNearTransit] = useState(() => searchParams.get("nearTransit") === "true");

  const [sortBy, setSortBy] = useState(() => searchParams.get("sort") || "newest");

  const [openFilter, setOpenFilter] = useState<"type" | "budget" | "beds" | "baths" | "advanced" | "sort" | null>(null);

  const filterBarRef = useRef<HTMLDivElement | null>(null);



  useEffect(() => {

    loadProperties();

    loadSavedProperties();

  }, []);



  useEffect(() => {

    function handlePointerDown(event: MouseEvent) {

      if (filterBarRef.current && !filterBarRef.current.contains(event.target as Node)) {

        setOpenFilter(null);

      }

    }

    function handleKeyDown(event: KeyboardEvent) {

      if (event.key === "Escape") setOpenFilter(null);

    }

    document.addEventListener("mousedown", handlePointerDown);

    window.addEventListener("keydown", handleKeyDown);

    return () => {

      document.removeEventListener("mousedown", handlePointerDown);

      window.removeEventListener("keydown", handleKeyDown);

    };

  }, []);



  useEffect(() => {
    function closeSearch(event: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
        setActiveSuggestion(-1);
      }
    }
    document.addEventListener("mousedown", closeSearch);
    return () => document.removeEventListener("mousedown", closeSearch);
  }, []);

  async function loadProperties() {

    setLoading(true);



    const { data: authData } = await supabase.auth.getUser();

    let isTeamAgent = false;



    if (authData.user) {

      const { data: profile } = await supabase

        .from("profiles")

        .select("role")

        .eq("id", authData.user.id)

        .maybeSingle();



      isTeamAgent = profile?.role === "baannest_agent";

    }



    let data: any = null;

    let error: any = null;



    if (isTeamAgent) {

      const result = await supabase.rpc("get_baannest_agent_properties");

      data = result.data;

      error = result.error;

    } else {

      const result = await supabase

        .from("properties")

        .select(

          "id,title,description,property_type,listing_type,price,rent_price,sale_price,bedrooms,bathrooms,area_sqm,location,status,created_at,project_name,province,district,subdistrict,postal_code,floor_number,parking_spaces,furnishing,property_condition,nearby_transit,transit_distance_m,minimum_lease_months,available_from,pet_friendly,amenities"

        )

        .eq("status", "active")

        .order("created_at", { ascending: false });



      data = result.data;

      error = result.error;

    }



    if (error) {

      console.error("PROPERTIES ERROR:", error);

      setLoading(false);

      return;

    }



    const loadedProperties = (data || []) as Property[];

    setProperties(loadedProperties);



    if (loadedProperties.length > 0) {

      const propertyIds = loadedProperties.map(

        (property) => property.id

      );



      const { data: photoData, error: photoError } =

        await supabase

          .from("property_photos")

          .select(

            "id,property_id,image_url,sort_order"

          )

          .in("property_id", propertyIds)

          .order("sort_order", {

            ascending: true,

          });



      if (photoError) {

        console.error(

          "PROPERTY PHOTOS ERROR:",

          photoError

        );

      } else {

        setPhotos(photoData || []);

      }

    }



    setLoading(false);

  }



  async function loadSavedProperties() {

    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {

      setSavedPropertyIds(new Set());

      return;

    }



    const { data, error } = await supabase

      .from("saved_properties")

      .select("property_id")

      .eq("user_id", authData.user.id);



    if (error) {

      console.error("SAVED PROPERTIES ERROR MESSAGE:", error.message);

      console.error("SAVED PROPERTIES ERROR DETAILS:", error.details);

      console.error("SAVED PROPERTIES ERROR HINT:", error.hint);

      console.error("SAVED PROPERTIES ERROR CODE:", error.code);

      setSavedPropertyIds(new Set());

      return;

    }



    setSavedPropertyIds(new Set((data || []).map((row) => row.property_id)));

  }



  async function toggleSavedProperty(propertyId: string) {

    if (savingPropertyId === propertyId) return;



    const { data: authData } = await supabase.auth.getUser();

    if (!authData.user) {

      window.location.href = `/login?returnTo=${encodeURIComponent(`/properties?save=${propertyId}`)}`;

      return;

    }



    const isSaved = savedPropertyIds.has(propertyId);

    setSavingPropertyId(propertyId);



    if (isSaved) {

      const { error } = await supabase

        .from("saved_properties")

        .delete()

        .eq("user_id", authData.user.id)

        .eq("property_id", propertyId);



      if (!error) {

        setSavedPropertyIds((current) => {

          const next = new Set(current);

          next.delete(propertyId);

          return next;

        });

      } else {

        console.error("UNSAVE PROPERTY ERROR:", error.message, error.details, error.hint, error.code);

      }

    } else {

      const { error } = await supabase

        .from("saved_properties")

        .insert({ user_id: authData.user.id, property_id: propertyId });



      if (!error) {

        setSavedPropertyIds((current) => new Set(current).add(propertyId));

      } else {

        console.error("SAVE PROPERTY ERROR:", error.message, error.details, error.hint, error.code);

      }

    }



    setSavingPropertyId(null);

  }



  function getCoverPhoto(propertyId: string) {

    return photos.find(

      (photo) => photo.property_id === propertyId

    )?.image_url;

  }



  const geographySuggestions = useMemo<SearchSuggestion[]>(() => {
    const suggestions: SearchSuggestion[] = [];
    const seen = new Set<string>();
    const rows = thailandGeography as Array<Record<string, unknown>>;

    const read = (row: Record<string, unknown>, keys: string[]) => {
      for (const key of keys) {
        const value = row[key];
        if (typeof value === "string" && value.trim()) return value.trim();
        if (typeof value === "number") return String(value);
      }
      return "";
    };

    const add = (
      kind: SearchSuggestion["kind"],
      thai: string,
      english: string,
      secondaryParts: string[]
    ) => {
      if (!thai && !english) return;

      const label = thai || english;
      const secondary = [english && english !== label ? english : "", ...secondaryParts]
        .filter(Boolean)
        .join(" · ");

      // Deduplicate provinces/districts/subdistricts while keeping same-name
      // places in different parents distinct.
      const key = `${kind}:${label}:${secondaryParts.join(":")}`;
      if (seen.has(key)) return;
      seen.add(key);

      suggestions.push({
        key,
        kind,
        label,
        secondary,
        // Searching the Thai label works with the property records, while the
        // English name remains searchable through the suggestion index.
        value: label,
      });
    };

    for (const row of rows) {
      const provinceTh = read(row, ["provinceNameTh", "province_name_th", "province_th", "province"]);
      const provinceEn = read(row, ["provinceNameEn", "province_name_en", "province_en"]);
      const districtTh = read(row, ["districtNameTh", "district_name_th", "district_th", "district", "amphoe_th"]);
      const districtEn = read(row, ["districtNameEn", "district_name_en", "district_en", "amphoe_en"]);
      const subdistrictTh = read(row, ["subdistrictNameTh", "subdistrict_name_th", "subdistrict_th", "subdistrict", "tambon_th"]);
      const subdistrictEn = read(row, ["subdistrictNameEn", "subdistrict_name_en", "subdistrict_en", "tambon_en"]);
      const postal = read(row, ["postalCode", "postal_code", "zipcode", "zip_code"]);

      add("province", provinceTh, provinceEn, ["จังหวัด"]);
      add("district", districtTh, districtEn, [provinceTh || provinceEn]);
      add(
        "subdistrict",
        subdistrictTh,
        subdistrictEn,
        [districtTh || districtEn, provinceTh || provinceEn, postal]
      );
    }

    return suggestions;
  }, []);

  const liveSuggestions = useMemo<SearchSuggestion[]>(() => {
    const query = normalizeSearch(search);
    if (!query) return [];

    const propertySuggestions: SearchSuggestion[] = [];
    const seen = new Set<string>();
    const add = (item: SearchSuggestion) => {
      const key = `${item.kind}:${item.value}`;
      if (seen.has(key)) return;
      seen.add(key);
      propertySuggestions.push(item);
    };

    properties.forEach((property) => {
      if (property.project_name) add({ key: `project:${property.project_name}`, kind: "project", label: property.project_name, secondary: [property.district, property.province].filter(Boolean).join(" · "), value: property.project_name });
      if (property.nearby_transit) add({ key: `transit:${property.nearby_transit}`, kind: "transit", label: property.nearby_transit, secondary: [property.district, property.province].filter(Boolean).join(" · "), value: property.nearby_transit });
      if (property.province) add({ key: `province:${property.province}`, kind: "province", label: property.province, secondary: "จังหวัด", value: property.province });
      if (property.district) add({ key: `district:${property.district}`, kind: "district", label: property.district, secondary: property.province || undefined, value: property.district });
      if (property.subdistrict) add({ key: `subdistrict:${property.subdistrict}`, kind: "subdistrict", label: property.subdistrict, secondary: [property.district, property.province].filter(Boolean).join(" · "), value: property.subdistrict });
    });

    const score = (item: SearchSuggestion) => {
      const label = normalizeSearch(item.label);
      const secondary = normalizeSearch(item.secondary || "");
      if (label === query) return 0;
      if (label.startsWith(query)) return 1;
      if (secondary.split(" · ").some((part) => part.startsWith(query))) return 2;
      if (label.includes(query)) return 3;
      if (secondary.includes(query)) return 4;
      return 99;
    };

    return [...propertySuggestions, ...geographySuggestions]
      .map((item) => ({ item, score: score(item) }))
      .filter(({ score }) => score < 99)
      .sort((a, b) => a.score - b.score || a.item.label.localeCompare(b.item.label, "th"))
      .slice(0, 12)
      .map(({ item }) => item);
  }, [search, properties, geographySuggestions]);

  function chooseSearchSuggestion(item: SearchSuggestion) {
    setSearch(item.value);
    setSearchOpen(false);
    setActiveSuggestion(-1);
  }

  function suggestionIcon(kind: SearchSuggestion["kind"]) {
    if (kind === "project") return "🏢";
    if (kind === "transit") return "🚆";
    return "📍";
  }

  const filteredProperties = properties

    .filter((property) => {

      const searchText = search.trim().toLowerCase();



      const searchableText = [

        property.title,

        property.description,

        property.location,

        property.project_name,

        property.province,

        property.district,

        property.subdistrict,

        property.postal_code,

        property.nearby_transit,

        property.property_type,

        property.furnishing,

        ...(property.amenities || []),

      ].filter(Boolean).join(" ").toLowerCase();



      const matchesSearch = !searchText || searchableText.includes(searchText);



      const matchesListingType =

        listingType === "all" ||

        property.listing_type === listingType ||

        property.listing_type === "both";



      const matchesPropertyType =

        propertyType === "all" || property.property_type === propertyType;



      const filterPrice =

        listingType === "sale"

          ? Number(property.sale_price ?? (property.listing_type === "sale" ? property.price : 0))

          : listingType === "rent"

            ? Number(property.rent_price ?? (property.listing_type === "rent" ? property.price : 0))

            : Number(property.rent_price ?? property.sale_price ?? property.price);

      const matchesMinPrice = !minPrice || filterPrice >= Number(minPrice);

      const matchesMaxPrice = !maxPrice || filterPrice <= Number(maxPrice);

      const matchesBedrooms =

        !bedrooms || Number(property.bedrooms ?? -1) >= Number(bedrooms);

      const matchesBathrooms =

        !bathrooms || Number(property.bathrooms ?? -1) >= Number(bathrooms);

      const matchesMinArea =

        !minArea || Number(property.area_sqm ?? -1) >= Number(minArea);

      const matchesMaxArea =

        !maxArea || Number(property.area_sqm ?? Number.MAX_SAFE_INTEGER) <= Number(maxArea);

      const matchesFurnishing =

        furnishing === "all" || property.furnishing === furnishing;

      const matchesPets = !petFriendly || property.pet_friendly === true;

      const matchesParking = !parkingOnly || Number(property.parking_spaces ?? 0) > 0;

      const matchesTransit =

        !nearTransit ||

        (!!property.nearby_transit &&

          property.transit_distance_m != null &&

          property.transit_distance_m <= 1000);



      return (

        matchesSearch &&

        matchesListingType &&

        matchesPropertyType &&

        matchesMinPrice &&

        matchesMaxPrice &&

        matchesBedrooms &&

        matchesBathrooms &&

        matchesMinArea &&

        matchesMaxArea &&

        matchesFurnishing &&

        matchesPets &&

        matchesParking &&

        matchesTransit

      );

    })

    .sort((a, b) => {

      const sortPrice = (property: Property) =>

        listingType === "sale"

          ? Number(property.sale_price ?? property.price)

          : listingType === "rent"

            ? Number(property.rent_price ?? property.price)

            : Number(property.rent_price ?? property.sale_price ?? property.price);

      if (sortBy === "price-low") return sortPrice(a) - sortPrice(b);

      if (sortBy === "price-high") return sortPrice(b) - sortPrice(a);

      if (sortBy === "largest") return Number(b.area_sqm || 0) - Number(a.area_sqm || 0);

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

    });





  function clearFilters() {

    setSearch("");

    setListingType("all");

    setPropertyType("all");

    setMinPrice("");

    setMaxPrice("");

    setBedrooms("");

    setBathrooms("");

    setMinArea("");

    setMaxArea("");

    setFurnishing("all");

    setPetFriendly(false);

    setParkingOnly(false);

    setNearTransit(false);

    setSortBy("newest");

  }



  const activeFilterCount = [

    !!search,

    listingType !== "all",

    propertyType !== "all",

    !!minPrice,

    !!maxPrice,

    !!bedrooms,

    !!bathrooms,

    !!minArea,

    !!maxArea,

    furnishing !== "all",

    petFriendly,

    parkingOnly,

    nearTransit,

  ].filter(Boolean).length;



  return (

    <main className="min-h-screen bg-[#F2EEE3] text-[#1F2E28]">

      {/* MARKETPLACE INTRO */}

      <section className="border-b border-[#DDD6C3] bg-gradient-to-r from-[#EEF7F1] via-white to-[#F3F0E7]">

        <div className="mx-auto max-w-7xl px-6 pb-7 pt-9">

          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A16F32]">BaanNest Marketplace</p>

          <div className="mt-2 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">

            <div>

              <h1 className="font-display text-4xl md:text-5xl">Find a place that fits your life.</h1>

              <p className="mt-2 text-sm text-[#647068]">Homes, condos, land and investment properties across Thailand.</p>

            </div>

            <p className="text-xs font-semibold text-[#7A837D]">

              <span className="font-bold text-[#1F2E28]">{filteredProperties.length}</span> properties available

            </p>

          </div>

        </div>

      </section>



      {/* BAANNEST PROPERTY SEARCH NAV */}

      <section className="sticky top-0 z-40 border-b border-[#DCD5C5] bg-[#F7F4EC]/95 shadow-[0_12px_35px_rgba(31,46,40,0.07)] backdrop-blur-xl">

        <div ref={filterBarRef} className="relative mx-auto max-w-7xl px-6 py-4">

          {/* Search row */}

          <div className="flex gap-2.5">

            <div ref={searchBoxRef} className="relative flex-1">

              <div className="flex min-h-[58px] items-center rounded-2xl border border-[#D8D0BE] bg-white px-5 shadow-sm transition focus-within:border-[#B8863F] focus-within:ring-4 focus-within:ring-[#B8863F]/10">

                <Search size={20} className="mr-3 shrink-0 text-[#68736C]" />

                <input

                  type="text"

                  value={search}

                  onFocus={() => setSearchOpen(true)}

                  onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); setActiveSuggestion(-1); }}

                  onKeyDown={(e) => {

                    if (!searchOpen || liveSuggestions.length === 0) return;

                    if (e.key === "ArrowDown") { e.preventDefault(); setActiveSuggestion((v) => Math.min(v + 1, liveSuggestions.length - 1)); }

                    if (e.key === "ArrowUp") { e.preventDefault(); setActiveSuggestion((v) => Math.max(v - 1, 0)); }

                    if (e.key === "Enter" && activeSuggestion >= 0) { e.preventDefault(); chooseSearchSuggestion(liveSuggestions[activeSuggestion]); }

                    if (e.key === "Escape") { setSearchOpen(false); setActiveSuggestion(-1); }

                  }}

                  placeholder="ค้นหาทำเล, เขต, โครงการ, BTS / MRT..."

                  className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-[#9A9F9B]"

                  autoComplete="off"

                />

                {search && (

                  <button type="button" onClick={() => { setSearch(""); setSearchOpen(false); }} className="ml-2 rounded-full p-1.5 text-[#89918C] transition hover:bg-[#F2EEE3] hover:text-[#1F2E28]" aria-label="Clear search">

                    <X size={15}/>

                  </button>

                )}

              </div>



              {searchOpen && search.trim() && (

                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[80] overflow-hidden rounded-2xl border border-[#D8D0BE] bg-white shadow-[0_18px_55px_rgba(31,46,40,0.18)]">

                  {liveSuggestions.length ? (

                    <div className="max-h-[390px] overflow-y-auto p-2">

                      <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A918C]">Search suggestions</p>

                      {liveSuggestions.map((item,index) => (

                        <button key={item.key} type="button" onMouseDown={(e)=>e.preventDefault()} onClick={()=>chooseSearchSuggestion(item)}

                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${index===activeSuggestion?"bg-[#F2EEE3]":"hover:bg-[#F7F4EC]"}`}>

                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F2EEE3]">{suggestionIcon(item.kind)}</span>

                          <span className="min-w-0 flex-1">

                            <span className="block truncate text-sm font-bold text-[#1F2E28]">{item.label}</span>

                            {item.secondary && <span className="mt-0.5 block truncate text-xs text-[#7A837D]">{item.secondary}</span>}

                          </span>

                          <span className="rounded-full border border-[#E2DCCF] px-2 py-1 text-[9px] font-bold uppercase text-[#7A837D]">{item.kind}</span>

                        </button>

                      ))}

                    </div>

                  ) : <div className="p-5 text-sm text-[#69736D]">No matching location, project or station yet.</div>}

                </div>

              )}

            </div>



            <button

              type="button"

              onClick={() => setOpenFilter(openFilter === "advanced" ? null : "advanced")}

              className={`hidden min-h-[58px] items-center gap-2 rounded-2xl border px-5 text-sm font-bold transition md:flex ${openFilter === "advanced" ? "border-[#B8863F] bg-[#FFF6E7] text-[#8A602C]" : "border-[#D8D0BE] bg-white hover:border-[#B8863F]"}`}

            >

              <SlidersHorizontal size={17}/>

              Filters {activeFilterCount > 0 && <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#1F2E28] px-1.5 text-[10px] text-white">{activeFilterCount}</span>}

              <ChevronDown size={14} className={`transition ${openFilter === "advanced" ? "rotate-180" : ""}`}/>

            </button>



            <button

              type="button"

              onClick={() => setOpenFilter(openFilter === "sort" ? null : "sort")}

              className={`hidden min-h-[58px] items-center gap-2 rounded-2xl border px-5 text-sm font-bold transition md:flex ${openFilter === "sort" ? "border-[#B8863F] bg-[#FFF6E7]" : "border-[#D8D0BE] bg-white hover:border-[#B8863F]"}`}

            >

              <ArrowUpDown size={17}/> {sortLabel(sortBy)} <ChevronDown size={14}/>

            </button>

          </div>



          {/* Quick-filter row */}

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">

            <div className="flex shrink-0 rounded-xl border border-[#D8D0BE] bg-white p-1">

              {[

                ["rent", "Rent"],

                ["sale", "Buy"],

                ["all", "All"],

              ].map(([value, label]) => (

                <button

                  key={value}

                  type="button"

                  onClick={() => setListingType(value)}

                  className={`min-w-[78px] rounded-lg px-4 py-2.5 text-sm font-bold transition ${listingType === value ? "bg-[#1F2E28] text-white shadow-sm" : "text-[#59665F] hover:bg-[#F4F0E6]"}`}

                >

                  {label}

                </button>

              ))}

            </div>



            <QuickButton icon={<Building2 size={16}/>} label={propertyType === "all" ? "Property type" : prettyType(propertyType)} active={propertyType !== "all"} open={openFilter === "type"} onClick={() => setOpenFilter(openFilter === "type" ? null : "type")} />

            <QuickButton icon={<Banknote size={16}/>} label={budgetLabel(minPrice, maxPrice)} active={!!minPrice || !!maxPrice} open={openFilter === "budget"} onClick={() => setOpenFilter(openFilter === "budget" ? null : "budget")} />

            <QuickButton icon={<BedDouble size={16}/>} label={bedrooms ? `${bedrooms}+ beds` : "Bedrooms"} active={!!bedrooms} open={openFilter === "beds"} onClick={() => setOpenFilter(openFilter === "beds" ? null : "beds")} />

            <QuickButton icon={<Bath size={16}/>} label={bathrooms ? `${bathrooms}+ baths` : "Bathrooms"} active={!!bathrooms} open={openFilter === "baths"} onClick={() => setOpenFilter(openFilter === "baths" ? null : "baths")} />

            <QuickButton icon={<Maximize2 size={16}/>} label={(minArea || maxArea) ? "Size set" : "Size"} active={!!minArea || !!maxArea} open={openFilter === "advanced"} onClick={() => setOpenFilter(openFilter === "advanced" ? null : "advanced")} />



            {activeFilterCount > 0 && (

              <button type="button" onClick={clearFilters} className="shrink-0 rounded-xl px-4 text-xs font-bold text-[#8A602C] transition hover:bg-[#F0E8D8]">

                Clear all

              </button>

            )}

          </div>



          {/* Property type popover */}

          {openFilter === "type" && (

            <FilterPanel className="left-6 top-[145px] w-[340px]">

              <PanelTitle title="Property type" onClose={() => setOpenFilter(null)} />

              <div className="mt-4 grid grid-cols-2 gap-2">

                {[

                  ["all","All properties"],["condo","Condo"],["house","House"],

                  ["townhouse","Townhouse"],["land","Land"],["commercial","Commercial"]

                ].map(([value,label]) => (

                  <ChoiceButton key={value} active={propertyType === value} onClick={() => { setPropertyType(value); setOpenFilter(null); }}>{label}</ChoiceButton>

                ))}

              </div>

            </FilterPanel>

          )}



          {/* Budget popover */}

          {openFilter === "budget" && (

            <FilterPanel className="left-[220px] top-[145px] w-[520px]">

              <PanelTitle title="Budget" subtitle={listingType === "rent" ? "Monthly rent (THB)" : listingType === "sale" ? "Purchase price (THB)" : "Price (THB)"} onClose={() => setOpenFilter(null)} />

              <div className="mt-5 grid grid-cols-2 gap-3">

                <MoneyInput label="Minimum" value={minPrice} onChange={setMinPrice} placeholder="No minimum" />

                <MoneyInput label="Maximum" value={maxPrice} onChange={setMaxPrice} placeholder="No maximum" />

              </div>

              <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7A837D]">Quick ranges</p>

              <div className="mt-2 flex flex-wrap gap-2">

                {(listingType === "sale"

                  ? [["","3000000","Under ฿3M"],["3000000","5000000","฿3M – ฿5M"],["5000000","10000000","฿5M – ฿10M"],["10000000","","฿10M+"]]

                  : [["","10000","Under ฿10K"],["10000","20000","฿10K – ฿20K"],["20000","35000","฿20K – ฿35K"],["35000","50000","฿35K – ฿50K"],["50000","100000","฿50K – ฿100K"],["100000","","฿100K+"]]

                ).map(([min,max,label]) => (

                  <button key={label} type="button" onClick={() => {setMinPrice(min);setMaxPrice(max);}} className="rounded-xl border border-[#DDD5C5] bg-[#FBFAF6] px-3.5 py-2.5 text-xs font-semibold transition hover:border-[#B8863F] hover:bg-[#FFF8EA]">{label}</button>

                ))}

              </div>

              <PanelFooter onClear={() => {setMinPrice("");setMaxPrice("");}} onApply={() => setOpenFilter(null)} />

            </FilterPanel>

          )}



          {/* Bedrooms */}

          {openFilter === "beds" && (

            <FilterPanel className="left-[430px] top-[145px] w-[360px]">

              <PanelTitle title="Bedrooms" subtitle="Minimum number of bedrooms" onClose={() => setOpenFilter(null)} />

              <div className="mt-5 grid grid-cols-5 gap-2">

                {["","1","2","3","4"].map((value) => <ChoiceButton key={value || "any"} active={bedrooms === value} onClick={() => {setBedrooms(value);setOpenFilter(null);}}>{value ? `${value}+` : "Any"}</ChoiceButton>)}

              </div>

              <div className="mt-4">

                <label className="text-xs font-bold text-[#69736D]">Or type a number</label>

                <input type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} placeholder="Any" className="mt-2 w-full rounded-xl border border-[#DDD5C5] bg-white px-4 py-3 text-sm outline-none focus:border-[#B8863F]" />

              </div>

            </FilterPanel>

          )}



          {/* Bathrooms */}

          {openFilter === "baths" && (

            <FilterPanel className="left-[590px] top-[145px] w-[360px]">

              <PanelTitle title="Bathrooms" subtitle="Minimum number of bathrooms" onClose={() => setOpenFilter(null)} />

              <div className="mt-5 grid grid-cols-5 gap-2">

                {["","1","2","3","4"].map((value) => <ChoiceButton key={value || "any"} active={bathrooms === value} onClick={() => {setBathrooms(value);setOpenFilter(null);}}>{value ? `${value}+` : "Any"}</ChoiceButton>)}

              </div>

              <div className="mt-4">

                <label className="text-xs font-bold text-[#69736D]">Or type a number</label>

                <input type="number" min="0" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} placeholder="Any" className="mt-2 w-full rounded-xl border border-[#DDD5C5] bg-white px-4 py-3 text-sm outline-none focus:border-[#B8863F]" />

              </div>

            </FilterPanel>

          )}



          {/* Advanced */}

          {openFilter === "advanced" && (

            <FilterPanel className="right-6 top-[82px] w-[620px]">

              <PanelTitle title="All filters" subtitle={`${filteredProperties.length} matching ${filteredProperties.length === 1 ? "property" : "properties"}`} onClose={() => setOpenFilter(null)} />

              <div className="mt-5 grid gap-5 sm:grid-cols-2">

                <MoneyInput label="Minimum budget" value={minPrice} onChange={setMinPrice} placeholder="No minimum" />

                <MoneyInput label="Maximum budget" value={maxPrice} onChange={setMaxPrice} placeholder="No maximum" />

                <NumberInput label="Minimum bedrooms" value={bedrooms} onChange={setBedrooms} />

                <NumberInput label="Minimum bathrooms" value={bathrooms} onChange={setBathrooms} />

                <NumberInput label="Minimum size (m²)" value={minArea} onChange={setMinArea} />

                <NumberInput label="Maximum size (m²)" value={maxArea} onChange={setMaxArea} />

              </div>



              <div className="mt-6 border-t border-[#EEE8DC] pt-5">

                <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#8A602C]">Lifestyle & convenience</p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">

                  <ToggleFilter label="Pet friendly" description="Only show homes that allow pets" active={petFriendly} onClick={() => setPetFriendly(!petFriendly)} />

                  <ToggleFilter label="Parking" description="At least one parking space" active={parkingOnly} onClick={() => setParkingOnly(!parkingOnly)} />

                  <ToggleFilter label="Near transit" description="BTS / MRT within 1 km" active={nearTransit} onClick={() => setNearTransit(!nearTransit)} />

                </div>

              </div>



              <div className="mt-5">

                <p className="text-xs font-bold text-[#59675F]">Furnishing</p>

                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">

                  {[["all","Any"],["fully_furnished","Fully furnished"],["partly_furnished","Partly furnished"],["unfurnished","Unfurnished"]].map(([value,label]) => (

                    <ChoiceButton key={value} active={furnishing === value} onClick={() => setFurnishing(value)}>{label}</ChoiceButton>

                  ))}

                </div>

              </div>

              <PanelFooter onClear={clearFilters} onApply={() => setOpenFilter(null)} />

            </FilterPanel>

          )}



          {/* Sort */}

          {openFilter === "sort" && (

            <FilterPanel className="right-6 top-[82px] w-[310px]">

              <PanelTitle title="Sort properties" onClose={() => setOpenFilter(null)} />

              <div className="mt-4 space-y-1">

                {[["newest","Newest first"],["price-low","Price: low to high"],["price-high","Price: high to low"],["largest","Largest first"]].map(([value,label]) => (

                  <button key={value} type="button" onClick={() => {setSortBy(value);setOpenFilter(null);}} className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${sortBy === value ? "bg-[#F4E9D7] text-[#855C2B]" : "hover:bg-[#F5F2EA]"}`}>

                    {label}{sortBy === value && <Check size={16}/>}

                  </button>

                ))}

              </div>

            </FilterPanel>

          )}

        </div>

      </section>



      {/* LISTINGS */}

      <section className="mx-auto max-w-7xl px-6 py-10">

        {loading ? (

          <div className="py-20 text-center text-[#5C6B62]">

            Loading properties...

          </div>

        ) : filteredProperties.length === 0 ? (

          <div className="rounded-2xl border border-[#DDD6C3] bg-white p-16 text-center">

            <div className="text-5xl">🏠</div>



            <h2 className="mt-5 font-display text-3xl">

              No properties found

            </h2>



            <p className="mt-2 text-[#5C6B62]">

              Try changing your search or filters.

            </p>

          </div>

        ) : (

          <>

            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">

              <p className="text-sm text-[#5C6B62]">

                <span className="font-bold text-[#1F2E28]">{filteredProperties.length}</span>{" "}

                {filteredProperties.length === 1 ? "property" : "properties"} found

              </p>

              {activeFilterCount > 0 && <p className="text-xs font-semibold text-[#8A602C]">{activeFilterCount} active {activeFilterCount === 1 ? "filter" : "filters"}</p>}

            </div>



            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

              {filteredProperties.map(

                (property) => {

                  const coverPhoto =

                    getCoverPhoto(property.id);



                  return (

                    <article

                      key={property.id}

                      className="group overflow-hidden rounded-2xl border border-[#DDD6C3] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"

                    >

                      {/* IMAGE */}

                      <Link

                        href={`/properties/${property.id}`}

                      >

                        <div className="relative h-60 overflow-hidden bg-[#E7E1D2]">

                          {coverPhoto ? (

                            <img

                              src={coverPhoto}

                              alt={property.title}

                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"

                            />

                          ) : (

                            <div className="flex h-full items-center justify-center">

                              <div className="text-center text-[#8A918A]">

                                <div className="text-5xl">

                                  🏠

                                </div>

                                <p className="mt-2 text-sm">

                                  No photo yet

                                </p>

                              </div>

                            </div>

                          )}



                          <div className="absolute left-4 top-4">

                            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#1F2E28] backdrop-blur-sm">

                              {property.listing_type === "both"

                                ? "For Rent & Sale"

                                : property.listing_type === "rent"

                                  ? "For Rent"

                                  : "For Sale"}

                            </span>

                          </div>



                          <button

                            type="button"

                            aria-label={savedPropertyIds.has(property.id) ? "Remove from saved properties" : "Save property"}

                            disabled={savingPropertyId === property.id}

                            onClick={(event) => {

                              event.preventDefault();

                              event.stopPropagation();

                              toggleSavedProperty(property.id);

                            }}

                            className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border shadow-sm backdrop-blur-md transition hover:scale-105 disabled:cursor-wait disabled:opacity-60 ${savedPropertyIds.has(property.id) ? "border-[#B8863F] bg-[#FFF7E8] text-[#8B602A]" : "border-white/60 bg-white/90 text-[#1F2E28] hover:text-[#B8863F]"}`}

                          >

                            <Heart size={18} fill={savedPropertyIds.has(property.id) ? "currentColor" : "none"} />

                          </button>

                        </div>

                      </Link>



                      {/* INFO */}

                      <div className="p-5">

                        <p className="text-xs font-semibold uppercase tracking-widest text-[#B8863F]">

                          {property.property_type}

                        </p>



                        <Link

                          href={`/properties/${property.id}`}

                        >

                          <h2 className="mt-2 line-clamp-2 font-display text-2xl transition hover:text-[#B8863F]">

                            {property.title}

                          </h2>

                        </Link>



                        <p className="mt-2 line-clamp-1 text-sm text-[#5C6B62]">

                          📍{" "}

                          {[property.subdistrict, property.district, property.province].filter(Boolean).join(", ") ||

                            property.location ||

                            "Thailand"}

                        </p>



                        <p className="mt-5 text-2xl font-semibold">

                          {property.listing_type === "both" ? (

                            <span className="flex flex-col gap-1">

                              <span>฿{Number(property.rent_price ?? property.price).toLocaleString()} <span className="text-sm font-normal text-[#5C6B62]">/ month</span></span>

                              <span className="text-lg text-[#8A602C]">฿{Number(property.sale_price ?? property.price).toLocaleString()} <span className="text-xs font-normal text-[#7A837D]">sale</span></span>

                            </span>

                          ) : property.listing_type === "rent" ? (

                            <>฿{Number(property.rent_price ?? property.price).toLocaleString()}<span className="text-sm font-normal text-[#5C6B62]"> / month</span></>

                          ) : (

                            <>฿{Number(property.sale_price ?? property.price).toLocaleString()}</>

                          )}

                        </p>



                        <div className="mt-5 flex gap-4 border-t border-[#EEE9DB] pt-5 text-sm text-[#5C6B62]">

                          <span>

                            🛏{" "}

                            {property.bedrooms ??

                              "-"}{" "}

                            Beds

                          </span>



                          <span>

                            🛁{" "}

                            {property.bathrooms ??

                              "-"}{" "}

                            Baths

                          </span>



                          <span>

                            📐{" "}

                            {property.area_sqm ??

                              "-"}{" "}

                            m²

                          </span>

                        </div>



                      </div>

                    </article>

                  );

                }

              )}

            </div>

          </>

        )}

      </section>

    </main>

  );

}



function QuickButton({ icon, label, active, open, onClick }: { icon: React.ReactNode; label: string; active: boolean; open: boolean; onClick: () => void }) {

  return (

    <button type="button" onClick={onClick} className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${active || open ? "border-[#B8863F] bg-[#FFF6E7] text-[#855C2B]" : "border-[#D8D0BE] bg-white text-[#4F5E56] hover:border-[#B8863F]"}`}>

      {icon}<span>{label}</span><ChevronDown size={13} className={`transition ${open ? "rotate-180" : ""}`}/>

    </button>

  );

}



function FilterPanel({ children, className }: { children: React.ReactNode; className: string }) {

  return <div className={`absolute z-50 max-h-[70vh] overflow-y-auto rounded-[1.6rem] border border-[#D8D0BE] bg-white p-5 shadow-[0_28px_80px_rgba(24,35,30,0.22)] ${className}`}>{children}</div>;

}



function PanelTitle({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {

  return (

    <div className="flex items-start justify-between gap-4">

      <div><h3 className="font-display text-2xl text-[#1F2E28]">{title}</h3>{subtitle && <p className="mt-1 text-xs text-[#747D77]">{subtitle}</p>}</div>

      <button type="button" onClick={onClose} className="rounded-full p-2 text-[#7B837D] transition hover:bg-[#F3EFE6] hover:text-[#1F2E28]"><X size={17}/></button>

    </div>

  );

}



function ChoiceButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {

  return <button type="button" onClick={onClick} className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${active ? "border-[#1F2E28] bg-[#1F2E28] text-white" : "border-[#DDD5C5] bg-[#FBFAF6] hover:border-[#B8863F]"}`}>{children}</button>;

}



function MoneyInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value:string) => void; placeholder: string }) {

  return (

    <label><span className="mb-2 block text-xs font-bold text-[#59675F]">{label}</span>

      <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#6C756F]">฿</span><input type="number" min="0" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-[#DDD5C5] bg-white py-3 pl-9 pr-4 text-sm outline-none placeholder:text-[#A0A49F] focus:border-[#B8863F]"/></div>

    </label>

  );

}



function NumberInput({ label, value, onChange }: { label: string; value: string; onChange: (value:string) => void }) {

  return <label><span className="mb-2 block text-xs font-bold text-[#59675F]">{label}</span><input type="number" min="0" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Any" className="w-full rounded-xl border border-[#DDD5C5] bg-white px-4 py-3 text-sm outline-none placeholder:text-[#A0A49F] focus:border-[#B8863F]"/></label>;

}



function PanelFooter({ onClear, onApply }: { onClear: () => void; onApply: () => void }) {

  return <div className="mt-6 flex items-center justify-end gap-2 border-t border-[#EEE8DC] pt-4"><button type="button" onClick={onClear} className="rounded-xl px-4 py-3 text-sm font-bold text-[#68736C] hover:bg-[#F4F0E7]">Clear</button><button type="button" onClick={onApply} className="rounded-xl bg-[#1F2E28] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#30443B]">Apply</button></div>;

}



function prettyType(value: string) {

  return value.replace(/\_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

}



function budgetLabel(min: string, max: string) {

  if (!min && !max) return "Budget";

  const short = (value: string) => {

    const n = Number(value);

    if (n >= 1000000) return `฿${(n / 1000000).toLocaleString()}M`;

    if (n >= 1000) return `฿${(n / 1000).toLocaleString()}K`;

    return `฿${n.toLocaleString()}`;

  };

  if (min && max) return `${short(min)} – ${short(max)}`;

  if (min) return `${short(min)}+`;

  return `Up to ${short(max)}`;

}



function sortLabel(value: string) {

  if (value === "price-low") return "Price ↑";

  if (value === "price-high") return "Price ↓";

  if (value === "largest") return "Largest";

  return "Newest";

}





function ToggleFilter({ label, description, active, onClick }: { label: string; description: string; active: boolean; onClick: () => void }) {

  return (

    <button type="button" onClick={onClick} className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition ${active ? "border-[#B8863F] bg-[#FFF6E7]" : "border-[#DDD5C5] bg-[#FBFAF6] hover:border-[#B8863F]"}`}>

      <span>

        <span className="block text-sm font-bold text-[#1F2E28]">{label}</span>

        <span className="mt-0.5 block text-[10px] leading-4 text-[#7B847E]">{description}</span>

      </span>

      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${active ? "border-[#1F2E28] bg-[#1F2E28] text-white" : "border-[#CFC7B7] bg-white"}`}>

        {active && <Check size={13}/>}

      </span>

    </button>

  );

}
