"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  file: File;
  preview: string;
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

export default function NewPropertyPage() {
  const router = useRouter();
  const supabase = createClient();

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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    return () => {
      photos.forEach((photo) => {
        URL.revokeObjectURL(photo.preview);
      });
    };
  }, []);

  function handlePhotoSelect(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files || []);

    const newPhotos = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
    }));

    setPhotos((current) => [...current, ...newPhotos]);

    event.target.value = "";
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === id);

      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }

      return current.filter((item) => item.id !== id);
    });
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

  async function handleSubmit(
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("You must be logged in.");
        setSaving(false);
        return;
      }

      // 1. Create property
      const { data: property, error: propertyError } =
        await supabase
          .from("properties")
          .insert({
            title,
            description,
            property_type: propertyType,
            listing_type: listingType,
            price: Number(price),
            bedrooms: bedrooms ? Number(bedrooms) : null,
            bathrooms: bathrooms ? Number(bathrooms) : null,
            area_sqm: area ? Number(area) : null,
            location,
            status: "active",
            source: "baannest",
            owner_id: user.id,
          })
          .select()
          .single();

      if (propertyError) {
        throw propertyError;
      }

      // 2. Upload photos
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];

        const extension =
          photo.file.name.split(".").pop() || "jpg";

        const filePath = `${property.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("property-images")
          .upload(filePath, photo.file);

        if (uploadError) {
          throw uploadError;
        }

        // 3. Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage
          .from("property-images")
          .getPublicUrl(filePath);

        // 4. Save photo record
        const { error: photoError } = await supabase
          .from("property_photos")
          .insert({
            property_id: property.id,
            image_url: publicUrl,
            sort_order: i,
          });

        if (photoError) {
          throw photoError;
        }
      }

      setMessage("Property created successfully!");

      setTimeout(() => {
        router.push("/admin");
      }, 800);
    } catch (error: any) {
      console.error("CREATE PROPERTY ERROR:", error);
      setMessage(
        error?.message || "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F2EEE3] text-[#1F2E28]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-[#B8863F]">
            Admin
          </p>

          <h1 className="text-4xl font-bold">
            Add Property
          </h1>

          <p className="mt-2 text-gray-600">
            Add a new property to the BaanNest marketplace.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
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
                  placeholder="Modern 2 Bedroom Condo in Bangkok"
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
                  placeholder="Describe the property..."
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
                    <option value="condo">Condo</option>
                    <option value="house">House</option>
                    <option value="townhouse">
                      Townhouse
                    </option>
                    <option value="land">Land</option>
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
                    <option value="rent">Rent</option>
                    <option value="sale">Sale</option>
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
                  placeholder="25000"
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
                    placeholder="2"
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
                    placeholder="2"
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
                    placeholder="65"
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
                  placeholder="Sukhumvit, Bangkok"
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
                Add multiple photos. Drag them to change
                their order. The first photo will be the
                cover photo.
              </p>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#DDD6C3] bg-[#F8F6F0] px-6 py-10 text-center transition hover:border-[#B8863F]">
              <div className="mb-3 text-4xl">📸</div>

              <div className="font-semibold">
                Click to choose photos
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

          {/* SUBMIT */}
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
                ? "Creating Property..."
                : "Create Property"}
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}