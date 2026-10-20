"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";

type PhotoItem = {
  id: string;
  file?: File;
  preview: string;
  existing: boolean;
  storagePath?: string;
};

function SortablePhoto({
  photo,
  index,
  onRemove,
}: {
  photo: PhotoItem;
  index: number;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="relative overflow-hidden rounded-xl border border-[#DDD6C3] bg-white"
    >
      <img
        src={photo.preview}
        alt={`Property photo ${index + 1}`}
        className="h-40 w-full object-cover"
      />

      {index === 0 && (
        <div className="absolute left-2 top-2 rounded-full bg-[#1F2E28] px-3 py-1 text-xs font-semibold text-white">
          COVER
        </div>
      )}

      <button
        type="button"
        onClick={() => onRemove(photo.id)}
        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg text-red-600 shadow"
      >
        ×
      </button>

      <div
        {...listeners}
        className="cursor-grab border-t border-[#DDD6C3] p-2 text-center text-xs text-gray-500 active:cursor-grabbing"
      >
        ↕ Drag to reorder
      </div>
    </div>
  );
}

export default function EditPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const propertyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] = useState("condo");
  const [listingType, setListingType] = useState("rent");
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [area, setArea] = useState("");
  const [location, setLocation] = useState("");

  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  useEffect(() => {
    async function loadProperty() {
      const { data: property, error: propertyError } =
        await supabase
          .from("properties")
          .select("*")
          .eq("id", propertyId)
          .single();

      if (propertyError) {
        console.error("PROPERTY ERROR:", propertyError);
        setMessage(propertyError.message);
        setLoading(false);
        return;
      }

      setTitle(property.title || "");
      setDescription(property.description || "");
      setPropertyType(property.property_type || "condo");
      setListingType(property.listing_type || "rent");
      setPrice(String(property.price ?? ""));
      setBedrooms(
        property.bedrooms === null
          ? ""
          : String(property.bedrooms)
      );
      setBathrooms(
        property.bathrooms === null
          ? ""
          : String(property.bathrooms)
      );
      setArea(
        property.area_sqm === null
          ? ""
          : String(property.area_sqm)
      );
      setLocation(property.location || "");

      const { data: photoRows, error: photoError } =
        await supabase
          .from("property_photos")
          .select("*")
          .eq("property_id", propertyId)
          .order("sort_order", {
            ascending: true,
          });

      if (photoError) {
        console.error("PHOTO ERROR:", photoError);
        setMessage(photoError.message);
      } else {
        setPhotos(
          (photoRows || []).map((photo) => ({
            id: photo.id,
            preview: photo.image_url,
            existing: true,
          }))
        );
      }

      setLoading(false);
    }

    loadProperty();
  }, [propertyId]);

  function handlePhotoSelect(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files || []);

    const newPhotos: PhotoItem[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      existing: false,
    }));

    setPhotos((current) => [...current, ...newPhotos]);

    event.target.value = "";
  }

  async function removePhoto(id: string) {
    const photo = photos.find((item) => item.id === id);

    if (!photo) return;

    if (!photo.existing) {
      if (photo.preview.startsWith("blob:")) {
        URL.revokeObjectURL(photo.preview);
      }

      setPhotos((current) =>
        current.filter((item) => item.id !== id)
      );

      return;
    }

    const confirmed = window.confirm(
      "Delete this photo permanently?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("property_photos")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPhotos((current) =>
      current.filter((item) => item.id !== id)
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setPhotos((current) => {
      const oldIndex = current.findIndex(
        (photo) => photo.id === active.id
      );

      const newIndex = current.findIndex(
        (photo) => photo.id === over.id
      );

      return arrayMove(current, oldIndex, newIndex);
    });
  }

  function getStoragePathFromPublicUrl(url: string) {
    const marker = "/storage/v1/object/public/property-images/";
    const markerIndex = url.indexOf(marker);

    if (markerIndex === -1) return null;

    return decodeURIComponent(
      url.slice(markerIndex + marker.length)
    );
  }

  async function handleDeleteProperty() {
    if (deleting) return;

    const confirmed = window.confirm(
      `Delete "${title || "this property"}" permanently?\n\nThis removes the listing from BaanNest. If it is linked to protected CRM or deal records, Supabase will block the deletion so that history is not lost.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setMessage("");

    try {
      const storagePaths = photos
        .filter((photo) => photo.existing)
        .map((photo) =>
          getStoragePathFromPublicUrl(photo.preview)
        )
        .filter((path): path is string => Boolean(path));

      const { error: deletePropertyError } =
        await supabase
          .from("properties")
          .delete()
          .eq("id", propertyId);

      if (deletePropertyError) {
        throw deletePropertyError;
      }

      // The database row is already deleted at this point.
      // Storage cleanup is best-effort so a storage policy problem
      // does not bring the deleted listing back.
      if (storagePaths.length > 0) {
        const { error: storageError } =
          await supabase.storage
            .from("property-images")
            .remove(storagePaths);

        if (storageError) {
          console.error(
            "PROPERTY IMAGE CLEANUP ERROR:",
            storageError
          );
        }
      }

      router.push("/admin");
      router.refresh();
    } catch (error: any) {
      console.error("DELETE PROPERTY ERROR:", error);

      const rawMessage =
        error?.message ||
        "Unable to delete this property.";

      if (
        rawMessage.toLowerCase().includes("foreign key")
      ) {
        setMessage(
          "This property is still linked to another record (for example photos, enquiries, or a deal). Supabase blocked the deletion to protect that data."
        );
      } else {
        setMessage(rawMessage);
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!title || !price) {
      setMessage("Please enter a title and price.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      // 1. Update property
      const { error: propertyError } =
        await supabase
          .from("properties")
          .update({
            title,
            description,
            property_type: propertyType,
            listing_type: listingType,
            price: Number(price),
            bedrooms: bedrooms
              ? Number(bedrooms)
              : null,
            bathrooms: bathrooms
              ? Number(bathrooms)
              : null,
            area_sqm: area
              ? Number(area)
              : null,
            location,
          })
          .eq("id", propertyId);

      if (propertyError) {
        throw propertyError;
      }

      // 2. Upload new photos
      const uploadedPhotos: PhotoItem[] = [];

      for (const photo of photos) {
        if (!photo.existing && photo.file) {
          const extension =
            photo.file.name.split(".").pop() ||
            "jpg";

          const filePath = `${propertyId}/${crypto.randomUUID()}.${extension}`;

          const { error: uploadError } =
            await supabase.storage
              .from("property-images")
              .upload(filePath, photo.file);

          if (uploadError) {
            throw uploadError;
          }

          const {
            data: { publicUrl },
          } = supabase.storage
            .from("property-images")
            .getPublicUrl(filePath);

          uploadedPhotos.push({
            ...photo,
            preview: publicUrl,
            existing: true,
          });
        } else {
          uploadedPhotos.push(photo);
        }
      }

      // 3. Remove old photo records
      const { error: deleteError } =
        await supabase
          .from("property_photos")
          .delete()
          .eq("property_id", propertyId);

      if (deleteError) {
        throw deleteError;
      }

      // 4. Recreate photo records in current order
      if (uploadedPhotos.length > 0) {
        const photoRecords = uploadedPhotos.map(
          (photo, index) => ({
            property_id: propertyId,
            image_url: photo.preview,
            sort_order: index,
          })
        );

        const { error: photoError } =
          await supabase
            .from("property_photos")
            .insert(photoRecords);

        if (photoError) {
          throw photoError;
        }
      }

      setMessage("Property updated successfully!");

      setTimeout(() => {
        router.push("/admin");
      }, 800);
    } catch (error: any) {
      console.error("UPDATE PROPERTY ERROR:", error);
      setMessage(
        error?.message || "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F2EEE3] text-[#1F2E28]">
        <div className="text-lg font-medium">
          Loading property...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F2EEE3] text-[#1F2E28]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#B8863F]">
            Admin
          </p>

          <h1 className="text-4xl font-bold">
            Edit Property
          </h1>

          <p className="mt-2 text-gray-600">
            Update the property information and photos.
          </p>
        </div>

        <form
          onSubmit={handleSave}
          className="space-y-8"
        >
          {/* PROPERTY INFORMATION */}
          <section className="rounded-2xl border border-[#DDD6C3] bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-semibold">
              Property Information
            </h2>

            <div className="grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Property Title
                </label>

                <input
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#B8863F]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  rows={5}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#B8863F]"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Property Type
                  </label>

                  <select
                    value={propertyType}
                    onChange={(e) =>
                      setPropertyType(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  >
                    <option value="condo">
                      Condo
                    </option>
                    <option value="house">
                      House
                    </option>
                    <option value="townhouse">
                      Townhouse
                    </option>
                    <option value="land">
                      Land
                    </option>
                    <option value="commercial">
                      Commercial
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Listing Type
                  </label>

                  <select
                    value={listingType}
                    onChange={(e) =>
                      setListingType(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  >
                    <option value="rent">
                      Rent
                    </option>
                    <option value="sale">
                      Sale
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Price (THB)
                </label>

                <input
                  type="number"
                  value={price}
                  onChange={(e) =>
                    setPrice(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Bedrooms
                  </label>

                  <input
                    type="number"
                    value={bedrooms}
                    onChange={(e) =>
                      setBedrooms(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Bathrooms
                  </label>

                  <input
                    type="number"
                    value={bathrooms}
                    onChange={(e) =>
                      setBathrooms(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Area (sqm)
                  </label>

                  <input
                    type="number"
                    value={area}
                    onChange={(e) =>
                      setArea(e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Location
                </label>

                <input
                  value={location}
                  onChange={(e) =>
                    setLocation(e.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3"
                />
              </div>
            </div>
          </section>

          {/* PHOTOS */}
          <section className="rounded-2xl border border-[#DDD6C3] bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">
                Property Photos
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                The first photo is the cover photo.
                Drag photos to reorder them.
              </p>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#DDD6C3] bg-[#F8F6F0] px-6 py-10 text-center transition hover:border-[#B8863F]">
              <div className="mb-3 text-4xl">
                📸
              </div>

              <div className="font-semibold">
                Add more photos
              </div>

              <div className="mt-1 text-sm text-gray-500">
                JPG, PNG, WEBP
              </div>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </label>

            {photos.length > 0 && (
              <div className="mt-6">
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={photos.map(
                      (photo) => photo.id
                    )}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {photos.map((photo, index) => (
                        <SortablePhoto
                          key={photo.id}
                          photo={photo}
                          index={index}
                          onRemove={removePhoto}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </section>

          {/* SAVE */}
          <section className="rounded-2xl border border-[#DDD6C3] bg-white p-6 shadow-sm">
            {message && (
              <div className="mb-5 rounded-xl bg-[#F2EEE3] px-4 py-3 text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-[#1F2E28] px-6 py-4 font-semibold text-white transition hover:bg-[#2B4038] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving Changes..."
                : "Save Changes"}
            </button>
          </section>

          {/* DANGER ZONE */}
          <section className="rounded-2xl border border-red-200 bg-red-50/60 p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-700">
                  Danger Zone
                </p>
                <h2 className="mt-1 text-lg font-semibold text-red-900">
                  Delete Property
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-red-700/80">
                  Permanently remove this listing from BaanNest. This cannot be undone.
                  Linked CRM or deal records may prevent deletion so their history is not
                  accidentally lost.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDeleteProperty}
                disabled={saving || deleting}
                className="shrink-0 rounded-xl border border-red-300 bg-white px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting
                  ? "Deleting Property..."
                  : "Delete Property"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}