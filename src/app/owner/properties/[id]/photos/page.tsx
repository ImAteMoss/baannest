"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import { createClient } from "@/lib/supabase/client";

type Property = {
  id: string;
  title: string;
  owner_id: string;
};

type Photo = {
  id: string;
  property_id: string;
  image_url: string;
  sort_order: number;
};

function SortablePhoto({
  photo,
  index,
  propertyTitle,
  onDelete,
}: {
  photo: Photo;
  index: number;
  propertyTitle: string;
  onDelete: (photo: Photo) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: photo.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden rounded-3xl border border-[#DDD6C3] bg-white shadow-sm transition ${
        isDragging
          ? "scale-[1.03] rotate-[1deg] shadow-2xl"
          : "hover:shadow-md"
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="relative aspect-[4/3] cursor-grab touch-none bg-[#E9E4D7] active:cursor-grabbing"
      >
        <img
          src={photo.image_url}
          alt={`${propertyTitle} photo ${index + 1}`}
          className="h-full w-full select-none object-cover"
          draggable={false}
        />

        {index === 0 && (
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-[#1F2E28] px-3 py-1.5 text-xs font-medium text-[#F2EEE3]">
            <span>★</span>
            Cover Photo
          </div>
        )}

        <div className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-[#1F2E28]">
          #{index + 1}
        </div>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm">
          Drag to reorder
        </div>
      </div>

      <div className="p-4">
        <button
          type="button"
          onClick={() => onDelete(photo)}
          className="w-full rounded-xl border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          Delete Photo
        </button>
      </div>
    </div>
  );
}

export default function PropertyPhotosPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();

  const propertyId = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [originalPhotos, setOriginalPhotos] = useState<Photo[]>([]);

  const [newPhotoIds, setNewPhotoIds] = useState<string[]>([]);
  const [deletedPhotos, setDeletedPhotos] = useState<Photo[]>([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (propertyId) {
      loadProperty();
    }
  }, [propertyId]);

  async function loadProperty() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: propertyData, error: propertyError } = await supabase
      .from("properties")
      .select("id,title,owner_id")
      .eq("id", propertyId)
      .single();

    if (propertyError || !propertyData) {
      setError("Property not found.");
      setLoading(false);
      return;
    }

    if (propertyData.owner_id !== user.id) {
      setError("You do not have permission to manage this property.");
      setLoading(false);
      return;
    }

    setProperty(propertyData);

    const { data: photoData, error: photoError } = await supabase
      .from("property_photos")
      .select("id,property_id,image_url,sort_order")
      .eq("property_id", propertyId)
      .order("sort_order", { ascending: true });

    if (photoError) {
      setError(photoError.message);
    } else {
      const loadedPhotos = photoData || [];

      setPhotos(loadedPhotos);
      setOriginalPhotos(loadedPhotos);
      setNewPhotoIds([]);
      setDeletedPhotos([]);
    }

    setLoading(false);
  }

  function hasChanges() {
    if (newPhotoIds.length > 0) {
      return true;
    }

    if (deletedPhotos.length > 0) {
      return true;
    }

    if (photos.length !== originalPhotos.length) {
      return true;
    }

    return photos.some(
      (photo, index) => photo.id !== originalPhotos[index]?.id
    );
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;

    if (!files || files.length === 0) {
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const currentMaxOrder =
        photos.length > 0
          ? Math.max(...photos.map((photo) => photo.sort_order))
          : -1;

      const uploadedPhotos: Photo[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!file.type.startsWith("image/")) {
          throw new Error(`${file.name} is not an image.`);
        }

        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name} is larger than 10MB.`);
        }

        const extension =
          file.name.split(".").pop()?.toLowerCase() || "jpg";

        const fileName = `${crypto.randomUUID()}.${extension}`;

        const storagePath = `${user.id}/${propertyId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("property-images")
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        const { data: publicUrlData } = supabase.storage
          .from("property-images")
          .getPublicUrl(storagePath);

        const imageUrl = publicUrlData.publicUrl;

        const { data: photoRecord, error: photoInsertError } =
          await supabase
            .from("property_photos")
            .insert({
              property_id: propertyId,
              image_url: imageUrl,
              sort_order: currentMaxOrder + i + 1,
            })
            .select("id,property_id,image_url,sort_order")
            .single();

        if (photoInsertError) {
          await supabase.storage
            .from("property-images")
            .remove([storagePath]);

          throw new Error(photoInsertError.message);
        }

        uploadedPhotos.push(photoRecord);
      }

      setPhotos((current) => [...current, ...uploadedPhotos]);

      setNewPhotoIds((current) => [
        ...current,
        ...uploadedPhotos.map((photo) => photo.id),
      ]);

      setSuccess(
        `${uploadedPhotos.length} photo${
          uploadedPhotos.length === 1 ? "" : "s"
        } added. Click Save Changes when you're finished.`
      );

      event.target.value = "";
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload photos."
      );
    } finally {
      setUploading(false);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = photos.findIndex((photo) => photo.id === active.id);
    const newIndex = photos.findIndex((photo) => photo.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedPhotos = arrayMove(photos, oldIndex, newIndex).map(
      (photo, index) => ({
        ...photo,
        sort_order: index,
      })
    );

    setPhotos(reorderedPhotos);

    setError("");
    setSuccess("Photo order changed. Click Save Changes to keep it.");
  }

  function handleDelete(photo: Photo) {
    setError("");
    setSuccess("");

    const wasNewPhoto = newPhotoIds.includes(photo.id);

    setPhotos((current) =>
      current.filter((item) => item.id !== photo.id)
    );

    if (wasNewPhoto) {
      setNewPhotoIds((current) =>
        current.filter((id) => id !== photo.id)
      );
    } else {
      setDeletedPhotos((current) => [...current, photo]);
    }

    setSuccess("Photo marked for deletion. Click Save Changes to confirm.");
  }

  function getStoragePath(imageUrl: string) {
    const marker = "/property-images/";

    const index = imageUrl.indexOf(marker);

    if (index === -1) {
      return null;
    }

    return decodeURIComponent(
      imageUrl.substring(index + marker.length)
    );
  }

  async function saveChanges() {
    if (!hasChanges()) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Delete photos that were marked for deletion.
      for (const photo of deletedPhotos) {
        const storagePath = getStoragePath(photo.image_url);

        if (storagePath) {
          const { error: storageError } = await supabase.storage
            .from("property-images")
            .remove([storagePath]);

          if (storageError) {
            throw new Error(storageError.message);
          }
        }

        const { error: deleteError } = await supabase
          .from("property_photos")
          .delete()
          .eq("id", photo.id);

        if (deleteError) {
          throw new Error(deleteError.message);
        }
      }

      // Save the new order.
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];

        const { error: orderError } = await supabase
          .from("property_photos")
          .update({
            sort_order: i,
          })
          .eq("id", photo.id);

        if (orderError) {
          throw new Error(orderError.message);
        }
      }

      const savedPhotos = photos.map((photo, index) => ({
        ...photo,
        sort_order: index,
      }));

      setPhotos(savedPhotos);
      setOriginalPhotos(savedPhotos);
      setNewPhotoIds([]);
      setDeletedPhotos([]);

      setSuccess("Changes saved successfully.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save changes."
      );
    } finally {
      setSaving(false);
    }
  }

  async function discardChanges() {
    if (!hasChanges()) {
      router.push("/my-properties");
      return;
    }

    const confirmed = window.confirm(
      "Discard all changes? Newly added photos will be removed."
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Remove newly uploaded photos from storage + database.
      for (const photoId of newPhotoIds) {
        const photo = photos.find((item) => item.id === photoId);

        if (!photo) {
          continue;
        }

        const storagePath = getStoragePath(photo.image_url);

        if (storagePath) {
          await supabase.storage
            .from("property-images")
            .remove([storagePath]);
        }

        await supabase
          .from("property_photos")
          .delete()
          .eq("id", photo.id);
      }

      // Restore the original state.
      setPhotos(originalPhotos);
      setNewPhotoIds([]);
      setDeletedPhotos([]);

      router.push("/my-properties");
    } catch (discardError) {
      setError(
        discardError instanceof Error
          ? discardError.message
          : "Failed to discard changes."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F2EEE3] px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="h-8 w-64 animate-pulse rounded bg-[#DDD6C3]" />

          <div className="mt-8 h-64 animate-pulse rounded-3xl bg-[#DDD6C3]" />
        </div>
      </main>
    );
  }

  if (!property) {
    return (
      <main className="min-h-screen bg-[#F2EEE3] px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <button
            onClick={() => router.push("/my-properties")}
            className="mb-8 text-sm font-medium text-[#5C6B62] hover:text-[#1F2E28]"
          >
            ← Back to My Properties
          </button>

          <div className="rounded-3xl border border-[#DDD6C3] bg-white p-8">
            <p className="text-red-600">
              {error || "Property not found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const changed = hasChanges();

  return (
    <main className="min-h-screen bg-[#F2EEE3] px-6 pb-36 pt-12">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => router.push("/my-properties")}
          className="mb-8 text-sm font-medium text-[#5C6B62] transition hover:text-[#1F2E28]"
        >
          ← Back to My Properties
        </button>

        <div className="mb-10">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-[#B8863F]">
            Edit Photos
          </p>

          <h1 className="font-serif text-4xl font-semibold text-[#1F2E28]">
            {property.title}
          </h1>

          <p className="mt-3 text-[#5C6B62]">
            Upload photos and drag them into the order you want.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
            {success}
          </div>
        )}

        <section className="mb-8 rounded-3xl border border-[#DDD6C3] bg-white p-8 shadow-sm">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold text-[#1F2E28]">
                Add Photos
              </h2>

              <p className="mt-1 text-sm text-[#5C6B62]">
                JPG, PNG, WEBP • Maximum 10MB per image
              </p>
            </div>

            <label className="cursor-pointer rounded-full bg-[#1F2E28] px-6 py-3 text-sm font-medium text-[#F2EEE3] transition hover:bg-[#2D4038]">
              {uploading ? "Uploading..." : "+ Add Photos"}

              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading || saving}
                onChange={handleUpload}
                className="hidden"
              />
            </label>
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-[#1F2E28]">
                Photos
              </h2>

              <p className="mt-1 text-sm text-[#5C6B62]">
                {photos.length} photo
                {photos.length === 1 ? "" : "s"}
              </p>
            </div>

            {changed && (
              <span className="rounded-full bg-[#B8863F]/10 px-4 py-2 text-xs font-medium text-[#8A642D]">
                Unsaved changes
              </span>
            )}
          </div>

          {photos.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#CFC6AE] bg-white/60 px-6 py-20 text-center">
              <div className="text-5xl">📷</div>

              <h3 className="mt-5 text-xl font-semibold text-[#1F2E28]">
                No photos yet
              </h3>

              <p className="mt-2 text-sm text-[#5C6B62]">
                Add some photos to make your property listing stand out.
              </p>

              <label className="mt-6 inline-block cursor-pointer rounded-full bg-[#1F2E28] px-6 py-3 text-sm font-medium text-[#F2EEE3] transition hover:bg-[#2D4038]">
                + Add Photos

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading || saving}
                  onChange={handleUpload}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={photos.map((photo) => photo.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {photos.map((photo, index) => (
                    <SortablePhoto
                      key={photo.id}
                      photo={photo}
                      index={index}
                      propertyTitle={property.title}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>
      </div>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#DDD6C3] bg-white/95 shadow-[0_-8px_30px_rgba(31,46,40,0.08)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="hidden sm:block">
            {changed ? (
              <>
                <p className="text-sm font-semibold text-[#1F2E28]">
                  You have unsaved changes
                </p>

                <p className="mt-0.5 text-xs text-[#5C6B62]">
                  Save your changes before leaving this page.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-[#1F2E28]">
                  All changes saved
                </p>

                <p className="mt-0.5 text-xs text-[#5C6B62]">
                  Your photos are up to date.
                </p>
              </>
            )}
          </div>

          <div className="flex w-full justify-end gap-3 sm:w-auto">
            <button
              type="button"
              onClick={discardChanges}
              disabled={saving || uploading}
              className="rounded-full border border-[#CFC6AE] px-5 py-3 text-sm font-medium text-[#1F2E28] transition hover:bg-[#F2EEE3] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Discard
            </button>

            <button
              type="button"
              onClick={saveChanges}
              disabled={!changed || saving || uploading}
              className="rounded-full bg-[#1F2E28] px-6 py-3 text-sm font-medium text-[#F2EEE3] transition hover:bg-[#2D4038] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}