"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Property = {
  id: string;
  title: string;
  property_type: string;
  listing_type: string;
  price: number;
  location: string | null;
  status: string;
};

export default function AgentDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [properties, setProperties] = useState<Property[]>([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      !["baannest_agent", "external_agent"].includes(profile.role)
    ) {
      router.replace("/");
      return;
    }

    setRole(profile.role);

    const { data, error } = await supabase
      .from("properties")
      .select(
        "id, title, property_type, listing_type, price, location, status"
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("AGENT PROPERTY ERROR:", error);
    } else {
      setProperties(data || []);
    }

    setLoading(false);
  }

  const roleName =
    role === "baannest_agent"
      ? "BaanNest Agent"
      : "External Agent";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F2EEE3] text-[#1F2E28]">
        <div className="flex items-center gap-3 text-sm text-[#5C6B62]">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#B8863F]/30 border-t-[#B8863F]" />
          Loading dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F2EEE3] text-[#1F2E28]">
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B8863F]">
              {roleName}
            </p>

            <h1 className="mt-3 font-display text-5xl tracking-tight">
              Agent Dashboard
            </h1>

            <p className="mt-3 text-[#5C6B62]">
              View your submitted listings and add new properties.
            </p>
          </div>

          <a
            href="/admin/properties/new"
            className="rounded-xl bg-[#1F2E28] px-6 py-3.5 text-center text-sm font-medium text-[#F2EEE3] transition hover:-translate-y-1 hover:bg-[#2D4038] hover:shadow-lg"
          >
            + Add Property
          </a>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#DDD6C3] bg-white p-6">
            <p className="text-sm text-[#5C6B62]">My Listings</p>
            <p className="mt-2 font-display text-4xl">
              {properties.length}
            </p>
          </div>

          <div className="rounded-2xl border border-[#DDD6C3] bg-white p-6">
            <p className="text-sm text-[#5C6B62]">Active</p>
            <p className="mt-2 font-display text-4xl">
              {properties.filter((p) => p.status === "active").length}
            </p>
          </div>

          <div className="rounded-2xl border border-[#DDD6C3] bg-white p-6">
            <p className="text-sm text-[#5C6B62]">Other</p>
            <p className="mt-2 font-display text-4xl">
              {properties.filter((p) => p.status !== "active").length}
            </p>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="font-display text-3xl">
            My Listings
          </h2>

          <p className="mt-2 text-sm text-[#5C6B62]">
            Properties submitted from your account.
          </p>

          {properties.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[#CFC7B4] bg-white p-12 text-center">
              <p className="font-display text-2xl">
                No listings yet
              </p>

              <p className="mt-2 text-sm text-[#5C6B62]">
                Add your first property to BaanNest.
              </p>

              <a
                href="/admin/properties/new"
                className="mt-6 inline-block rounded-xl bg-[#1F2E28] px-6 py-3 text-sm font-medium text-[#F2EEE3]"
              >
                Add Property
              </a>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-[#DDD6C3] bg-white">
              <div className="divide-y divide-[#E8E3D7]">
                {properties.map((property) => (
                  <div
                    key={property.id}
                    className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-display text-xl">
                          {property.title}
                        </h3>

                        <span className="rounded-full bg-[#EAF1EC] px-3 py-1 text-xs font-medium text-[#31563F]">
                          {property.status}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-[#5C6B62]">
                        {property.property_type} ·{" "}
                        {property.listing_type}
                        {property.location
                          ? ` · ${property.location}`
                          : ""}
                      </p>

                      <p className="mt-2 font-medium">
                        ฿{Number(property.price).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <a
                        href={`/properties/${property.id}`}
                        className="rounded-xl border border-[#CFC7B4] px-4 py-2.5 text-sm font-medium transition hover:border-[#1F2E28] hover:bg-[#F2EEE3]"
                      >
                        View
                      </a>

                      <span className="text-xs text-[#8A918B]">
                        Managed by BaanNest
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}