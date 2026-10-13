"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Property = {
  id: string;
  title: string;
  location: string;
  status: string;
};

export default function ManagePropertyPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();

  const propertyId = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProperty();
  }, [propertyId]);

  async function loadProperty() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("properties")
      .select("id,title,location,status,owner_id")
      .eq("id", propertyId)
      .single();

    if (error || !data) {
      setError("Property not found.");
      setLoading(false);
      return;
    }

    if (data.owner_id !== user.id) {
      setError("You do not have permission to manage this property.");
      setLoading(false);
      return;
    }

    setProperty(data);
    setLoading(false);

    // Automatically open the combined editor
    router.replace(`/owner/properties/${propertyId}/edit`);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F2EEE3] px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="h-10 w-72 animate-pulse rounded bg-[#DDD6C3]" />
          <div className="mt-8 h-72 animate-pulse rounded-3xl bg-[#DDD6C3]" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F2EEE3] px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => router.push("/my-properties")}
          className="text-sm font-medium text-[#5C6B62] hover:text-[#1F2E28]"
        >
          ← Back to My Properties
        </button>

        <div className="mt-8 rounded-3xl border border-[#DDD6C3] bg-white p-8">
          <p className="text-red-600">
            {error || "Loading property..."}
          </p>
        </div>
      </div>
    </main>
  );
}