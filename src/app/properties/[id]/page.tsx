"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Bath, BedDouble, Building2, CalendarDays, Car, ChevronLeft, ChevronRight, Clock3, Expand, Heart, Home, MapPin, Maximize2, MessageCircle, PawPrint, Share2, Sofa, Sparkles, TrainFront, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthModal } from "@/components/auth/AuthProvider";

type Property = {
  id: string;
  title: string;
  description: string;
  property_type: string;
  listing_type: string;
  price: number;
  rent_price: number | null;
  sale_price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  location: string | null;
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
  owner_id?: string;
};

type PropertyPhoto = {
  id: string;
  property_id: string;
  image_url: string | null;
  sort_order: number | null;
};

export default function PropertyPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  const supabase = createClient();
  const { openAuth } = useAuthModal();

  const [property, setProperty] =
    useState<Property | null>(null);

  const [photos, setPhotos] =
    useState<PropertyPhoto[]>([]);

  const [selectedPhoto, setSelectedPhoto] =
    useState<PropertyPhoto | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquirySending, setEnquirySending] = useState(false);
  const [enquiryError, setEnquiryError] = useState("");
  const [enquirySent, setEnquirySent] = useState(false);
  const [isTeamAgent, setIsTeamAgent] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [enquiryMode, setEnquiryMode] = useState<"enquiry" | "co_work">("enquiry");
  const [enquiryForm, setEnquiryForm] = useState({
    name: "",
    phone: "",
    preferred_contact: "phone",
    viewing_date: "",
    interest_type: "",
    message: "",
  });

  useEffect(() => {
    if (propertyId) {
      loadProperty();
      loadSavedState();
    }
  }, [propertyId]);

  async function loadProperty() {
    setLoading(true);
    setError(false);

    const { data: authData } = await supabase.auth.getUser();
    let teamAgent = false;

    if (authData.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .maybeSingle();

      const role = profile?.role || null;
      setCurrentUserRole(role);
      teamAgent = role === "baannest_agent";
    } else {
      setCurrentUserRole(null);
    }

    setIsTeamAgent(teamAgent);

    let propertyData: any = null;
    let propertyError: any = null;

    if (teamAgent) {
      const result = await supabase.rpc("get_baannest_agent_property", {
        p_property_id: propertyId,
      });
      propertyData = result.data;
      propertyError = result.error;

      if (!propertyData && !propertyError) {
        propertyError = { message: "Property not found" };
      }
    } else {
      const result = await supabase
        .from("properties")
        .select(
          "id,title,description,property_type,listing_type,price,rent_price,sale_price,bedrooms,bathrooms,area_sqm,location,created_at,project_name,province,district,subdistrict,postal_code,floor_number,parking_spaces,furnishing,property_condition,nearby_transit,transit_distance_m,minimum_lease_months,available_from,pet_friendly,amenities,owner_id"
        )
        .eq("id", propertyId)
        .eq("status", "active")
        .single();

      propertyData = result.data;
      propertyError = result.error;
    }

    if (propertyError) {
      console.error(
        "PROPERTY ERROR:",
        propertyError
      );

      setError(true);
      setLoading(false);
      return;
    }

    setProperty(propertyData);

    const {
      data: photoData,
      error: photoError,
    } = await supabase
      .from("property_photos")
      .select(
        "id,property_id,image_url,sort_order"
      )
      .eq("property_id", propertyId)
      .order("sort_order", {
        ascending: true,
      });

    if (photoError) {
      console.error(
        "PHOTO ERROR MESSAGE:",
        photoError.message
      );

      console.error(
        "PHOTO ERROR DETAILS:",
        photoError.details
      );

      console.error(
        "PHOTO ERROR HINT:",
        photoError.hint
      );

      console.error(
        "PHOTO ERROR CODE:",
        photoError.code
      );
    } else {
      const loadedPhotos = photoData || [];

      setPhotos(loadedPhotos);

      if (loadedPhotos.length > 0) {
        setSelectedPhoto(loadedPhotos[0]);
      }
    }

    setLoading(false);
  }

  function goToPreviousPhoto() {
    if (photos.length <= 1 || !selectedPhoto) {
      return;
    }

    const currentIndex = photos.findIndex(
      (photo) => photo.id === selectedPhoto.id
    );

    const previousIndex =
      currentIndex <= 0
        ? photos.length - 1
        : currentIndex - 1;

    setSelectedPhoto(photos[previousIndex]);
  }

  function goToNextPhoto() {
    if (photos.length <= 1 || !selectedPhoto) {
      return;
    }

    const currentIndex = photos.findIndex(
      (photo) => photo.id === selectedPhoto.id
    );

    const nextIndex =
      currentIndex >= photos.length - 1
        ? 0
        : currentIndex + 1;

    setSelectedPhoto(photos[nextIndex]);
  }


  async function loadSavedState() {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setSaved(false);
      return;
    }

    const { data, error } = await supabase
      .from("saved_properties")
      .select("property_id")
      .eq("user_id", authData.user.id)
      .eq("property_id", propertyId)
      .maybeSingle();

    if (error) {
      console.error("SAVED STATE ERROR:", error);
      return;
    }

    setSaved(!!data);
  }

  async function toggleSaved() {
    if (saving) return;

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      router.push(`/login?returnTo=${encodeURIComponent(`/properties/${propertyId}`)}`);
      return;
    }

    setSaving(true);

    if (saved) {
      const { error } = await supabase
        .from("saved_properties")
        .delete()
        .eq("user_id", authData.user.id)
        .eq("property_id", propertyId);

      if (!error) setSaved(false);
      else console.error("UNSAVE PROPERTY ERROR:", error);
    } else {
      const { error } = await supabase
        .from("saved_properties")
        .insert({ user_id: authData.user.id, property_id: propertyId });

      if (!error) setSaved(true);
      else console.error("SAVE PROPERTY ERROR:", error);
    }

    setSaving(false);
  }

  async function shareProperty() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: property?.title || "BaanNest property", url });
      } catch {}
      return;
    }
    await navigator.clipboard?.writeText(url);
  }

  async function contactRepresentative(mode: "enquiry" | "co_work" = "enquiry") {
    if (isTeamAgent) return;

    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      openAuth("login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,phone")
      .eq("id", data.user.id)
      .maybeSingle();

    setEnquiryMode(mode);
    setEnquiryForm((current) => ({
      ...current,
      name: current.name || profile?.full_name || "",
      phone: current.phone || profile?.phone || "",
      interest_type:
        mode === "co_work"
          ? "co_work"
          : current.interest_type ||
            (property?.listing_type === "both" ? "" : property?.listing_type || ""),
      message:
        mode === "co_work"
          ? `Hi BaanNest, I'd like to co-work with you on ${property?.title || "this property"} for my client. Please contact me to discuss the cooperation.`
          : `Hi, I'm interested in ${property?.title || "this property"}. Please contact me with more information.`,
    }));
    setEnquiryError("");
    setEnquirySent(false);
    setEnquiryOpen(true);
  }

  function validThaiMobile(value: string) {
    const digits = value.replace(/\D/g, "");
    const normalized = digits.startsWith("66") ? `0${digits.slice(2)}` : digits;
    return /^0[689]\d{8}$/.test(normalized);
  }

  async function submitEnquiry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!property) return;

    setEnquiryError("");
    if (!enquiryForm.name.trim()) return setEnquiryError("Please enter your name.");
    if (!validThaiMobile(enquiryForm.phone)) return setEnquiryError("Enter a valid Thai mobile number starting with 06, 08, or 09.");
    if (property.listing_type === "both" && enquiryMode === "enquiry" && !enquiryForm.interest_type)
      return setEnquiryError("Please choose whether you're interested in renting or buying.");
    if (!enquiryForm.message.trim()) return setEnquiryError("Please enter a message.");

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setEnquiryOpen(false);
      openAuth("login");
      return;
    }
    if (property.owner_id && authData.user.id === property.owner_id) {
      return setEnquiryError("This is your own listing. You cannot send an enquiry to yourself.");
    }

    setEnquirySending(true);
    const { error } = await supabase.from("property_enquiries").insert({
      property_id: property.id,
      seeker_id: authData.user.id,
      seeker_name: enquiryForm.name.trim(),
      seeker_phone: enquiryForm.phone.replace(/\s/g, ""),
      seeker_email: authData.user.email || null,
      preferred_contact: enquiryForm.preferred_contact,
      viewing_date: enquiryForm.viewing_date || null,
      message:
        enquiryMode === "co_work"
          ? enquiryForm.message.trim()
          : `${enquiryForm.interest_type === "sale" ? "[Interested in buying]" : enquiryForm.interest_type === "rent" ? "[Interested in renting]" : ""} ${enquiryForm.message.trim()}`.trim(),
      enquiry_type: enquiryMode,
    });

    if (error) {
      setEnquiryError(error.message);
    } else {
      setEnquirySent(true);
    }
    setEnquirySending(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F2EEE3] text-[#1F2E28]">
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-[#5C6B62]">
            Loading property...
          </p>
        </div>
      </main>
    );
  }

  if (error || !property) {
    return (
      <main className="min-h-screen bg-[#F2EEE3] text-[#1F2E28]">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <div className="text-5xl">
            🏠
          </div>

          <h1 className="mt-5 font-display text-3xl">
            Property not found
          </h1>

          <p className="mt-3 text-[#5C6B62]">
            This property may no longer be
            available.
          </p>

          <a
            href="/properties"
            className="mt-8 inline-block rounded-xl bg-[#1F2E28] px-6 py-3 font-medium text-[#F2EEE3]"
          >
            Back to Properties
          </a>
        </div>
      </main>
    );
  }

  const selectedPhotoIndex = selectedPhoto
    ? photos.findIndex(
        (photo) =>
          photo.id === selectedPhoto.id
      )
    : -1;

  return (
    <main className="min-h-screen bg-[#F4F0E6] pb-20 text-[#1F2E28] lg:pb-0">
      <section className="mx-auto max-w-7xl px-6 pb-20 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button type="button" onClick={() => router.push("/properties")} className="group inline-flex items-center gap-2 text-sm font-semibold text-[#647068] transition hover:text-[#1F2E28]">
            <ArrowLeft size={17} className="transition group-hover:-translate-x-1" /> Back to properties
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={shareProperty} className="inline-flex h-11 items-center gap-2 rounded-full border border-[#D8D0BE] bg-white px-4 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5">
              <Share2 size={16} /> Share
            </button>
            <button type="button" onClick={toggleSaved} disabled={saving} className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 ${saved ? "border-[#B8863F] bg-[#FFF7E8] text-[#8B602A]" : "border-[#D8D0BE] bg-white"}`}>
              <Heart size={16} fill={saved ? "currentColor" : "none"} /> {saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[2rem] bg-[#DED8CA] shadow-[0_18px_55px_rgba(31,46,40,0.08)]">
          {selectedPhoto?.image_url ? (
            <div className="group relative aspect-[16/7] min-h-[390px] max-h-[650px]">
              <img src={selectedPhoto.image_url} alt={property.title} className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/5" />
              {photos.length > 1 && <>
                <button type="button" onClick={goToPreviousPhoto} className="absolute left-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition hover:scale-105 hover:bg-black/55"><ChevronLeft /></button>
                <button type="button" onClick={goToNextPhoto} className="absolute right-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition hover:scale-105 hover:bg-black/55"><ChevronRight /></button>
              </>}
              <button type="button" onClick={() => setLightboxOpen(true)} className="absolute bottom-5 right-5 inline-flex items-center gap-2 rounded-full bg-black/50 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-black/65">
                <Expand size={14} /> View all photos · {photos.length}
              </button>
            </div>
          ) : (
            <div className="flex min-h-[430px] items-center justify-center text-[#718078]"><Building2 size={48} strokeWidth={1.3} /></div>
          )}
        </div>

        {photos.length > 1 && (
          <div className="mt-3 flex gap-2.5 overflow-x-auto pb-2">
            {photos.map((photo) => photo.image_url ? (
              <button key={photo.id} type="button" onClick={() => setSelectedPhoto(photo)} className={`h-[76px] w-[108px] shrink-0 overflow-hidden rounded-xl border-2 transition ${selectedPhoto?.id === photo.id ? "border-[#B8863F]" : "border-transparent opacity-60 hover:opacity-100"}`}>
                <img src={photo.image_url} alt="" className="h-full w-full object-cover" />
              </button>
            ) : null)}
          </div>
        )}

        <div className="mt-9 border-b border-[#DCD4C3] pb-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-2.5">
                <span className="rounded-full bg-[#1F2E28] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white">{property.listing_type === "both" ? "For rent & sale" : property.listing_type === "rent" ? "For rent" : "For sale"}</span>
                <span className="rounded-full border border-[#D8D0BE] bg-white/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#6C756F]">{property.property_type}</span>
              </div>
              {property.project_name && (
                <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-[#A16F32]">
                  {property.project_name}
                </p>
              )}
              <h1 className={`${property.project_name ? "mt-2" : "mt-5"} font-display text-4xl leading-[1.08] md:text-5xl lg:text-[3.6rem]`}>{property.title}</h1>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#657068]">
                <span className="inline-flex items-center gap-1.5"><MapPin size={16} />{[property.subdistrict, property.district, property.province, property.postal_code].filter(Boolean).join(", ") || property.location || "Thailand"}</span>
                {property.nearby_transit && <span className="inline-flex items-center gap-1.5"><TrainFront size={16} />{property.nearby_transit}{property.transit_distance_m != null ? ` · ${property.transit_distance_m.toLocaleString()} m` : ""}</span>}
                <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} />Listed {new Date(property.created_at).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })}</span>
              </div>
            </div>
            <div className="lg:text-right">
              {property.listing_type === "both" ? (
                <div className="space-y-3">
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7A827C]">Monthly rent</p><p className="mt-1 font-display text-3xl">฿{Number(property.rent_price ?? property.price).toLocaleString()}<span className="ml-1 font-sans text-sm font-medium text-[#68736C]">/ month</span></p></div>
                  <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7A827C]">Selling price</p><p className="mt-1 font-display text-3xl">฿{Number(property.sale_price ?? property.price).toLocaleString()}</p></div>
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7A827C]">{property.listing_type === "rent" ? "Monthly rent" : "Selling price"}</p>
                  <p className="mt-2 font-display text-4xl">฿{Number(property.listing_type === "rent" ? (property.rent_price ?? property.price) : (property.sale_price ?? property.price)).toLocaleString()}{property.listing_type === "rent" && <span className="ml-1 font-sans text-sm font-medium text-[#68736C]">/ month</span>}</p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_370px]">
          <div className="min-w-0">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {property.bedrooms != null && <Fact icon={<BedDouble size={20}/>} label="Bedrooms" value={property.bedrooms === 0 ? "Studio" : property.bedrooms} />}
              {property.bathrooms != null && <Fact icon={<Bath size={20}/>} label="Bathrooms" value={property.bathrooms} />}
              {property.area_sqm != null && <Fact icon={<Maximize2 size={19}/>} label="Interior area" value={`${property.area_sqm} m²`} />}
              {property.floor_number != null && <Fact icon={<Building2 size={19}/>} label="Floor" value={property.floor_number} />}
              {property.parking_spaces != null && <Fact icon={<Car size={19}/>} label="Parking" value={`${property.parking_spaces} ${property.parking_spaces === 1 ? "space" : "spaces"}`} />}
              {property.furnishing && <Fact icon={<Sofa size={19}/>} label="Furnishing" value={prettyValue(property.furnishing)} />}
            </div>

            <section className="mt-10 border-t border-[#DDD5C5] pt-9">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A16F32]">The property</p>
              <h2 className="mt-2 font-display text-3xl">About this home</h2>
              <p className="mt-5 max-w-3xl whitespace-pre-line text-[15px] leading-8 text-[#59675F]">{property.description || "More information is available from BaanNest."}</p>
            </section>

            <section className="mt-10 border-t border-[#DDD5C5] pt-9">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A16F32]">At a glance</p>
              <h2 className="mt-2 font-display text-3xl">Property overview</h2>
              <div className="mt-5 overflow-hidden rounded-2xl border border-[#DDD5C5] bg-white/55">
                {property.project_name && <Row label="Project / building" value={property.project_name} />}
                <Row label="Property type" value={prettyValue(property.property_type)} />
                <Row label="Listing" value={property.listing_type === "both" ? "For rent & sale" : property.listing_type === "rent" ? "For rent" : "For sale"} />
                {property.property_condition && <Row label="Condition" value={prettyValue(property.property_condition)} />}
                {property.available_from && <Row label="Available from" value={formatDate(property.available_from)} />}
                {(property.listing_type === "rent" || property.listing_type === "both") && property.minimum_lease_months != null && <Row label="Minimum lease" value={`${property.minimum_lease_months} ${property.minimum_lease_months === 1 ? "month" : "months"}`} />}
                <Row label="Location" value={[property.subdistrict, property.district, property.province, property.postal_code].filter(Boolean).join(", ") || property.location || "Thailand"} />
                <Row label="Reference" value={`BN-${property.id.slice(0,8).toUpperCase()}`} last />
              </div>
            </section>

            <section className="mt-10 border-t border-[#DDD5C5] pt-9">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A16F32]">Location</p>
              <h2 className="mt-2 font-display text-3xl">Around the property</h2>
              <div className="mt-5 overflow-hidden rounded-[1.6rem] border border-[#DDD5C5] bg-white/55">
                <div className="grid gap-0 md:grid-cols-2">
                  <div className="p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F2EEE3] text-[#A16F32]"><MapPin size={20}/></div>
                    <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B847E]">Area</p>
                    <p className="mt-1.5 text-base font-bold leading-7">
                      {[property.subdistrict, property.district, property.province].filter(Boolean).join(", ") || property.location || "Thailand"}
                    </p>
                    {property.postal_code && <p className="mt-1 text-sm text-[#68736C]">Postal code {property.postal_code}</p>}
                  </div>
                  <div className="border-t border-[#E8E2D5] p-6 md:border-l md:border-t-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F2EEE3] text-[#A16F32]"><TrainFront size={20}/></div>
                    <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B847E]">Nearby transit</p>
                    <p className="mt-1.5 text-base font-bold leading-7">{property.nearby_transit || "No nearby BTS / MRT specified"}</p>
                    {property.nearby_transit && property.transit_distance_m != null && <p className="mt-1 text-sm text-[#68736C]">{property.transit_distance_m.toLocaleString()} metres from the property</p>}
                  </div>
                </div>
                <div className="border-t border-[#E8E2D5] bg-[#F8F5ED] px-6 py-4 text-xs leading-5 text-[#778078]">
                  BaanNest shows the general listing area for discovery. Private lister contact details are not displayed.
                </div>
              </div>
            </section>

            {(property.nearby_transit || property.pet_friendly || (property.amenities && property.amenities.length > 0)) && (
              <section className="mt-10 border-t border-[#DDD5C5] pt-9">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A16F32]">Living here</p>
                <h2 className="mt-2 font-display text-3xl">Lifestyle & amenities</h2>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {property.nearby_transit && (
                    <InfoCard
                      icon={<TrainFront size={20}/>}
                      title="Nearby transit"
                      value={`${property.nearby_transit}${property.transit_distance_m != null ? ` · ${property.transit_distance_m.toLocaleString()} m away` : ""}`}
                    />
                  )}
                  {property.pet_friendly && (
                    <InfoCard icon={<PawPrint size={20}/>} title="Pet policy" value="Pet friendly" />
                  )}
                  {property.available_from && (
                    <InfoCard icon={<Clock3 size={20}/>} title="Availability" value={formatDate(property.available_from)} />
                  )}
                  {property.property_condition && (
                    <InfoCard icon={<Home size={20}/>} title="Condition" value={prettyValue(property.property_condition)} />
                  )}
                </div>

                {property.amenities && property.amenities.length > 0 && (
                  <div className="mt-6 rounded-[1.5rem] border border-[#DDD5C5] bg-white/55 p-5 md:p-6">
                    <div className="flex items-center gap-2 text-[#A16F32]"><Sparkles size={18}/><span className="text-xs font-bold uppercase tracking-[0.16em]">Amenities</span></div>
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      {property.amenities.map((amenity) => (
                        <span key={amenity} className="rounded-full border border-[#D8D0BE] bg-[#FBFAF6] px-4 py-2.5 text-sm font-semibold text-[#526158]">
                          ✓ {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {photos.length > 1 && (
              <section className="mt-10 border-t border-[#DDD5C5] pt-9">
                <div className="flex items-end justify-between">
                  <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A16F32]">Gallery</p><h2 className="mt-2 font-display text-3xl">Explore the property</h2></div>
                  <button type="button" onClick={() => setLightboxOpen(true)} className="text-xs font-bold underline decoration-[#B8863F] underline-offset-4">View all {photos.length}</button>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {photos.slice(0,4).map((photo, index) => photo.image_url ? (
                    <button key={photo.id} type="button" onClick={() => { setSelectedPhoto(photo); setLightboxOpen(true); }} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#DED8CA]">
                      <img src={photo.image_url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
                      {index === 3 && photos.length > 4 && <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-bold text-white">+{photos.length-4} more</div>}
                    </button>
                  ) : null)}
                </div>
              </section>
            )}
          </div>

          <aside>
            <div className="sticky top-24 overflow-hidden rounded-[1.8rem] border border-[#D8D0BE] bg-white shadow-[0_18px_55px_rgba(31,46,40,0.08)]">
              <div className="p-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A16F32]">BaanNest listing</p>
                <h3 className="mt-2 font-display text-2xl">Interested in this property?</h3>
                <p className="mt-3 text-sm leading-6 text-[#68736C]">Send an enquiry to BaanNest. Our team will coordinate with you and the property lister while keeping private contact details protected.</p>
                {(property.project_name || property.nearby_transit) && (
                  <div className="mt-5 rounded-2xl bg-[#F7F3E9] p-4">
                    {property.project_name && <p className="text-sm font-bold text-[#1F2E28]">{property.project_name}</p>}
                    {property.nearby_transit && <p className={`${property.project_name ? "mt-1.5" : ""} flex items-center gap-1.5 text-xs text-[#68736C]`}><TrainFront size={14}/>{property.nearby_transit}{property.transit_distance_m != null ? ` · ${property.transit_distance_m.toLocaleString()} m` : ""}</p>}
                  </div>
                )}
                {isTeamAgent ? (
                  <div className="mt-6 rounded-xl border border-[#D8D0BE] bg-[#F7F3E9] px-5 py-4 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#A16F32]">Internal inventory</p>
                    <p className="mt-1 text-xs leading-5 text-[#68736C]">Lister identity and private contact details are protected. Customer leads are handled by BaanNest admin.</p>
                  </div>
                ) : currentUserRole === "external_agent" ? (
                  <div className="mt-6 space-y-2.5">
                    <button type="button" onClick={() => contactRepresentative("enquiry")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1F2E28] px-5 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#2D4038]">
                      <MessageCircle size={17}/> Enquire as buyer / renter
                    </button>
                    <button type="button" onClick={() => contactRepresentative("co_work")} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#B8863F] bg-[#FFF8EA] px-5 py-4 text-sm font-bold text-[#8A602C] transition hover:-translate-y-0.5 hover:bg-[#FFF2D8]">
                      <Building2 size={17}/> Co-work with BaanNest
                    </button>
                    <p className="px-2 text-center text-[11px] leading-5 text-[#7A837D]">Co-work requests go to BaanNest admin. The property lister's private identity remains protected.</p>
                  </div>
                ) : (
                  <button type="button" onClick={() => contactRepresentative("enquiry")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1F2E28] px-5 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#2D4038]"><MessageCircle size={17}/> Enquire with BaanNest →</button>
                )}
                <button type="button" onClick={toggleSaved} disabled={saving} className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#DDD5C5] bg-[#FBFAF6] px-5 py-3.5 text-sm font-bold transition hover:border-[#B8863F]"><Heart size={16} fill={saved ? "currentColor" : "none"}/>{saved ? "Saved to favourites" : "Save property"}</button>
              </div>
              <div className="border-t border-[#EEE8DC] bg-[#F8F5ED] px-7 py-5 text-xs leading-5 text-[#778078]">Browse freely. Sign in is only requested when you want to save a property or contact a representative.</div>
            </div>
          </aside>
        </div>
      </section>


      {enquiryOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#132019]/55 p-4 backdrop-blur-md" onClick={() => setEnquiryOpen(false)}>
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[1.8rem] border border-white/20 bg-[#FBFAF6] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-[#E7E0D2] p-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A16F32]">{enquiryMode === "co_work" ? "Agent co-work request" : "Property enquiry"}</p>
                <h2 className="mt-2 font-display text-3xl">Enquire with BaanNest</h2>
                <p className="mt-2 line-clamp-1 text-sm text-[#68736C]">{property.title}</p>
              </div>
              <button type="button" onClick={() => setEnquiryOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#DDD5C5] bg-white"><X size={18}/></button>
            </div>

            {enquirySent ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF3EC] text-2xl">✓</div>
                <h3 className="mt-5 font-display text-3xl">Enquiry sent</h3>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#68736C]">{enquiryMode === "co_work"
                  ? "BaanNest has received your co-work request. Admin will coordinate the cooperation while keeping the property lister's private identity protected."
                  : "BaanNest has received your enquiry. Our team will coordinate with you and the property lister while keeping both parties' private contact details protected."}</p>
                <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => setEnquiryOpen(false)} className="flex-1 rounded-xl border border-[#D8D0BE] px-4 py-3 text-sm font-bold">Continue browsing</button>
                  <button type="button" onClick={() => router.push("/enquiries")} className="flex-1 rounded-xl bg-[#1F2E28] px-4 py-3 text-sm font-bold text-white">My Enquiries</button>
                </div>
              </div>
            ) : (
              <form onSubmit={submitEnquiry} className="p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-xs font-bold text-[#46544C]">Your name</span>
                    <input value={enquiryForm.name} onChange={(e)=>setEnquiryForm({...enquiryForm,name:e.target.value})} className="w-full rounded-xl border border-[#D8D0BE] bg-white px-4 py-3 text-sm outline-none focus:border-[#B8863F] focus:ring-4 focus:ring-[#B8863F]/10" />
                  </label>
                  <label>
                    <span className="mb-2 block text-xs font-bold text-[#46544C]">Phone number</span>
                    <input inputMode="tel" value={enquiryForm.phone} onChange={(e)=>setEnquiryForm({...enquiryForm,phone:e.target.value})} placeholder="08X XXX XXXX" className="w-full rounded-xl border border-[#D8D0BE] bg-white px-4 py-3 text-sm outline-none focus:border-[#B8863F] focus:ring-4 focus:ring-[#B8863F]/10" />
                  </label>
                  <label>
                    <span className="mb-2 block text-xs font-bold text-[#46544C]">Preferred contact</span>
                    <select value={enquiryForm.preferred_contact} onChange={(e)=>setEnquiryForm({...enquiryForm,preferred_contact:e.target.value})} className="w-full rounded-xl border border-[#D8D0BE] bg-white px-4 py-3 text-sm outline-none focus:border-[#B8863F]">
                      <option value="phone">Phone</option>
                      <option value="line">LINE</option>
                      <option value="email">Email</option>
                    </select>
                  </label>
                  {enquiryMode === "enquiry" && property.listing_type === "both" && (
                    <div className="sm:col-span-2">
                      <span className="mb-2 block text-xs font-bold text-[#46544C]">I'm interested in</span>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button type="button" onClick={() => setEnquiryForm({...enquiryForm,interest_type:"rent"})} className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${enquiryForm.interest_type === "rent" ? "border-[#B8863F] bg-[#FFF7E8] text-[#8B602A]" : "border-[#D8D0BE] bg-white text-[#526158]"}`}>Renting</button>
                        <button type="button" onClick={() => setEnquiryForm({...enquiryForm,interest_type:"sale"})} className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${enquiryForm.interest_type === "sale" ? "border-[#B8863F] bg-[#FFF7E8] text-[#8B602A]" : "border-[#D8D0BE] bg-white text-[#526158]"}`}>Buying</button>
                      </div>
                    </div>
                  )}
                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-xs font-bold text-[#46544C]">Preferred viewing date <span className="font-normal text-[#8A918A]">(optional)</span></span>
                    <input type="date" min={new Date().toISOString().slice(0,10)} value={enquiryForm.viewing_date} onChange={(e)=>setEnquiryForm({...enquiryForm,viewing_date:e.target.value})} className="w-full rounded-xl border border-[#D8D0BE] bg-white px-4 py-3 text-sm outline-none focus:border-[#B8863F]" />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="mb-2 block text-xs font-bold text-[#46544C]">Message</span>
                    <textarea rows={5} value={enquiryForm.message} onChange={(e)=>setEnquiryForm({...enquiryForm,message:e.target.value})} className="w-full resize-none rounded-xl border border-[#D8D0BE] bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[#B8863F] focus:ring-4 focus:ring-[#B8863F]/10" />
                  </label>
                </div>
                {enquiryError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{enquiryError}</div>}
                <p className="mt-4 text-xs leading-5 text-[#7A837D]">Your contact details are sent to BaanNest so our team can assist you. The property owner or external agent does not receive your private contact details through BaanNest.</p>
                <button type="submit" disabled={enquirySending} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1F2E28] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#2D4038] disabled:opacity-50">
                  <MessageCircle size={17}/>{enquirySending ? "Sending..." : enquiryMode === "co_work" ? "Send co-work request" : "Send enquiry"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {lightboxOpen && selectedPhoto?.image_url && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101713]/95 p-4 backdrop-blur-md" onClick={() => setLightboxOpen(false)}>
          <button type="button" onClick={() => setLightboxOpen(false)} className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white"><X size={21}/></button>
          {photos.length > 1 && <>
            <button type="button" onClick={(e) => {e.stopPropagation();goToPreviousPhoto();}} className="absolute left-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white"><ChevronLeft/></button>
            <button type="button" onClick={(e) => {e.stopPropagation();goToNextPhoto();}} className="absolute right-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white"><ChevronRight/></button>
          </>}
          <div onClick={(e) => e.stopPropagation()} className="text-center">
            <img src={selectedPhoto.image_url} alt={property.title} className="max-h-[82vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"/>
            <div className="mt-4 inline-block rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white">{selectedPhotoIndex + 1} / {photos.length}</div>
          </div>
        </div>
      )}

      {!isTeamAgent && (
        <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-[#DDD5C5] bg-[#FBFAF6]/95 p-3 shadow-[0_-10px_35px_rgba(31,46,40,0.10)] backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-7xl gap-2">
            <button type="button" onClick={toggleSaved} disabled={saving} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#D8D0BE] bg-white">
              <Heart size={18} fill={saved ? "currentColor" : "none"}/>
            </button>
            {currentUserRole === "external_agent" ? (
              <>
                <button type="button" onClick={() => contactRepresentative("enquiry")} className="flex-1 rounded-xl bg-[#1F2E28] px-4 text-sm font-bold text-white">Enquire</button>
                <button type="button" onClick={() => contactRepresentative("co_work")} className="flex-1 rounded-xl border border-[#B8863F] bg-[#FFF8EA] px-4 text-sm font-bold text-[#8A602C]">Co-work</button>
              </>
            ) : (
              <button type="button" onClick={() => contactRepresentative("enquiry")} className="flex-1 rounded-xl bg-[#1F2E28] px-4 text-sm font-bold text-white">Enquire with BaanNest</button>
            )}
          </div>
        </div>
      )}

      <footer className="border-t border-[#DDD5C5]">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 px-6 py-8 text-xs text-[#6D7770]">
          <span>© 2026 BaanNest · Bangkok, Thailand</span><span>Reference BN-{property.id.slice(0,8).toUpperCase()}</span>
        </div>
      </footer>
    </main>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return <div className="rounded-2xl border border-[#DDD5C5] bg-white/60 p-5"><div className="text-[#A16F32]">{icon}</div><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B847E]">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>;
}

function Row({ label, value, last=false }: { label:string; value:string; last?:boolean }) {
  return <div className={`flex items-center justify-between gap-6 px-5 py-4 ${last ? "" : "border-b border-[#E8E2D5]"}`}><span className="text-sm text-[#6D7770]">{label}</span><span className="text-right text-sm font-semibold capitalize">{value}</span></div>;
}


function InfoCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#DDD5C5] bg-white/55 p-5">
      <div className="text-[#A16F32]">{icon}</div>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#7B847E]">{title}</p>
      <p className="mt-1.5 text-sm font-bold leading-6 text-[#1F2E28]">{value}</p>
    </div>
  );
}

function prettyValue(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
