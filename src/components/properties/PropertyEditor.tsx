"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PropertyForm = {
  title: string;
  description: string;
  property_type: string;
  listing_type: string;
  price: string;
  bedrooms: string;
  bathrooms: string;
  area_sqm: string;
  location: string;
  project_name: string;
  province: string;
  district: string;
  floor_number: string;
  parking_spaces: string;
  furnishing: string;
  property_condition: string;
  nearby_transit: string;
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

type ExistingPhoto = {
  id: string;
  image_url: string;
  sort_order: number;
};

const MIN_PHOTOS = 3;
const MAX_PHOTOS = 15;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function PropertyEditor({ mode = "create" }: { mode?: "create" | "edit" }) {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const propertyId = mode === "edit" ? params?.id : undefined;
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [removedExistingPhotos, setRemovedExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [initializingEdit, setInitializingEdit] = useState(mode === "edit");

  const [form, setForm] = useState<PropertyForm>({
    title: "",
    description: "",
    property_type: "condo",
    listing_type: "rent",
    price: "",
    bedrooms: "",
    bathrooms: "",
    area_sqm: "",
    location: "",
    project_name: "",
    province: "Bangkok",
    district: "",
    floor_number: "",
    parking_spaces: "",
    furnishing: "fully_furnished",
    property_condition: "good",
    nearby_transit: "",
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkUser();
  }, [mode, propertyId]);

  useEffect(() => {
    return () => {
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, [photos]);

  function addPhotoFiles(files: File[]) {
    setError("");

    const remainingSlots = MAX_PHOTOS - existingPhotos.length - photos.length;

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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !["owner", "agent"].includes(profile?.role || "")) {
      router.push("/");
      return;
    }

    if (mode === "edit") {
      if (!propertyId) {
        setError("Missing property ID.");
        setCheckingUser(false);
        setInitializingEdit(false);
        return;
      }

      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select("id,title,description,property_type,listing_type,price,bedrooms,bathrooms,area_sqm,location,project_name,province,district,floor_number,parking_spaces,furnishing,property_condition,nearby_transit,transit_distance_m,minimum_lease_months,available_from,pet_friendly,amenities,owner_id")
        .eq("id", propertyId)
        .eq("owner_id", user.id)
        .single();

      if (propertyError || !property) {
        setError(propertyError?.message || "Property not found or you do not have permission to edit it.");
        setCheckingUser(false);
        setInitializingEdit(false);
        return;
      }

      setForm({
        title: property.title || "",
        description: property.description || "",
        property_type: property.property_type || "condo",
        listing_type: property.listing_type || "rent",
        price: property.price == null ? "" : String(property.price),
        bedrooms: property.bedrooms == null ? "" : String(property.bedrooms),
        bathrooms: property.bathrooms == null ? "" : String(property.bathrooms),
        area_sqm: property.area_sqm == null ? "" : String(property.area_sqm),
        location: property.location || "",
        project_name: property.project_name || "",
        province: property.province || "",
        district: property.district || "",
        floor_number: property.floor_number == null ? "" : String(property.floor_number),
        parking_spaces: property.parking_spaces == null ? "" : String(property.parking_spaces),
        furnishing: property.furnishing || "fully_furnished",
        property_condition: property.property_condition || "good",
        nearby_transit: property.nearby_transit || "",
        transit_distance_m: property.transit_distance_m == null ? "" : String(property.transit_distance_m),
        minimum_lease_months: property.minimum_lease_months == null ? "" : String(property.minimum_lease_months),
        available_from: property.available_from || "",
        pet_friendly: Boolean(property.pet_friendly),
        amenities: Array.isArray(property.amenities) ? property.amenities : [],
      });

      const { data: currentPhotos, error: photoError } = await supabase
        .from("property_photos")
        .select("id,image_url,sort_order")
        .eq("property_id", propertyId)
        .order("sort_order", { ascending: true });

      if (photoError) setError(photoError.message);
      setExistingPhotos((currentPhotos || []) as ExistingPhoto[]);
      setInitializingEdit(false);
    }

    setCheckingUser(false);
  }

  function updateField(
    field: keyof PropertyForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
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

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Please enter a property title.");
      return;
    }

    if (!form.price || Number(form.price) <= 0) {
      setError("Please enter a valid price.");
      return;
    }

    if (!form.location.trim()) {
      setError("Please enter the property location.");
      return;
    }

    const totalPhotoCount = existingPhotos.length + photos.length;
    if (totalPhotoCount < MIN_PHOTOS) {
      setError(`Please keep at least ${MIN_PHOTOS} property photos before ${mode === "edit" ? "saving" : "publishing"}.`);
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

      if (mode === "edit" && propertyId) {
        const { error: updateError } = await supabase
          .from("properties")
          .update({
            title: form.title.trim(),
            description: form.description.trim(),
            property_type: form.property_type,
            listing_type: form.listing_type,
            price: Number(form.price),
            bedrooms: form.bedrooms === "" ? null : Number(form.bedrooms),
            bathrooms: form.bathrooms === "" ? null : Number(form.bathrooms),
            area_sqm: form.area_sqm === "" ? null : Number(form.area_sqm),
            location: form.location.trim(),
            project_name: form.project_name.trim() || null,
            province: form.province.trim() || null,
            district: form.district.trim() || null,
            floor_number: form.floor_number === "" ? null : Number(form.floor_number),
            parking_spaces: form.parking_spaces === "" ? null : Number(form.parking_spaces),
            furnishing: form.furnishing || null,
            property_condition: form.property_condition || null,
            nearby_transit: form.nearby_transit.trim() || null,
            transit_distance_m: form.transit_distance_m === "" ? null : Number(form.transit_distance_m),
            minimum_lease_months:
              form.listing_type === "rent" && form.minimum_lease_months !== ""
                ? Number(form.minimum_lease_months)
                : null,
            available_from: form.available_from || null,
            pet_friendly: form.pet_friendly,
            amenities: form.amenities,
          })
          .eq("id", propertyId)
          .eq("owner_id", user.id);

        if (updateError) throw new Error(updateError.message);

        // Remove photos the owner explicitly deleted.
        if (removedExistingPhotos.length) {
          const removedIds = removedExistingPhotos.map((photo) => photo.id);
          const { error: removeRowsError } = await supabase
            .from("property_photos")
            .delete()
            .in("id", removedIds);
          if (removeRowsError) throw new Error(removeRowsError.message);

          // Storage cleanup is best-effort because older rows only store public URLs.
          const marker = "/storage/v1/object/public/property-images/";
          const storagePaths = removedExistingPhotos
            .map((photo) => photo.image_url.includes(marker) ? photo.image_url.split(marker)[1] : "")
            .filter(Boolean)
            .map((value) => decodeURIComponent(value));
          if (storagePaths.length) await supabase.storage.from("property-images").remove(storagePaths);
        }

        // Re-save existing sort order.
        for (let index = 0; index < existingPhotos.length; index++) {
          const { error: sortError } = await supabase
            .from("property_photos")
            .update({ sort_order: index })
            .eq("id", existingPhotos[index].id)
            .eq("property_id", propertyId);
          if (sortError) throw new Error(sortError.message);
        }

        // Upload newly added images after the existing gallery.
        for (let index = 0; index < photos.length; index++) {
          const photo = photos[index];
          const extension =
            photo.file.name.split(".").pop()?.toLowerCase() ||
            (photo.file.type === "image/png" ? "png" : photo.file.type === "image/webp" ? "webp" : "jpg");
          const storagePath = `${user.id}/${propertyId}/${crypto.randomUUID()}.${extension}`;

          const { error: uploadError } = await supabase.storage
            .from("property-images")
            .upload(storagePath, photo.file, {
              cacheControl: "3600",
              upsert: false,
              contentType: photo.file.type,
            });
          if (uploadError) throw new Error(`Photo ${index + 1} failed to upload: ${uploadError.message}`);
          uploadedPaths.push(storagePath);

          const { data: publicUrlData } = supabase.storage.from("property-images").getPublicUrl(storagePath);
          const { error: photoInsertError } = await supabase.from("property_photos").insert({
            property_id: propertyId,
            image_url: publicUrlData.publicUrl,
            sort_order: existingPhotos.length + index,
          });
          if (photoInsertError) throw new Error(photoInsertError.message);
        }

        router.push("/my-properties");
        router.refresh();
        return;
      }

      // Create the property first so every image can live under its property ID.
      const { data: property, error: insertError } = await supabase
        .from("properties")
        .insert({
          title: form.title.trim(),
          description: form.description.trim(),
          property_type: form.property_type,
          listing_type: form.listing_type,
          price: Number(form.price),
          bedrooms: form.bedrooms === "" ? null : Number(form.bedrooms),
          bathrooms: form.bathrooms === "" ? null : Number(form.bathrooms),
          area_sqm: form.area_sqm === "" ? null : Number(form.area_sqm),
          location: form.location.trim(),
          project_name: form.project_name.trim() || null,
          province: form.province.trim() || null,
          district: form.district.trim() || null,
          floor_number: form.floor_number === "" ? null : Number(form.floor_number),
          parking_spaces: form.parking_spaces === "" ? null : Number(form.parking_spaces),
          furnishing: form.furnishing || null,
          property_condition: form.property_condition || null,
          nearby_transit: form.nearby_transit.trim() || null,
          transit_distance_m: form.transit_distance_m === "" ? null : Number(form.transit_distance_m),
          minimum_lease_months:
            form.listing_type === "rent" && form.minimum_lease_months !== ""
              ? Number(form.minimum_lease_months)
              : null,
          available_from: form.available_from || null,
          pet_friendly: form.pet_friendly,
          amenities: form.amenities,
          status: "active",
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

      router.push("/my-properties");
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

  if (checkingUser || initializingEdit) {
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
                {mode === "edit" ? "Owner Dashboard ยท Edit Listing" : "Owner Dashboard ยท New Listing"}
              </p>
              <h1 className="mt-3 font-display text-5xl tracking-tight md:text-6xl">
                {mode === "edit" ? "Edit your property." : "List your property."}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#627068]">
                Give people the important details first. You can manage the listing
                from your dashboard after publishing.
              </p>
            </div>
            <a
              href="/my-properties"
              className="inline-flex w-fit items-center rounded-xl border border-[#D8D0BE] bg-white px-4 py-2.5 text-sm font-semibold text-[#526158] transition hover:-translate-y-0.5 hover:border-[#B9AA8B]"
            >
              โ Back to my listings
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
              <div>
                <h2 className="font-display text-3xl">Basic information</h2>
                <p className="mt-1 text-sm text-[#6A756E]">Help people understand the property at a glance.</p>
              </div>
            </div>

            <div className="mt-8 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold">Property title <span className="text-[#B8863F]">*</span></label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g. Modern 2-bedroom condo near BTS Thong Lo"
                  className={inputClass}
                />
                <p className="mt-2 text-xs text-[#7B847E]">Use a clear title with the strongest detail about the property.</p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold">Description</label>
                  <span className="text-xs text-[#8A918C]">{form.description.length} characters</span>
                </div>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="What makes this property worth visiting? Mention condition, furnishings, nearby transport, view, facilities and anything a buyer or renter should know."
                  rows={7}
                  className={`${inputClass} resize-none leading-6`}
                />
              </div>
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
              <div className="grid gap-3 sm:grid-cols-2">
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
              </div>
            </div>
          </section>

          {/* 03 PRICE + LOCATION */}
          <section className="rounded-[1.75rem] border border-[#DCD4C2] bg-white p-6 shadow-[0_10px_35px_rgba(31,46,40,0.05)] md:p-8">
            <div className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1F2E28] text-xs font-bold text-white">03</span>
              <div>
                <h2 className="font-display text-3xl">Price & location</h2>
                <p className="mt-1 text-sm text-[#6A756E]">Make the most important search details easy to understand.</p>
              </div>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  {form.listing_type === "rent" ? "Monthly rent" : "Sale price"} <span className="text-[#B8863F]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[#66736B]">เธฟ</span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.price}
                    onChange={(e) => updateField("price", e.target.value)}
                    placeholder={form.listing_type === "rent" ? "25,000" : "4,500,000"}
                    className={`${inputClass} pl-9`}
                  />
                </div>
                <p className="mt-2 text-xs text-[#7B847E]">
                  {form.listing_type === "rent" ? "Price per month in Thai baht." : "Total asking price in Thai baht."}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Location <span className="text-[#B8863F]">*</span></label>
                <input
                  type="text"
                  required
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder="e.g. Thonglor, Watthana, Bangkok"
                  className={inputClass}
                />
                <p className="mt-2 text-xs text-[#7B847E]">Area, district, project name or nearby BTS/MRT is useful.</p>
              </div>
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
                ["area_sqm", "Area (mยฒ)", "65"],
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
          <section className="rounded-[1.75rem] border border-[#DCD4C2] bg-white p-6 shadow-[0_10px_35px_rgba(31,46,40,0.05)] md:p-8">
            <div className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1F2E28] text-xs font-bold text-white">05</span>
              <div>
                <h2 className="font-display text-3xl">Building & location details</h2>
                <p className="mt-1 text-sm text-[#6A756E]">Structured details make the listing easier to discover in BaanNest search.</p>
              </div>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold">Project / building name</label>
                <input type="text" value={form.project_name} onChange={(e) => updateField("project_name", e.target.value)} placeholder="e.g. The Esse at Singha Complex" className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">District / area</label>
                <input type="text" value={form.district} onChange={(e) => updateField("district", e.target.value)} placeholder="e.g. Watthana" className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Province</label>
                <input type="text" value={form.province} onChange={(e) => updateField("province", e.target.value)} placeholder="Bangkok" className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Floor</label>
                <input type="number" min="0" value={form.floor_number} onChange={(e) => updateField("floor_number", e.target.value)} placeholder="e.g. 18" className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Nearby BTS / MRT</label>
                <input type="text" value={form.nearby_transit} onChange={(e) => updateField("nearby_transit", e.target.value)} placeholder="e.g. BTS Thong Lo" className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Distance to transit (metres)</label>
                <input type="number" min="0" value={form.transit_distance_m} onChange={(e) => updateField("transit_distance_m", e.target.value)} placeholder="e.g. 350" className={inputClass} />
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
              {form.listing_type === "rent" && (
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
                    {active ? "โ“ " : "+ "}{amenity}
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
                    {(existingPhotos.length + photos.length) >= MIN_PHOTOS && (
                      <span className="rounded-full bg-[#E8F2EB] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#356246]">
                        Ready
                      </span>
                    )}
                  </div>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6A756E]">
                    Strong photography makes a listing feel trustworthy. Put your best
                    image first โ€” it becomes the cover across BaanNest.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-semibold text-[#68736C]">
                  {existingPhotos.length + photos.length} of {MAX_PHOTOS}
                </span>
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#E9E4D8]">
                  <div
                    className="h-full rounded-full bg-[#B8863F] transition-all duration-300"
                    style={{ width: `${Math.min(100, ((existingPhotos.length + photos.length) / MAX_PHOTOS) * 100)}%` }}
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
              {existingPhotos.length + photos.length === 0 ? (
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
                    JPG ยท PNG ยท WEBP &nbsp;ยท&nbsp; 10 MB each &nbsp;ยท&nbsp; 3โ€“15 photos
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
                    {(existingPhotos.length + photos.length) < MIN_PHOTOS ? (
                      <span className="w-fit rounded-full bg-[#FFF0ED] px-3 py-1.5 text-xs font-bold text-[#A14B3F]">
                        Add {MIN_PHOTOS - existingPhotos.length - photos.length} more to publish
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
                    {existingPhotos.map((photo, index) => (
                      <div key={photo.id} className={`group relative aspect-[4/3] overflow-hidden rounded-[1.35rem] border bg-[#E9E4D8] transition-all duration-200 ${index === 0 ? "border-[#B8863F]/50" : "border-[#DDD5C4]"} hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(31,46,40,0.13)]`}>
                        <img src={photo.image_url} alt={`Property photo ${index + 1}`} className="h-full w-full object-cover" />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-black/10 opacity-80" />
                        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${index === 0 ? "bg-[#B8863F] text-white" : "bg-black/40 text-white"}`}>{index === 0 ? "Cover" : String(index + 1).padStart(2, "0")}</span>
                        <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                          {index !== 0 && <button type="button" onClick={() => setExistingPhotos((current) => [photo, ...current.filter((p) => p.id !== photo.id)])} className="rounded-full bg-white/92 px-3 py-2 text-[10px] font-bold text-[#1F2E28] shadow-lg">Make cover</button>}
                          <button type="button" onClick={() => { setExistingPhotos((current) => current.filter((p) => p.id !== photo.id)); setRemovedExistingPhotos((current) => [...current, photo]); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white shadow-lg hover:bg-[#A23D35]">ร—</button>
                        </div>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 text-white"><p className="text-xs font-semibold">{index === 0 ? "Main listing image" : "Existing photo"}</p></div>
                      </div>
                    ))}

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
                            {existingPhotos.length === 0 && index === 0 ? "Cover" : String(existingPhotos.length + index + 1).padStart(2, "0")}
                          </span>
                        </div>

                        <div className="absolute right-3 top-3 flex translate-y-[-4px] gap-1.5 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                          {(existingPhotos.length > 0 || index !== 0) && (
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
                            ร—
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

                    {(existingPhotos.length + photos.length) < MAX_PHOTOS && (
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
                          {MAX_PHOTOS - existingPhotos.length - photos.length} remaining
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="mt-5 flex flex-col justify-between gap-2 border-t border-[#EEE8DB] pt-4 text-[11px] text-[#7B847E] sm:flex-row sm:items-center">
                    <p>Tip: lead with a bright, wide photo of the main living space.</p>
                    <p>JPG, PNG or WEBP ยท 10 MB max each</p>
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
                {loading ? (mode === "edit" ? "Saving changes..." : `Publishing ${photos.length} photo${photos.length === 1 ? "" : "s"}...`) : (mode === "edit" ? "Save changes โ’" : "Publish property โ’")}
              </button>
            </div>
          </div>
        </form>

        {/* LIVE SUMMARY */}
        <aside className="lg:sticky lg:top-28">
          <div className="overflow-hidden rounded-[1.75rem] border border-[#DCD4C2] bg-[#1F2E28] text-white shadow-[0_18px_50px_rgba(31,46,40,0.12)]">
            <div className="border-b border-white/10 p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#D8AE68]">Listing preview</p>
              <h3 className="mt-3 font-display text-2xl leading-tight">
                {form.title.trim() || "Your property title"}
              </h3>
              <p className="mt-2 text-sm text-white/55">{form.location.trim() || "Bangkok, Thailand"}</p>
            </div>

            <div className="p-6">
              <p className="text-xs uppercase tracking-[0.16em] text-white/45">
                {form.listing_type === "rent" ? "For rent" : "For sale"} ยท {form.property_type}
              </p>
              <p className="mt-2 text-3xl font-bold">
                {form.price ? `เธฟ${Number(form.price).toLocaleString()}` : "เธฟโ€”"}
                {form.listing_type === "rent" && form.price && <span className="text-sm font-medium text-white/45"> /mo</span>}
              </p>

              <div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/10 pt-5 text-center">
                <div>
                  <p className="text-lg font-bold">{form.bedrooms || "โ€”"}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-white/40">Beds</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{form.bathrooms || "โ€”"}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-white/40">Baths</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{form.area_sqm || "โ€”"}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-white/40">mยฒ</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#DCD4C2] bg-[#F8F5ED] p-5">
            <p className="text-sm font-bold">{mode === "edit" ? "Before you save" : "Before you publish"}</p>
            <p className="mt-2 text-xs leading-5 text-[#6A756E]">
              {mode === "edit" ? "Review the changes carefully. Your live listing will update after saving." : "Check the price, location and description carefully. You can manage the listing from My Listings after publishing."}
            </p>
          </div>
        </aside>
      </section>

      <footer className="border-t border-[#DDD6C3] bg-[#F8F5ED]">
        <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-[#5C6B62]">
          ยฉ 2026 BaanNest ยท Bangkok, Thailand
        </div>
      </footer>
    </main>
  );
}

