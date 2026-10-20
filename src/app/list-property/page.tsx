"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import thailandLocations from "@/data/thailand-locations.json";

type PropertyForm = {
  title: string;
  title_en: string;
  description: string;
  description_en: string;
  property_type: string;
  listing_type: string;
  price: string;
  rent_price: string;
  sale_price: string;
  bedrooms: string;
  bathrooms: string;
  area_sqm: string;
  location: string;
  project_name: string;
  province: string;
  district: string;
  subdistrict: string;
  postal_code: string;
  floor_number: string;
  parking_spaces: string;
  furnishing: string;
  property_condition: string;
  nearby_transit: string;
  has_nearby_transit: boolean;
  transit_distance_m: string;
  minimum_lease_months: string;
  available_from: string;
  pet_friendly: boolean;
  amenities: string[];
};

type PendingPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 15;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type SubdistrictOption = { value: string; nameEn: string; nameTh: string; postalCode: string };
type DistrictOption = { value: string; nameEn: string; nameTh: string; subdistricts: SubdistrictOption[] };
type ProvinceOption = { value: string; nameEn: string; nameTh: string; districts: DistrictOption[] };

const THAILAND_LOCATIONS = thailandLocations as ProvinceOption[];

// Rail suggestions stay intentionally curated. Areas without mapped stations can choose “No / not sure”.
const TRANSIT_BY_AREA: Record<string,string[]> = {
  "10|1038":["MRT Lat Phrao","MRT Lat Phrao 71","MRT Chok Chai 4","MRT Phawana"],
  "10|1039":["BTS Phrom Phong","BTS Thong Lo","BTS Ekkamai","BTS Phra Khanong","MRT Sukhumvit","MRT Phetchaburi"],
  "10|1030":["BTS Mo Chit","BTS Ha Yaek Lat Phrao","MRT Chatuchak Park","MRT Phahon Yothin","MRT Lat Phrao"],
  "10|1017":["MRT Phetchaburi","MRT Phra Ram 9","MRT Thailand Cultural Centre","MRT Huai Khwang","MRT Sutthisan"],
  "10|1033":["BTS Asok","BTS Phrom Phong","BTS Thong Lo","BTS Ekkamai","MRT Sukhumvit","MRT Queen Sirikit National Convention Centre","MRT Khlong Toei"],
  "10|1007":["BTS Siam","BTS Chit Lom","BTS Ploen Chit","BTS National Stadium","MRT Sam Yan","MRT Lumphini"],
  "10|1037":["BTS Ratchathewi","BTS Phaya Thai","BTS Victory Monument","MRT Phetchaburi","ARL Makkasan","ARL Ratchaprarop"],
  "10|1050":["BTS Bang Na","BTS Bearing","BTS Udom Suk"],
  "10|1009":["BTS Bang Chak","BTS Punnawithi","BTS On Nut"],
  "10|1028":["BTS Saint Louis","BTS Surasak","BTS Chong Nonsi","MRT Lumphini"],
  "10|1004":["BTS Sala Daeng","BTS Chong Nonsi","BTS Surasak","BTS Saphan Taksin","MRT Si Lom","MRT Sam Yan"]
};

type ContactMatch = { kind: string; example: string };

function findContactDetail(value: string): ContactMatch | null {
  const text = value.normalize("NFKC");
  const rules: Array<{ kind: string; regex: RegExp }> = [
    { kind: "email address", regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
    { kind: "website or contact link", regex: /(?:https?:\/\/|www\.|line\.me\/|lin\.ee\/|wa\.me\/|t\.me\/|m\.me\/|facebook\.com\/|instagram\.com\/|ig\.me\/)[^\s]+/i },
    { kind: "phone number", regex: /(?:\+?66[\s().-]*|0)[1-9](?:[\s().-]*\d){7,9}\b/ },
    { kind: "LINE / messaging ID", regex: /(?:line\s*(?:id)?|ไลน์|แอดไลน์|ไอดีไลน์|whats?app|telegram|wechat|kakao)\s*[:：@]?\s*[A-Z0-9._-]{3,}/i },
    { kind: "social-media handle", regex: /(?:instagram|facebook|fb|ig|tiktok)\s*[:：@]\s*[A-Z0-9._-]{3,}/i },
    { kind: "contact instruction", regex: /(?:โทร(?:หา|ติดต่อ)?|ติดต่อ(?:โดยตรง)?|เบอร์(?:โทร)?|call\s+me|contact\s+me|dm\s+me)\s*[:：]?\s*(?:\+?\d|@)/i },
  ];
  for (const rule of rules) {
    const match = text.match(rule.regex);
    if (match) return { kind: rule.kind, example: match[0].slice(0, 80) };
  }
  return null;
}


export default function AddPropertyPage() {
  const supabase = createClient();
  const router = useRouter();

  const [form, setForm] = useState<PropertyForm>({
    title: "",
    title_en: "",
    description: "",
    description_en: "",
    property_type: "condo",
    listing_type: "rent",
    price: "",
    rent_price: "",
    sale_price: "",
    bedrooms: "",
    bathrooms: "",
    area_sqm: "",
    location: "",
    project_name: "",
    province: "",
    district: "",
    subdistrict: "",
    postal_code: "",
    floor_number: "",
    parking_spaces: "",
    furnishing: "fully_furnished",
    property_condition: "good",
    nearby_transit: "",
    has_nearby_transit: false,
    transit_distance_m: "",
    minimum_lease_months: "",
    available_from: "",
    pet_friendly: false,
    amenities: [],
  });

  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);
  const [error, setError] = useState("");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [draggingPhotoId, setDraggingPhotoId] = useState<string | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [listingLanguage, setListingLanguage] = useState<"th" | "en">("th");
  const [previewLanguage, setPreviewLanguage] = useState<"th" | "en">("th");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    return () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, [photos]);

  function addPhotoFiles(files: File[]) {
    setError("");

    const remainingSlots = MAX_PHOTOS - photos.length;

    if (remainingSlots <= 0) {
      setError(`You can upload a maximum of ${MAX_PHOTOS} photos.`);
      return;
    }

    if (files.length > remainingSlots) {
      setError(
        `You can add only ${remainingSlots} more photo${remainingSlots === 1 ? "" : "s"}. The limit is ${MAX_PHOTOS}.`
      );
      return;
    }

    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setError(`${file.name} is not supported. Please use JPG, PNG or WEBP.`);
        return;
      }

      if (file.size > MAX_PHOTO_BYTES) {
        setError(`${file.name} is larger than 10 MB.`);
        return;
      }
    }

    const nextPhotos = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPhotos((current) => [...current, ...nextPhotos]);
  }

  function handlePhotoInput(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length) addPhotoFiles(files);
    event.target.value = "";
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((photo) => photo.id !== id);
    });
  }

  function makeCover(id: string) {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === id);
      if (!target) return current;
      return [target, ...current.filter((photo) => photo.id !== id)];
    });
  }

  function movePhoto(fromId: string, toId: string) {
    if (fromId === toId) return;

    setPhotos((current) => {
      const fromIndex = current.findIndex((photo) => photo.id === fromId);
      const toIndex = current.findIndex((photo) => photo.id === toId);
      if (fromIndex < 0 || toIndex < 0) return current;

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function handleDropFiles(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingFiles(false);
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length) addPhotoFiles(files);
  }

  async function checkUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Every authenticated user can create a listing.
    // Profile roles are descriptive tags, not listing permissions.
    setCheckingUser(false);
  }

  function updateField(
    field: keyof PropertyForm,
    value: string | boolean
  ) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "property_type" && value === "land") next.floor_number = "";
      return next;
    });
  }

  function toggleAmenity(value: string) {
    setForm((current) => ({
      ...current,
      amenities: current.amenities.includes(value)
        ? current.amenities.filter((item) => item !== value)
        : [...current.amenities, value],
    }));
  }

  function toggleBooleanField(field: "pet_friendly") {
    setForm((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }


  const selectedProvince = THAILAND_LOCATIONS.find((x) => x.value === form.province);
  const districtOptions = selectedProvince?.districts || [];
  const selectedDistrict = districtOptions.find((x) => x.value === form.district);
  const subdistrictOptions = selectedDistrict?.subdistricts || [];
  const transitOptions = form.province && form.district ? TRANSIT_BY_AREA[`${form.province}|${form.district}`] || [] : [];

  function chooseProvince(value:string){ setForm(c=>({...c,province:value,district:"",subdistrict:"",postal_code:"",location:"",has_nearby_transit:false,nearby_transit:"",transit_distance_m:""})); }
  function chooseDistrict(value:string){ setForm(c=>({...c,district:value,subdistrict:"",postal_code:"",location:"",has_nearby_transit:false,nearby_transit:"",transit_distance_m:""})); }
  function chooseSubdistrict(value:string){
    const district = districtOptions.find(x=>x.value===form.district);
    const subdistrict = district?.subdistricts.find(x=>x.value===value);
    const location = [subdistrict?.nameTh, district?.nameTh, selectedProvince?.nameTh].filter(Boolean).join(", ");
    setForm(c=>({...c,subdistrict:value,postal_code:subdistrict?.postalCode||"",location}));
  }
  function setTransitAvailability(value:boolean){ setForm(c=>({...c,has_nearby_transit:value,nearby_transit:value?c.nearby_transit:"",transit_distance_m:value?c.transit_distance_m:""})); }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Please enter a property title.");
      return;
    }

    const needsRentPrice = form.listing_type === "rent" || form.listing_type === "both";
    const needsSalePrice = form.listing_type === "sale" || form.listing_type === "both";
    if (needsRentPrice && (!form.rent_price || Number(form.rent_price) <= 0)) {
      setError("Please enter a valid monthly rental price.");
      return;
    }
    if (needsSalePrice && (!form.sale_price || Number(form.sale_price) <= 0)) {
      setError("Please enter a valid sale price.");
      return;
    }

    if (!form.province || !form.district || !form.subdistrict) {
      setError("Please select Province, District and Subdistrict in order.");
      document.getElementById("location-details")?.scrollIntoView({behavior:"smooth",block:"center"});
      return;
    }
    if (form.has_nearby_transit && !form.nearby_transit) {
      setError("Please select the nearest BTS / MRT station.");
      return;
    }

    const contactFields = [
      ["Property title", form.title],
      ["English title", form.title_en],
      ["Description", form.description],
      ["English description", form.description_en],
      ["Project / building name", form.project_name],
    ] as const;
    for (const [label, value] of contactFields) {
      const blocked = findContactDetail(value || "");
      if (blocked) {
        setError(`${label} contains a ${blocked.kind}. Direct contact details are not allowed on BaanNest. Please remove "${blocked.example}".`);
        return;
      }
    }

    if (photos.length < MIN_PHOTOS) {
      setError(`Please add at least ${MIN_PHOTOS} property photos before submitting for review.`);
      document.getElementById("property-photos")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }

    setLoading(true);

    const uploadedPaths: string[] = [];
    let createdPropertyId: string | null = null;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Create the property first so every image can live under its property ID.
      const { data: property, error: insertError } = await supabase
        .from("properties")
        .insert({
          title: form.title.trim(),
          title_en: form.title_en.trim() || null,
          description: form.description.trim(),
          description_en: form.description_en.trim() || null,
          property_type: form.property_type,
          listing_type: form.listing_type,
          // Keep legacy `price` populated while the app transitions to separate rent/sale prices.
          price: form.listing_type === "sale" ? Number(form.sale_price) : Number(form.rent_price),
          rent_price: form.listing_type === "sale" ? null : Number(form.rent_price),
          sale_price: form.listing_type === "rent" ? null : Number(form.sale_price),
          bedrooms: form.bedrooms === "" ? null : Number(form.bedrooms),
          bathrooms: form.bathrooms === "" ? null : Number(form.bathrooms),
          area_sqm: form.area_sqm === "" ? null : Number(form.area_sqm),
          location: form.location.trim(),
          project_name: form.project_name.trim() || null,
          province: form.province.trim() || null,
          district: form.district.trim() || null,
          subdistrict: form.subdistrict.trim() || null,
          postal_code: form.postal_code || null,
          floor_number: form.property_type === "land" || form.floor_number === "" ? null : Number(form.floor_number),
          parking_spaces: form.parking_spaces === "" ? null : Number(form.parking_spaces),
          furnishing: form.furnishing || null,
          property_condition: form.property_condition || null,
          nearby_transit: form.nearby_transit.trim() || null,
          transit_distance_m: form.transit_distance_m === "" ? null : Number(form.transit_distance_m),
          minimum_lease_months:
            (form.listing_type === "rent" || form.listing_type === "both") && form.minimum_lease_months !== ""
              ? Number(form.minimum_lease_months)
              : null,
          available_from: form.available_from || null,
          pet_friendly: form.pet_friendly,
          amenities: form.amenities,
          status: "pending",
          source: "owner",
          owner_id: user.id,
        })
        .select("id")
        .single();

      if (insertError || !property) {
        throw new Error(insertError?.message || "Could not create the property.");
      }

      createdPropertyId = property.id;

      // Upload in the same order shown in the form.
      for (let index = 0; index < photos.length; index++) {
        const photo = photos[index];
        const extension =
          photo.file.name.split(".").pop()?.toLowerCase() ||
          (photo.file.type === "image/png" ? "png" : photo.file.type === "image/webp" ? "webp" : "jpg");

        // User ID first makes secure Storage policies simple and prevents users
        // from writing into another account's folder.
        const storagePath = `${user.id}/${property.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("property-images")
          .upload(storagePath, photo.file, {
            cacheControl: "3600",
            upsert: false,
            contentType: photo.file.type,
          });

        if (uploadError) {
          throw new Error(`Photo ${index + 1} failed to upload: ${uploadError.message}`);
        }

        uploadedPaths.push(storagePath);

        const { data: publicUrlData } = supabase.storage
          .from("property-images")
          .getPublicUrl(storagePath);

        const { error: photoInsertError } = await supabase
          .from("property_photos")
          .insert({
            property_id: property.id,
            image_url: publicUrlData.publicUrl,
            sort_order: index,
          });

        if (photoInsertError) {
          throw new Error(`Photo ${index + 1} could not be saved: ${photoInsertError.message}`);
        }
      }

      router.push("/my-properties?submitted=1");
      router.refresh();
    } catch (submitError) {
      console.error("ADD PROPERTY ERROR:", submitError);

      // Best-effort cleanup if an upload fails halfway through.
      if (uploadedPaths.length > 0) {
        await supabase.storage.from("property-images").remove(uploadedPaths);
      }

      if (createdPropertyId) {
        await supabase
          .from("property_photos")
          .delete()
          .eq("property_id", createdPropertyId);

        await supabase
          .from("properties")
          .delete()
          .eq("id", createdPropertyId);
      }

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong while publishing your property."
      );
      setLoading(false);
    }
  }

  if (checkingUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F2EEE3] text-[#5C6B62]">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#C9BEA7] border-t-[#1F2E28]" />
          Checking your account...
        </div>
      </main>
    );
  }

  const propertyTypes = [
    ["condo", "Condo", "Apartment-style living"],
    ["house", "House", "Private home"],
    ["townhouse", "Townhouse", "Multi-level home"],
    ["land", "Land", "Plot or development land"],
    ["commercial", "Commercial", "Business property"],
  ];

  const amenityOptions = [
    "Swimming pool",
    "Fitness / Gym",
    "24-hour security",
    "CCTV",
    "Parking",
    "Garden",
    "Co-working space",
    "Playground",
    "Sauna",
    "EV charging",
    "Shuttle service",
    "Keycard / Face scan",
  ];

  const furnishingOptions = [
    ["fully_furnished", "Fully furnished", "Ready to move in"],
    ["partly_furnished", "Partly furnished", "Some furniture included"],
    ["unfurnished", "Unfurnished", "Bring your own furniture"],
  ];

  const inputClass =
    "w-full rounded-2xl border border-[#D8D0BE] bg-[#FBFAF6] px-4 py-3.5 text-[#1F2E28] outline-none transition duration-200 placeholder:text-[#9A9F9A] focus:border-[#B8863F] focus:bg-white focus:ring-4 focus:ring-[#B8863F]/10";

  return (
    <main className="min-h-screen bg-[#F2EEE3] text-[#1F2E28]">
      <section className="border-b border-[#DCD4C2] bg-[#F8F5ED]">
        <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#B8863F]">
                BaanNest · New Listing
              </p>
              <h1 className="mt-3 font-display text-5xl tracking-tight md:text-6xl">
                List your property.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#627068]">
                Give people the important details first. After submission, BaanNest reviews the listing before it appears publicly.
              </p>
            </div>
            <a
              href="/my-properties"
              className="inline-flex w-fit items-center rounded-xl border border-[#D8D0BE] bg-white px-4 py-2.5 text-sm font-semibold text-[#526158] transition hover:-translate-y-0.5 hover:border-[#B9AA8B]"
            >
              ← Back to my listings
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-7 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 01 BASICS */}
          <section className="rounded-[1.75rem] border border-[#DCD4C2] bg-white p-6 shadow-[0_10px_35px_rgba(31,46,40,0.05)] md:p-8">
            <div className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1F2E28] text-xs font-bold text-white">01</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-3xl">Basic information</h2>
                <p className="mt-1 text-sm text-[#6A756E]">Write the main listing in Thai, with an optional English version.</p>
              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-[#E1D9C9] bg-[#FAF8F2] p-2">
              <div className="mb-2 px-2 pt-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A602C]">Listing language</p>
                <p className="mt-1 text-xs text-[#78817B]">Switch languages without losing what you have written.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setListingLanguage("th")}
                  className={`rounded-xl px-4 py-3 text-sm font-bold transition ${listingLanguage === "th" ? "bg-[#1F2E28] text-white shadow-md" : "bg-white text-[#56645C] hover:bg-[#F4F0E7]"}`}>
                  ภาษาไทย {form.title.trim() || form.description.trim() ? "✓" : ""}
                </button>
                <button type="button" onClick={() => setListingLanguage("en")}
                  className={`rounded-xl px-4 py-3 text-sm font-bold transition ${listingLanguage === "en" ? "bg-[#1F2E28] text-white shadow-md" : "bg-white text-[#56645C] hover:bg-[#F4F0E7]"}`}>
                  EN English {form.title_en.trim() || form.description_en.trim() ? "✓" : ""}
                </button>
              </div>
            </div>

            <div className="mt-7">
              {listingLanguage === "th" ? (
                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">หัวข้อประกาศ <span className="text-[#B8863F]">*</span></label>
                    <input type="text" required value={form.title} onChange={(e) => updateField("title", e.target.value)}
                      placeholder="เช่น ให้เช่าคอนโด 2 ห้องนอน ใกล้ BTS ทองหล่อ" className={inputClass} />
                    <p className="mt-2 text-xs text-[#7B847E]">ภาษาไทยเป็นข้อมูลหลักของประกาศและจำเป็นต้องกรอก</p>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="text-sm font-semibold">รายละเอียด</label>
                      <span className="text-xs text-[#8A918C]">{form.description.length} characters</span>
                    </div>
                    <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)}
                      placeholder="รายละเอียดทรัพย์ เฟอร์นิเจอร์ การเดินทาง วิว สิ่งอำนวยความสะดวก และข้อมูลสำคัญอื่น ๆ"
                      rows={7} className={`${inputClass} resize-none leading-6`} />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-xl border border-[#E5DDCE] bg-[#FFFDF8] p-4">
                    <p className="text-sm font-bold text-[#1F2E28]">English version is optional</p>
                    <p className="mt-1 text-xs leading-5 text-[#78817B]">Add it if you want international buyers or tenants to understand the listing. No translation service or fee is used.</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold">English title <span className="font-normal text-[#8A918C]">(optional)</span></label>
                    <input type="text" value={form.title_en} onChange={(e) => updateField("title_en", e.target.value)}
                      placeholder="e.g. Modern 2-bedroom condo near BTS Thong Lo" className={inputClass} />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="text-sm font-semibold">English description <span className="font-normal text-[#8A918C]">(optional)</span></label>
                      <span className="text-xs text-[#8A918C]">{form.description_en.length} characters</span>
                    </div>
                    <textarea value={form.description_en} onChange={(e) => updateField("description_en", e.target.value)}
                      placeholder="Write the English version of the property description..."
                      rows={7} className={`${inputClass} resize-none leading-6`} />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 02 TYPE */}
          <section className="rounded-[1.75rem] border border-[#DCD4C2] bg-white p-6 shadow-[0_10px_35px_rgba(31,46,40,0.05)] md:p-8">
            <div className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1F2E28] text-xs font-bold text-white">02</span>
              <div>
                <h2 className="font-display text-3xl">Property & listing type</h2>
                <p className="mt-1 text-sm text-[#6A756E]">Choose what you are listing and whether it is for rent or sale.</p>
              </div>
            </div>

            <div className="mt-8">
              <label className="mb-3 block text-sm font-semibold">Property type <span className="text-[#B8863F]">*</span></label>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {propertyTypes.map(([value, label, note]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateField("property_type", value)}
                    className={`min-h-28 rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 ${
                      form.property_type === value
                        ? "border-[#B8863F] bg-[#F5E8D5] shadow-[0_8px_22px_rgba(184,134,63,0.10)]"
                        : "border-[#DDD6C3] bg-[#FBFAF6] hover:border-[#BFB39A] hover:bg-white"
                    }`}
                  >
                    <span className="block text-sm font-bold">{label}</span>
                    <span className="mt-1 block text-[11px] leading-4 text-[#707A73]">{note}</span>
                    <span className={`mt-3 block h-1.5 w-1.5 rounded-full ${form.property_type === value ? "bg-[#B8863F]" : "bg-[#CFC7B7]"}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7">
              <label className="mb-3 block text-sm font-semibold">I want to <span className="text-[#B8863F]">*</span></label>
              <div className="grid gap-3 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() => updateField("listing_type", "rent")}
                  className={`rounded-2xl border p-5 text-left transition duration-200 hover:-translate-y-0.5 ${
                    form.listing_type === "rent"
                      ? "border-[#1F2E28] bg-[#1F2E28] text-white shadow-lg"
                      : "border-[#DDD6C3] bg-[#FBFAF6] hover:bg-white"
                  }`}
                >
                  <span className="text-base font-bold">Rent this property</span>
                  <span className={`mt-1 block text-xs ${form.listing_type === "rent" ? "text-white/65" : "text-[#707A73]"}`}>Show a monthly rental price.</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateField("listing_type", "sale")}
                  className={`rounded-2xl border p-5 text-left transition duration-200 hover:-translate-y-0.5 ${
                    form.listing_type === "sale"
                      ? "border-[#1F2E28] bg-[#1F2E28] text-white shadow-lg"
                      : "border-[#DDD6C3] bg-[#FBFAF6] hover:bg-white"
                  }`}
                >
                  <span className="text-base font-bold">Sell this property</span>
                  <span className={`mt-1 block text-xs ${form.listing_type === "sale" ? "text-white/65" : "text-[#707A73]"}`}>Show the full asking price.</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateField("listing_type", "both")}
                  className={`rounded-2xl border p-5 text-left transition duration-200 hover:-translate-y-0.5 ${
                    form.listing_type === "both"
                      ? "border-[#1F2E28] bg-[#1F2E28] text-white shadow-lg"
                      : "border-[#DDD6C3] bg-[#FBFAF6] hover:bg-white"
                  }`}
                >
                  <span className="text-base font-bold">Rent or sell</span>
                  <span className={`mt-1 block text-xs ${form.listing_type === "both" ? "text-white/65" : "text-[#707A73]"}`}>Show both monthly rent and sale price.</span>
                </button>
              </div>
            </div>
          </section>

          {/* 03 PRICE */}
          <section className="rounded-[1.75rem] border border-[#DCD4C2] bg-white p-6 shadow-[0_10px_35px_rgba(31,46,40,0.05)] md:p-8">
            <div className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1F2E28] text-xs font-bold text-white">03</span><div><h2 className="font-display text-3xl">Pricing</h2><p className="mt-1 text-sm text-[#6A756E]">Set the price people should see for this listing.</p></div></div>
            <div className={`mt-8 grid gap-5 ${form.listing_type === "both" ? "md:grid-cols-2" : "max-w-xl"}`}>
              {(form.listing_type === "rent" || form.listing_type === "both") && <div><label className="mb-2 block text-sm font-semibold">Monthly rent <span className="text-[#B8863F]">*</span></label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#66736B]">฿</span><input type="number" min="0" required value={form.rent_price} onChange={(e)=>updateField("rent_price",e.target.value)} placeholder="25,000" className={`${inputClass} pl-9 pr-20`}/><span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#7B847E]">/ month</span></div><p className="mt-2 text-xs text-[#7B847E]">Monthly asking rent in Thai baht.</p></div>}
              {(form.listing_type === "sale" || form.listing_type === "both") && <div><label className="mb-2 block text-sm font-semibold">Sale price <span className="text-[#B8863F]">*</span></label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#66736B]">฿</span><input type="number" min="0" required value={form.sale_price} onChange={(e)=>updateField("sale_price",e.target.value)} placeholder="4,500,000" className={`${inputClass} pl-9`}/></div><p className="mt-2 text-xs text-[#7B847E]">Total asking sale price in Thai baht.</p></div>}
            </div>
          </section>

          {/* 04 DETAILS */}
          <section className="rounded-[1.75rem] border border-[#DCD4C2] bg-white p-6 shadow-[0_10px_35px_rgba(31,46,40,0.05)] md:p-8">
            <div className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1F2E28] text-xs font-bold text-white">04</span>
              <div>
                <h2 className="font-display text-3xl">Property details</h2>
                <p className="mt-1 text-sm text-[#6A756E]">A few numbers help people compare listings quickly.</p>
              </div>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {[
                ["bedrooms", "Bedrooms", "2"],
                ["bathrooms", "Bathrooms", "2"],
                ["area_sqm", "Area (m²)", "65"],
              ].map(([field, label, placeholder]) => (
                <div key={field}>
                  <label className="mb-2 block text-sm font-semibold">{label}</label>
                  <input
                    type="number"
                    min="0"
                    value={String(form[field as keyof PropertyForm] ?? "")}
                    onChange={(e) => updateField(field as keyof PropertyForm, e.target.value)}
                    placeholder={placeholder}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* 05 LOCATION DETAILS */}
          <section id="location-details" className="overflow-hidden rounded-[1.9rem] border border-[#DCD4C2] bg-white shadow-[0_14px_45px_rgba(31,46,40,0.06)]">
            <div className="border-b border-[#EEE8DB] bg-[#FCFAF5] p-6 md:p-8"><div className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1F2E28] text-xs font-bold text-white">05</span><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-3xl">Location & connectivity</h2><span className="rounded-full bg-[#F5E8D5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A602C]">Guided</span></div><p className="mt-1 text-sm text-[#6A756E]">Province first, then district, then subdistrict. Only valid choices unlock.</p></div></div></div>
            <div className="p-6 md:p-8">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                <div><label className="mb-2 block text-sm font-semibold">Province / จังหวัด <span className="text-[#B8863F]">*</span></label><select required value={form.province} onChange={e=>chooseProvince(e.target.value)} className={inputClass}><option value="">Select province first</option>{THAILAND_LOCATIONS.map(x=><option key={x.value} value={x.value}>{x.nameTh} · {x.nameEn}</option>)}</select><p className="mt-2 text-xs text-[#7B847E]">Start here to unlock districts.</p></div>
                <div><label className="mb-2 block text-sm font-semibold">District / เขต·อำเภอ <span className="text-[#B8863F]">*</span></label><select required disabled={!form.province} value={form.district} onChange={e=>chooseDistrict(e.target.value)} className={`${inputClass} disabled:cursor-not-allowed disabled:bg-[#EEEAE1] disabled:text-[#A3A49F]`}><option value="">{form.province?"Select district":"Choose province first"}</option>{districtOptions.map(x=><option key={x.value} value={x.value}>{x.nameTh} · {x.nameEn}</option>)}</select><p className="mt-2 text-xs text-[#7B847E]">{form.province?"Only districts in this province are shown.":"Locked until province is selected."}</p></div>
                <div><label className="mb-2 block text-sm font-semibold">Subdistrict / แขวง·ตำบล <span className="text-[#B8863F]">*</span></label><select required disabled={!form.district} value={form.subdistrict} onChange={e=>chooseSubdistrict(e.target.value)} className={`${inputClass} disabled:cursor-not-allowed disabled:bg-[#EEEAE1] disabled:text-[#A3A49F]`}><option value="">{form.district?"Select subdistrict":"Choose district first"}</option>{subdistrictOptions.map(x=><option key={x.value} value={x.value}>{x.nameTh} · {x.nameEn}</option>)}</select><p className="mt-2 text-xs text-[#7B847E]">{form.district?"Only subdistricts inside this district are shown.":"Locked until district is selected."}</p></div>
                <div><label className="mb-2 block text-sm font-semibold">Postal code / รหัสไปรษณีย์</label><div className={`flex min-h-[52px] items-center rounded-2xl border px-4 py-3.5 font-semibold ${form.postal_code?"border-[#C9B68D] bg-[#FFF9EF] text-[#1F2E28]":"border-[#D8D0BE] bg-[#F1EEE7] text-[#9A9F9A]"}`}>{form.postal_code || "Auto-filled from subdistrict"}</div><p className="mt-2 text-xs text-[#7B847E]">Filled automatically from the selected Thai administrative area.</p></div>
              </div>
              {form.subdistrict&&<div className="mt-5 flex gap-3 rounded-2xl border border-[#C7D7CA] bg-[#F2F7F3] p-4"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#315A42] text-xs font-bold text-white">✓</span><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#557060]">Location confirmed</p><p className="mt-1 text-sm font-semibold">{form.location}</p></div></div>}
              <div className={`mt-7 grid gap-5 ${form.property_type === "land" ? "" : "md:grid-cols-2"}`}><div><label className="mb-2 block text-sm font-semibold">Project / building name</label><input type="text" value={form.project_name} onChange={e=>updateField("project_name",e.target.value)} placeholder="e.g. The Esse at Singha Complex" className={inputClass}/></div>{form.property_type !== "land" && <div><label className="mb-2 block text-sm font-semibold">{form.property_type === "house" || form.property_type === "townhouse" ? "Number of storeys" : "Unit floor"}</label><input type="number" min={form.property_type === "house" || form.property_type === "townhouse" ? "1" : "0"} value={form.floor_number} onChange={e=>updateField("floor_number",e.target.value)} placeholder={form.property_type === "house" || form.property_type === "townhouse" ? "e.g. 2" : "e.g. 18"} className={inputClass}/></div>}</div>
              <div className={`mt-8 rounded-[1.6rem] border p-5 md:p-6 ${form.subdistrict?"border-[#D7CEBC] bg-[#FBF8F1]":"border-[#E4DFD4] bg-[#F5F2EB]"}`}>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A16F32]">Public transport</p><h3 className="mt-1 text-lg font-bold">BTS / MRT nearby?</h3><p className="mt-1 text-xs text-[#707A73]">{form.subdistrict?"Suggested from the selected district.":"Complete the location first."}</p></div><div className="flex gap-2"><button type="button" disabled={!form.subdistrict} onClick={()=>setTransitAvailability(true)} className={`rounded-xl border px-4 py-2.5 text-xs font-bold disabled:opacity-40 ${form.has_nearby_transit?"border-[#1F2E28] bg-[#1F2E28] text-white":"border-[#D3C9B7] bg-white text-[#56645C]"}`}>Yes, near transit</button><button type="button" disabled={!form.subdistrict} onClick={()=>setTransitAvailability(false)} className={`rounded-xl border px-4 py-2.5 text-xs font-bold disabled:opacity-40 ${form.subdistrict&&!form.has_nearby_transit?"border-[#B8863F] bg-[#FFF4E3] text-[#8A602C]":"border-[#D3C9B7] bg-white text-[#56645C]"}`}>No / not sure</button></div></div>
                {form.subdistrict&&form.has_nearby_transit&&<div className="mt-6 border-t border-[#E4DCCB] pt-6">{transitOptions.length?<><label className="mb-3 block text-sm font-semibold">Nearest station <span className="text-[#B8863F]">*</span></label><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{transitOptions.map(station=>{const network=station.split(" ")[0];const selected=form.nearby_transit===station;return <button key={station} type="button" onClick={()=>updateField("nearby_transit",station)} className={`rounded-2xl border p-3.5 text-left transition hover:-translate-y-0.5 ${selected?"border-[#B8863F] bg-[#FFF4E3] shadow-sm":"border-[#DDD6C7] bg-white"}`}><span className="flex items-center gap-2"><span className={`rounded-md px-2 py-1 text-[9px] font-black ${network==="BTS"?"bg-[#E8F2EB] text-[#315A42]":network==="MRT"?"bg-[#EDE9F6] text-[#5D4C7B]":"bg-[#F5E8D5] text-[#8A602C]"}`}>{network}</span>{selected&&<span className="ml-auto text-xs font-bold text-[#A16F32]">✓</span>}</span><span className="mt-2 block text-xs font-bold">{station.replace(`${network} `,"")}</span></button>})}</div><div className="mt-5 max-w-sm"><label className="mb-2 block text-sm font-semibold">Distance to station</label><div className="relative"><input type="number" min="0" value={form.transit_distance_m} onChange={e=>updateField("transit_distance_m",e.target.value)} placeholder="e.g. 350" className={`${inputClass} pr-20`}/><span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#778078]">metres</span></div>{form.transit_distance_m&&Number(form.transit_distance_m)>0&&<p className="mt-2 text-xs font-semibold text-[#66736B]">About {Math.max(1,Math.round(Number(form.transit_distance_m)/80))} min walk · estimate</p>}</div></>:<div className="rounded-2xl border border-dashed border-[#D3C9B7] bg-white p-5 text-sm text-[#66736B]">No mapped rail stations for this area yet. Choose “No / not sure” for now.</div>}</div>}
              </div>
            </div>
          </section>

          {/* 06 HOME DETAILS */}
          <section className="rounded-[1.75rem] border border-[#DCD4C2] bg-white p-6 shadow-[0_10px_35px_rgba(31,46,40,0.05)] md:p-8">
            <div className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1F2E28] text-xs font-bold text-white">06</span>
              <div>
                <h2 className="font-display text-3xl">Living details</h2>
                <p className="mt-1 text-sm text-[#6A756E]">Tell people what moving into this property would actually be like.</p>
              </div>
            </div>

            <div className="mt-8">
              <label className="mb-3 block text-sm font-semibold">Furnishing</label>
              <div className="grid gap-3 md:grid-cols-3">
                {furnishingOptions.map(([value, label, note]) => (
                  <button key={value} type="button" onClick={() => updateField("furnishing", value)}
                    className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${form.furnishing === value ? "border-[#B8863F] bg-[#F8ECDD]" : "border-[#DDD6C3] bg-[#FBFAF6] hover:bg-white"}`}>
                    <span className="block text-sm font-bold">{label}</span>
                    <span className="mt-1 block text-xs text-[#707A73]">{note}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold">Property condition</label>
                <select value={form.property_condition} onChange={(e) => updateField("property_condition", e.target.value)} className={inputClass}>
                  <option value="new">Brand new</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="needs_renovation">Needs renovation</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Parking spaces</label>
                <input type="number" min="0" value={form.parking_spaces} onChange={(e) => updateField("parking_spaces", e.target.value)} placeholder="e.g. 1" className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Available from</label>
                <input type="date" value={form.available_from} onChange={(e) => updateField("available_from", e.target.value)} className={inputClass} />
              </div>
              {(form.listing_type === "rent" || form.listing_type === "both") && (
                <div>
                  <label className="mb-2 block text-sm font-semibold">Minimum lease (months)</label>
                  <input type="number" min="1" value={form.minimum_lease_months} onChange={(e) => updateField("minimum_lease_months", e.target.value)} placeholder="e.g. 12" className={inputClass} />
                </div>
              )}
            </div>

            <button type="button" onClick={() => toggleBooleanField("pet_friendly")}
              className={`mt-6 flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${form.pet_friendly ? "border-[#B8863F] bg-[#F8ECDD]" : "border-[#DDD6C3] bg-[#FBFAF6]"}`}>
              <span><span className="block text-sm font-bold">Pet friendly</span><span className="mt-1 block text-xs text-[#707A73]">Pets are allowed under the property's rules.</span></span>
              <span className={`flex h-6 w-11 items-center rounded-full p-1 transition ${form.pet_friendly ? "bg-[#1F2E28]" : "bg-[#D9D4C8]"}`}><span className={`h-4 w-4 rounded-full bg-white transition ${form.pet_friendly ? "translate-x-5" : ""}`} /></span>
            </button>
          </section>

          {/* 07 AMENITIES */}
          <section className="rounded-[1.75rem] border border-[#DCD4C2] bg-white p-6 shadow-[0_10px_35px_rgba(31,46,40,0.05)] md:p-8">
            <div className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1F2E28] text-xs font-bold text-white">07</span>
              <div>
                <h2 className="font-display text-3xl">Amenities</h2>
                <p className="mt-1 text-sm text-[#6A756E]">Select everything that is genuinely available to residents.</p>
              </div>
            </div>
            <div className="mt-7 flex flex-wrap gap-2.5">
              {amenityOptions.map((amenity) => {
                const active = form.amenities.includes(amenity);
                return (
                  <button key={amenity} type="button" onClick={() => toggleAmenity(amenity)}
                    className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 ${active ? "border-[#1F2E28] bg-[#1F2E28] text-white" : "border-[#D8D0BE] bg-[#FBFAF6] text-[#56645C] hover:border-[#B8863F]"}`}>
                    {active ? "✓ " : "+ "}{amenity}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 08 PHOTOS */}
          <section
            id="property-photos"
            className="overflow-hidden rounded-[1.9rem] border border-[#DCD4C2] bg-white shadow-[0_14px_45px_rgba(31,46,40,0.06)]"
          >
            <div className="flex flex-col justify-between gap-4 border-b border-[#EEE8DB] px-6 py-6 md:flex-row md:items-center md:px-8">
              <div className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1F2E28] text-xs font-bold text-white">
                  08
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display text-3xl">Property photos</h2>
                    {photos.length >= MIN_PHOTOS && (
                      <span className="rounded-full bg-[#E8F2EB] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#356246]">
                        Ready
                      </span>
                    )}
                  </div>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6A756E]">
                    Strong photography makes a listing feel trustworthy. Put your best
                    image first — it becomes the cover across BaanNest.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-semibold text-[#68736C]">
                  {photos.length} of {MAX_PHOTOS}
                </span>
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#E9E4D8]">
                  <div
                    className="h-full rounded-full bg-[#B8863F] transition-all duration-300"
                    style={{ width: `${Math.min(100, (photos.length / MAX_PHOTOS) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handlePhotoInput}
              className="hidden"
            />

            <div className="p-6 md:p-8">
              {photos.length === 0 ? (
                <div
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDraggingFiles(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDraggingFiles(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    if (event.currentTarget === event.target) setIsDraggingFiles(false);
                  }}
                  onDrop={handleDropFiles}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group cursor-pointer rounded-[1.6rem] border border-dashed px-6 py-14 text-center transition-all duration-300 ${
                    isDraggingFiles
                      ? "scale-[0.995] border-[#B8863F] bg-[#FBF2E4] shadow-[inset_0_0_0_1px_rgba(184,134,63,0.12)]"
                      : "border-[#CFC6B4] bg-[#FBFAF6] hover:border-[#B8863F] hover:bg-[#FCF8F0]"
                  }`}
                >
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#DDD4C1] bg-white text-2xl font-light text-[#1F2E28] shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:shadow-md">
                    +
                  </div>
                  <h3 className="mt-5 text-base font-bold text-[#1F2E28]">
                    Drop your property photos here
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#707A73]">
                    Or click anywhere in this area to choose images from your device.
                  </p>
                  <p className="mt-5 text-[11px] font-medium tracking-wide text-[#8A918C]">
                    JPG · PNG · WEBP &nbsp;·&nbsp; 10 MB each &nbsp;·&nbsp; 3–15 photos
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm font-bold text-[#1F2E28]">
                        Arrange your gallery
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#78817B]">
                        Drag a photo onto another position to reorder. Position 1 is always the cover.
                      </p>
                    </div>
                    {photos.length < MIN_PHOTOS ? (
                      <span className="w-fit rounded-full bg-[#FFF0ED] px-3 py-1.5 text-xs font-bold text-[#A14B3F]">
                        Add {MIN_PHOTOS - photos.length} more to submit
                      </span>
                    ) : (
                      <span className="w-fit rounded-full bg-[#EEF4EF] px-3 py-1.5 text-xs font-semibold text-[#466B52]">
                        Gallery ready
                      </span>
                    )}
                  </div>

                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      // Files dropped into the gallery are added just like the main drop zone.
                      if (event.dataTransfer.files?.length) {
                        event.preventDefault();
                        addPhotoFiles(Array.from(event.dataTransfer.files));
                      }
                    }}
                    className="grid grid-cols-2 gap-3 md:grid-cols-3"
                  >
                    {photos.map((photo, index) => (
                      <div
                        key={photo.id}
                        draggable
                        onDragStart={(event) => {
                          setDraggingPhotoId(photo.id);
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => setDraggingPhotoId(null)}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          event.dataTransfer.dropEffect = "move";
                        }}
                        onDragEnter={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (draggingPhotoId && draggingPhotoId !== photo.id) {
                            movePhoto(draggingPhotoId, photo.id);
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setDraggingPhotoId(null);
                        }}
                        className={`group relative overflow-hidden rounded-[1.35rem] border bg-[#E9E4D8] transition-all duration-200 ${
                          index === 0
                            ? "aspect-[4/3] border-[#B8863F]/50"
                            : "aspect-[4/3] border-[#DDD5C4]"
                        } ${
                          draggingPhotoId === photo.id
                            ? "scale-[0.985] opacity-45 shadow-none"
                            : "hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(31,46,40,0.13)]"
                        }`}
                      >
                        <img
                          src={photo.previewUrl}
                          alt={`Property photo ${index + 1}`}
                          draggable={false}
                          className="pointer-events-none h-full w-full select-none object-cover transition duration-500 group-hover:scale-[1.015]"
                        />

                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-black/10 opacity-80" />

                        <div className="absolute left-3 top-3 flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] shadow-sm backdrop-blur-md ${
                            index === 0
                              ? "bg-[#B8863F] text-white"
                              : "bg-black/40 text-white"
                          }`}>
                            {index === 0 ? "Cover" : String(index + 1).padStart(2, "0")}
                          </span>
                        </div>

                        <div className="absolute right-3 top-3 flex translate-y-[-4px] gap-1.5 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                          {index !== 0 && (
                            <button
                              type="button"
                              onClick={() => makeCover(photo.id)}
                              className="rounded-full bg-white/92 px-3 py-2 text-[10px] font-bold text-[#1F2E28] shadow-lg backdrop-blur transition hover:bg-white"
                            >
                              Make cover
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-sm font-bold text-white shadow-lg backdrop-blur transition hover:bg-[#A23D35]"
                            aria-label={`Remove photo ${index + 1}`}
                          >
                            ×
                          </button>
                        </div>

                        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-white/90">
                              {index === 0 ? "Main listing image" : photo.file.name}
                            </p>
                            {index === 0 && (
                              <p className="mt-1 text-[10px] text-white/60">
                                This is what people see first
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 rounded-lg border border-white/15 bg-black/20 px-2 py-1 text-[10px] text-white/65 backdrop-blur">
                            Drag
                          </span>
                        </div>
                      </div>
                    ))}

                    {photos.length < MAX_PHOTOS && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (event.dataTransfer.files?.length) {
                            addPhotoFiles(Array.from(event.dataTransfer.files));
                          }
                        }}
                        className="group flex aspect-[4/3] min-h-[130px] flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-[#CFC6B4] bg-[#FBFAF6] p-4 text-center transition duration-300 hover:-translate-y-0.5 hover:border-[#B8863F] hover:bg-[#FCF8F0]"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DED6C6] bg-white text-xl font-light text-[#1F2E28] shadow-sm transition group-hover:scale-105">
                          +
                        </span>
                        <span className="mt-3 text-xs font-bold text-[#1F2E28]">Add photos</span>
                        <span className="mt-1 text-[10px] text-[#8A918C]">
                          {MAX_PHOTOS - photos.length} remaining
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="mt-5 flex flex-col justify-between gap-2 border-t border-[#EEE8DB] pt-4 text-[11px] text-[#7B847E] sm:flex-row sm:items-center">
                    <p>Tip: lead with a bright, wide photo of the main living space.</p>
                    <p>JPG, PNG or WEBP · 10 MB max each</p>
                  </div>
                </>
              )}
            </div>
          </section>

          {error && (
            <div className="rounded-2xl border border-[#E7A69D] bg-[#FFF1EF] p-4 text-sm font-semibold text-[#9B2C22]">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 rounded-[1.5rem] border border-[#DCD4C2] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="px-2 text-xs leading-5 text-[#78817B]">
              Required fields are marked with <span className="text-[#B8863F]">*</span>
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href="/my-properties"
                className="rounded-xl border border-[#D8D0BE] px-5 py-3 text-center text-sm font-semibold text-[#5C6B62] transition hover:bg-[#F2EEE3]"
              >
                Cancel
              </a>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-[#1F2E28] px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2D4038] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? `Submitting ${photos.length} photo${photos.length === 1 ? "" : "s"}...` : "Submit for review →"}
              </button>
            </div>
          </div>
        </form>

        {/* LIVE LISTING PREVIEW */}
        <aside className="lg:sticky lg:top-28">
          <div className="overflow-hidden rounded-[1.9rem] border border-[#DCD4C2] bg-white shadow-[0_18px_50px_rgba(31,46,40,0.10)]">
            <div className="relative aspect-[4/3] overflow-hidden bg-[#E8E3D8]">
              {photos[0] ? (
                <img src={photos[0].previewUrl} alt="Listing cover preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center text-[#778078]">
                  <span className="text-3xl">⌂</span>
                  <p className="mt-3 text-sm font-bold">Your cover photo appears here</p>
                  <p className="mt-1 text-xs">The first gallery photo becomes the listing cover.</p>
                </div>
              )}
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#1F2E28]/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur">
                  {form.listing_type === "rent" ? "For rent" : form.listing_type === "sale" ? "For sale" : "Rent & sale"}
                </span>
                <span className="rounded-full bg-white/92 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1F2E28] backdrop-blur">
                  {form.property_type}
                </span>
              </div>
              {photos.length > 0 && <span className="absolute bottom-4 right-4 rounded-full bg-black/55 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur">{photos.length} photo{photos.length === 1 ? "" : "s"}</span>}
            </div>

            <div className="p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A16F32]">BaanNest listing preview</p>
              <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-[#F2EEE5] p-1">
                <button type="button" onClick={() => setPreviewLanguage("th")} className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${previewLanguage === "th" ? "bg-white text-[#1F2E28] shadow-sm" : "text-[#778078]"}`}>ภาษาไทย</button>
                <button type="button" onClick={() => setPreviewLanguage("en")} className={`rounded-lg px-3 py-2 text-[11px] font-bold transition ${previewLanguage === "en" ? "bg-white text-[#1F2E28] shadow-sm" : "text-[#778078]"}`}>English</button>
              </div>
              <h3 className="mt-3 font-display text-2xl leading-tight text-[#1F2E28]">
                {previewLanguage === "en"
                  ? (form.title_en.trim() || "English version hasn't been added yet.")
                  : (form.title.trim() || "หัวข้อประกาศของคุณ")}
              </h3>
              <p className="mt-3 text-sm leading-5 text-[#68736C]">{form.location.trim() || "Select Province → District → Subdistrict"}</p>
              {form.project_name.trim() && <p className="mt-1 text-xs font-semibold text-[#8A602C]">{form.project_name.trim()}</p>}

              <div className="mt-5 rounded-2xl bg-[#F7F3EA] p-4">
                {(form.listing_type === "rent" || form.listing_type === "both") && (
                  <p className="text-2xl font-black text-[#1F2E28]">{form.rent_price ? `฿${Number(form.rent_price).toLocaleString()}` : "฿—"} <span className="text-xs font-semibold text-[#78817B]">/ month</span></p>
                )}
                {(form.listing_type === "sale" || form.listing_type === "both") && (
                  <p className={`${form.listing_type === "both" ? "mt-2 border-t border-[#E3DCCC] pt-2 text-base" : "text-2xl"} font-black text-[#1F2E28]`}>
                    {form.listing_type === "both" && <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8A602C]">Sale</span>}
                    {form.sale_price ? `฿${Number(form.sale_price).toLocaleString()}` : "฿—"}
                  </p>
                )}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-[#E7E0D3] p-3"><p className="font-bold">{form.bedrooms || "—"}</p><p className="mt-1 text-[9px] uppercase tracking-wide text-[#899089]">Beds</p></div>
                <div className="rounded-xl border border-[#E7E0D3] p-3"><p className="font-bold">{form.bathrooms || "—"}</p><p className="mt-1 text-[9px] uppercase tracking-wide text-[#899089]">Baths</p></div>
                <div className="rounded-xl border border-[#E7E0D3] p-3"><p className="font-bold">{form.area_sqm || "—"}</p><p className="mt-1 text-[9px] uppercase tracking-wide text-[#899089]">m²</p></div>
              </div>

              {(form.floor_number || form.nearby_transit || form.postal_code) && (
                <div className="mt-5 space-y-2 border-t border-[#EEE8DB] pt-4 text-xs text-[#66736B]">
                  {form.floor_number && form.property_type !== "land" && <p><span className="font-bold text-[#1F2E28]">{form.property_type === "house" || form.property_type === "townhouse" ? "Storeys:" : "Unit floor:"}</span> {form.floor_number}</p>}
                  {form.nearby_transit && <p><span className="font-bold text-[#1F2E28]">Transit:</span> {form.nearby_transit}{form.transit_distance_m ? ` · ${Number(form.transit_distance_m).toLocaleString()} m` : ""}</p>}
                  {form.postal_code && <p><span className="font-bold text-[#1F2E28]">Postal code:</span> {form.postal_code}</p>}
                </div>
              )}

              {(form.description.trim() || form.description_en.trim()) && (
                <div className="mt-5 border-t border-[#EEE8DB] pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#899089]">About this property</p>
                  {previewLanguage === "en" ? (
                    form.description_en.trim()
                      ? <p className="mt-2 line-clamp-5 whitespace-pre-line text-xs leading-5 text-[#56645C]">{form.description_en.trim()}</p>
                      : <p className="mt-2 rounded-xl bg-[#FAF8F2] p-3 text-xs leading-5 text-[#78817B]">English description hasn't been added yet.</p>
                  ) : (
                    form.description.trim() && <p className="mt-2 line-clamp-5 whitespace-pre-line text-xs leading-5 text-[#56645C]">{form.description.trim()}</p>
                  )}
                </div>
              )}

              {form.amenities.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-1.5 border-t border-[#EEE8DB] pt-4">
                  {form.amenities.slice(0,5).map((amenity)=><span key={amenity} className="rounded-full bg-[#F2EEE3] px-2.5 py-1 text-[9px] font-semibold text-[#5C6B62]">{amenity}</span>)}
                  {form.amenities.length > 5 && <span className="rounded-full bg-[#F2EEE3] px-2.5 py-1 text-[9px] font-semibold text-[#5C6B62]">+{form.amenities.length-5}</span>}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#D8C8A7] bg-[#FFF9EE] p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#B8863F] text-xs font-black text-white">✓</span>
              <div><p className="text-sm font-bold">Pending BaanNest review</p><p className="mt-1 text-xs leading-5 text-[#6A756E]">Submitting does not publish the property immediately. BaanNest will review it first, and only approved listings become public.</p></div>
            </div>
          </div>
        </aside>
      </section>

      <footer className="border-t border-[#DDD6C3] bg-[#F8F5ED]">
        <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-[#5C6B62]">
          © 2026 BaanNest · Bangkok, Thailand
        </div>
      </footer>
    </main>
  );
}

