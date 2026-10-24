"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeDollarSign,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Handshake,
  Inbox,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PropertyStatus =
  | "pending"
  | "active"
  | "paused"
  | "rejected"
  | "rented"
  | "sold";

type Property = {
  id: string;
  title: string;
  property_type: string;
  listing_type: string;
  price: number;
  rent_price?: number | null;
  sale_price?: number | null;
  status: string;
  location: string | null;
  project_name?: string | null;
  district?: string | null;
  province?: string | null;
  created_at: string;
};

type Lead = {
  id: string;
  property_id: string;
  seeker_name: string;
  status: string;
  enquiry_type: "enquiry" | "co_work";
  next_follow_up_at: string | null;
  created_at: string;
};

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();

  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const [deletingPropertyId, setDeletingPropertyId] =
    useState<string | null>(null);

  const [updatingPropertyId, setUpdatingPropertyId] =
    useState<string | null>(null);

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace(`/login?returnTo=${encodeURIComponent("/admin")}`);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    if (profile?.role !== "admin") {
      router.replace("/properties");
      return;
    }

    const [propertyResult, leadResult] = await Promise.all([
      supabase
        .from("properties")
        .select(
          "id,title,property_type,listing_type,price,rent_price,sale_price,status,location,project_name,district,province,created_at"
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("property_enquiries")
        .select(
          "id,property_id,seeker_name,status,enquiry_type,next_follow_up_at,created_at"
        )
        .order("created_at", { ascending: false }),
    ]);

    if (propertyResult.error) {
      setError(propertyResult.error.message);
    } else {
      setProperties((propertyResult.data || []) as Property[]);
    }

    if (leadResult.error) {
      setError((current) => current || leadResult.error.message);
      setLeads([]);
    } else {
      setLeads((leadResult.data || []) as Lead[]);
    }

    setLoading(false);
  }

  async function updatePropertyStatus(
    propertyId: string,
    status: PropertyStatus
  ) {
    if (status === "rejected") {
      const property = properties.find(
        (item) => item.id === propertyId
      );

      const confirmed = window.confirm(
        `Reject "${property?.title || "this property"}"?\n\nThe listing will not appear publicly.`
      );

      if (!confirmed) return;
    }

    setUpdatingPropertyId(propertyId);
    setError("");

    const { error: updateError } = await supabase
      .from("properties")
      .update({
        status,
      })
      .eq("id", propertyId);

    if (updateError) {
      console.error(
        "UPDATE PROPERTY STATUS ERROR:",
        updateError
      );

      setError(updateError.message);
      setUpdatingPropertyId(null);
      return;
    }

    setProperties((current) =>
      current.map((property) =>
        property.id === propertyId
          ? {
              ...property,
              status,
            }
          : property
      )
    );

    setUpdatingPropertyId(null);
  }

  async function deleteProperty(property: Property) {
    const confirmed = window.confirm(
      `Delete "${property.title}" permanently?\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingPropertyId(property.id);
    setError("");

    const { error: deleteError } = await supabase
      .from("properties")
      .delete()
      .eq("id", property.id);

    if (deleteError) {
      console.error(
        "DELETE PROPERTY ERROR:",
        deleteError
      );

      setError(deleteError.message);
      setDeletingPropertyId(null);

      return;
    }

    setProperties((current) =>
      current.filter(
        (item) => item.id !== property.id
      )
    );

    setDeletingPropertyId(null);
  }

  const stats = useMemo(() => {
    const endToday = new Date();

    endToday.setHours(
      23,
      59,
      59,
      999
    );

    return {
      pending: properties.filter(
        (property) =>
          property.status === "pending"
      ).length,

      active: properties.filter(
        (property) =>
          property.status === "active"
      ).length,

      newLeads: leads.filter(
        (lead) =>
          lead.status === "new"
      ).length,

      viewings: leads.filter(
        (lead) =>
          lead.status === "viewing_arranged"
      ).length,

      negotiating: leads.filter(
        (lead) =>
          lead.status === "negotiating"
      ).length,

      coWork: leads.filter(
        (lead) =>
          lead.enquiry_type === "co_work"
      ).length,

      followUps: leads.filter(
        (lead) => {
          if (
            !lead.next_follow_up_at ||
            ["won", "lost"].includes(
              lead.status
            )
          ) {
            return false;
          }

          const followUpDate =
            new Date(
              lead.next_follow_up_at
            );

          return (
            followUpDate <= endToday
          );
        }
      ).length,

      won: leads.filter(
        (lead) =>
          lead.status === "won"
      ).length,

      open: leads.filter(
        (lead) =>
          !["won", "lost"].includes(
            lead.status
          )
      ).length,
    };
  }, [properties, leads]);

  const propertyMap =
    useMemo(() => {
      const map: Record<
        string,
        Property
      > = {};

      properties.forEach(
        (property) => {
          map[property.id] =
            property;
        }
      );

      return map;
    }, [properties]);

  const visibleProperties =
    useMemo(() => {
      const search =
        query
          .trim()
          .toLowerCase();

      const sorted = [
        ...properties,
      ].sort((a, b) => {
        if (
          a.status === "pending" &&
          b.status !== "pending"
        ) {
          return -1;
        }

        if (
          a.status !== "pending" &&
          b.status === "pending"
        ) {
          return 1;
        }

        return (
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
        );
      });

      if (!search) {
        return sorted.slice(
          0,
          10
        );
      }

      return sorted
        .filter((property) =>
          [
            property.title,
            property.project_name,
            property.location,
            property.district,
            property.province,
            property.property_type,
            property.status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(search)
        )
        .slice(0, 20);
    }, [properties, query]);

  const recentLeads =
    leads.slice(0, 5);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F3EFE5] px-6 py-12 text-[#1F2E28]">
        <div className="mx-auto max-w-7xl">

          <div className="h-12 w-72 animate-pulse rounded-xl bg-[#DDD6C3]" />

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map(
              (item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-2xl bg-[#E5DFD2]"
                />
              )
            )}
          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F3EFE5] text-[#1F2E28]">

      {/* HEADER */}

      <section className="border-b border-[#3C4B44] bg-[#1F2E28] text-[#F7F3E9]">

        <div className="mx-auto max-w-7xl px-6 py-12">

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">

            <div>

              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#C99A58]">
                BaanNest Management
              </p>

              <h1 className="mt-2 font-display text-4xl md:text-5xl">
                Command Center
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#C9D1CB]">
                Manage marketplace inventory,
                listing approvals, incoming
                property leads, co-work requests
                and follow-ups from one workspace.
              </p>

            </div>

            <div className="flex flex-wrap gap-2.5">

              <Link
                href="/admin/deals"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white transition hover:bg-white/15"
              >
                <BadgeDollarSign
                  size={15}
                />

                Deals
              </Link>

              <Link
                href="/enquiries"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white transition hover:bg-white/15"
              >
                <Inbox
                  size={15}
                />

                Open Lead CRM
              </Link>

              <Link
                href="/list-property"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#C4924D] px-4 text-xs font-bold text-[#17231E] transition hover:bg-[#D2A45F]"
              >
                <Plus
                  size={15}
                />

                Add property
              </Link>

            </div>

          </div>

          {/* METRICS */}

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

            <DarkMetric
              label="Pending approval"
              value={stats.pending}
              icon={
                <Clock3 size={18} />
              }
            />

            <DarkMetric
              label="Active properties"
              value={stats.active}
              icon={
                <Building2 size={18} />
              }
            />

            <DarkMetric
              label="New leads"
              value={stats.newLeads}
              icon={
                <Inbox size={18} />
              }
            />

            <DarkMetric
              label="Viewings"
              value={stats.viewings}
              icon={
                <CalendarClock size={18} />
              }
            />

            <DarkMetric
              label="Negotiating"
              value={stats.negotiating}
              icon={
                <TrendingUp size={18} />
              }
            />

          </div>

        </div>

      </section>

      {/* CONTENT */}

      <section className="mx-auto max-w-7xl px-6 py-8">

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* PENDING NOTICE */}

        {stats.pending > 0 && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-sm font-bold text-amber-900">
                {stats.pending}{" "}
                listing
                {stats.pending === 1
                  ? ""
                  : "s"}{" "}
                waiting for approval
              </p>

              <p className="mt-1 text-xs text-amber-800/80">
                Review the pending
                properties below,
                then approve or
                reject them.
              </p>

            </div>

            <span className="w-fit rounded-full bg-amber-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-900">
              Action required
            </span>

          </div>
        )}

        {/* QUICK CARDS */}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <QuickCard
            href="/enquiries?type=co_work"
            label="Co-work requests"
            value={stats.coWork}
            icon={
              <Handshake size={19} />
            }
          />

          <QuickCard
            href="/enquiries"
            label="Open leads"
            value={stats.open}
            icon={
              <BriefcaseBusiness
                size={19}
              />
            }
          />

          <QuickCard
            href="/enquiries"
            label="Follow-ups due"
            value={stats.followUps}
            icon={
              <Clock3 size={19} />
            }
          />

          <QuickCard
            href="/enquiries?status=won"
            label="Won leads"
            value={stats.won}
            icon={
              <CheckCircle2
                size={19}
              />
            }
          />

        </div>

        {/* LEADS + WORKFLOW */}

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">

          {/* RECENT ENQUIRIES */}

          <section className="overflow-hidden rounded-[1.6rem] border border-[#DDD5C5] bg-white">

            <div className="flex items-center justify-between border-b border-[#EEE8DC] px-5 py-4">

              <div>

                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A16F32]">
                  Lead pipeline
                </p>

                <h2 className="mt-1 font-display text-2xl">
                  Recent enquiries
                </h2>

              </div>

              <Link
                href="/enquiries"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#657169] hover:text-[#A16F32]"
              >
                View CRM

                <ArrowRight
                  size={14}
                />
              </Link>

            </div>

            {recentLeads.length === 0 ? (

              <div className="px-5 py-12 text-center text-sm text-[#6D7770]">
                No leads yet.
                New enquiries and
                co-work requests
                will appear here.
              </div>

            ) : (

              <div className="divide-y divide-[#EEE8DC]">

                {recentLeads.map(
                  (lead) => {
                    const property =
                      propertyMap[
                        lead.property_id
                      ];

                    return (
                      <Link
                        key={lead.id}
                        href="/enquiries"
                        className="flex items-center gap-4 px-5 py-4 transition hover:bg-[#FBF9F4]"
                      >

                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            lead.enquiry_type ===
                            "co_work"
                              ? "bg-[#E8F0EA] text-[#315A42]"
                              : "bg-[#F2EEE3] text-[#A16F32]"
                          }`}
                        >

                          {lead.enquiry_type ===
                          "co_work" ? (
                            <Handshake
                              size={17}
                            />
                          ) : (
                            <Inbox
                              size={17}
                            />
                          )}

                        </span>

                        <span className="min-w-0 flex-1">

                          <span className="block truncate text-sm font-bold">
                            {property?.title ||
                              "Property enquiry"}
                          </span>

                          <span className="mt-0.5 block truncate text-xs text-[#778078]">

                            {lead.seeker_name}

                            {" · "}

                            {lead.enquiry_type ===
                            "co_work"
                              ? "Co-work"
                              : pretty(
                                  lead.status
                                )}

                          </span>

                        </span>

                        <span className="shrink-0 text-[10px] text-[#929991]">
                          {formatShort(
                            lead.created_at
                          )}
                        </span>

                      </Link>
                    );
                  }
                )}

              </div>

            )}

          </section>

          {/* WORKFLOW */}

          <section className="rounded-[1.6rem] border border-[#DDD5C5] bg-[#ECE6D8] p-5">

            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A16F32]">
              Workflow
            </p>

            <h2 className="mt-1 font-display text-2xl">
              BaanNest brokerage
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#637068]">
              BaanNest remains the intermediary
              between the enquirer and the
              property lister. Private contact
              information stays inside the
              admin workflow.
            </p>

            <div className="mt-5 space-y-2">

              {[
                [
                  "1",
                  "Review listing",
                  "Approve new submissions before they become public.",
                ],

                [
                  "2",
                  "Receive enquiry",
                  "Customer or external agent contacts BaanNest.",
                ],

                [
                  "3",
                  "Arrange viewing",
                  "Coordinate both sides and track the appointment.",
                ],

                [
                  "4",
                  "Close the lead",
                  "Move the opportunity to Won or Lost.",
                ],
              ].map(
                ([
                  number,
                  title,
                  description,
                ]) => (
                  <div
                    key={number}
                    className="flex gap-3 rounded-xl border border-[#D8D0BE] bg-white/65 p-3.5"
                  >

                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1F2E28] text-[10px] font-bold text-white">
                      {number}
                    </span>

                    <div>

                      <p className="text-xs font-bold">
                        {title}
                      </p>

                      <p className="mt-0.5 text-[11px] leading-5 text-[#748078]">
                        {description}
                      </p>

                    </div>

                  </div>
                )
              )}

            </div>

          </section>

        </div>

        {/* PROPERTY INVENTORY */}

        <section className="mt-8 overflow-hidden rounded-[1.6rem] border border-[#DDD5C5] bg-white">

          <div className="flex flex-col gap-4 border-b border-[#EEE8DC] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A16F32]">
                Marketplace inventory
              </p>

              <h2 className="mt-1 font-display text-2xl">
                Properties
              </h2>

              <p className="mt-1 text-xs text-[#778078]">
                Pending listings
                are shown first.
              </p>

            </div>

            <label className="flex h-10 items-center gap-2 rounded-xl border border-[#D8D0BE] bg-[#FBFAF6] px-3 sm:w-72">

              <Search
                size={14}
                className="text-[#879087]"
              />

              <input
                value={query}
                onChange={(event) =>
                  setQuery(
                    event.target.value
                  )
                }
                placeholder="Search inventory"
                className="min-w-0 flex-1 bg-transparent text-xs outline-none"
              />

            </label>

          </div>

          {visibleProperties.length ===
          0 ? (

            <div className="px-5 py-12 text-center text-sm text-[#6D7770]">
              No properties match
              this search.
            </div>

          ) : (

            <div className="divide-y divide-[#EEE8DC]">

              {visibleProperties.map(
                (property) => {
                  const isUpdating =
                    updatingPropertyId ===
                    property.id;

                  const isDeleting =
                    deletingPropertyId ===
                    property.id;

                  return (
                    <div
                      key={property.id}
                      className={`flex flex-col gap-4 px-5 py-4 transition md:flex-row md:items-center ${
                        property.status ===
                        "pending"
                          ? "bg-amber-50/40 hover:bg-amber-50/70"
                          : "hover:bg-[#FBF9F4]"
                      }`}
                    >

                      {/* PROPERTY INFO */}

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#A16F32]">
                            {pretty(
                              property.property_type
                            )}
                          </span>

                          <span
                            className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${statusBadgeClass(
                              property.status
                            )}`}
                          >
                            {pretty(
                              property.status
                            )}
                          </span>

                          <span className="rounded-full bg-[#F2EEE3] px-2 py-1 text-[9px] font-bold uppercase text-[#657169]">

                            {property.listing_type ===
                            "both"
                              ? "Rent & Sale"
                              : pretty(
                                  property.listing_type
                                )}

                          </span>

                        </div>

                        <p className="mt-2 truncate text-sm font-bold">
                          {property.title}
                        </p>

                        <p className="mt-1 truncate text-xs text-[#778078]">

                          {[
                            property.project_name,
                            property.district,
                            property.province,
                          ]
                            .filter(Boolean)
                            .join(" · ") ||
                            property.location ||
                            "Thailand"}

                        </p>

                      </div>

                      {/* PRICE + CONTROLS */}

                      <div className="flex flex-col gap-3 md:items-end">

                        <div className="text-left md:text-right">

                          {property.listing_type ===
                          "both" ? (
                            <>

                              <p className="text-xs font-bold">

                                ฿
                                {Number(
                                  property.rent_price ??
                                    property.price
                                ).toLocaleString()}

                                {" "}

                                <span className="font-normal text-[#7B847E]">
                                  /mo
                                </span>

                              </p>

                              <p className="mt-0.5 text-xs font-bold">

                                ฿
                                {Number(
                                  property.sale_price ??
                                    property.price
                                ).toLocaleString()}

                                {" "}sale

                              </p>

                            </>
                          ) : (

                            <p className="text-sm font-bold">

                              ฿
                              {Number(
                                property.listing_type ===
                                "rent"
                                  ? property.rent_price ??
                                      property.price
                                  : property.sale_price ??
                                      property.price
                              ).toLocaleString()}

                              {property.listing_type ===
                                "rent" && (
                                <span className="font-normal text-[#7B847E]">
                                  {" "}
                                  /mo
                                </span>
                              )}

                            </p>

                          )}

                        </div>

                        {/* ACTION BUTTONS */}

                        <div className="flex flex-wrap items-center gap-2 md:justify-end">

                          {/* PENDING */}

                          {property.status ===
                            "pending" && (
                            <>

                              <button
                                type="button"
                                onClick={() =>
                                  void updatePropertyStatus(
                                    property.id,
                                    "active"
                                  )
                                }
                                disabled={
                                  isUpdating ||
                                  isDeleting
                                }
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#315A42] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#274936] disabled:cursor-not-allowed disabled:opacity-50"
                              >

                                <CheckCircle2
                                  size={13}
                                />

                                {isUpdating
                                  ? "Updating..."
                                  : "Approve"}

                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void updatePropertyStatus(
                                    property.id,
                                    "rejected"
                                  )
                                }
                                disabled={
                                  isUpdating ||
                                  isDeleting
                                }
                                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Reject
                              </button>

                            </>
                          )}

                          {/* ACTIVE */}

                          {property.status ===
                            "active" && (
                            <button
                              type="button"
                              onClick={() =>
                                void updatePropertyStatus(
                                  property.id,
                                  "paused"
                                )
                              }
                              disabled={
                                isUpdating ||
                                isDeleting
                              }
                              className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >

                              {isUpdating
                                ? "Updating..."
                                : "Pause"}

                            </button>
                          )}

                          {/* PAUSED */}

                          {property.status ===
                            "paused" && (
                            <button
                              type="button"
                              onClick={() =>
                                void updatePropertyStatus(
                                  property.id,
                                  "active"
                                )
                              }
                              disabled={
                                isUpdating ||
                                isDeleting
                              }
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#315A42] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#274936] disabled:cursor-not-allowed disabled:opacity-50"
                            >

                              <CheckCircle2
                                size={13}
                              />

                              {isUpdating
                                ? "Updating..."
                                : "Reactivate"}

                            </button>
                          )}

                          {/* REJECTED */}

                          {property.status ===
                            "rejected" && (
                            <button
                              type="button"
                              onClick={() =>
                                void updatePropertyStatus(
                                  property.id,
                                  "active"
                                )
                              }
                              disabled={
                                isUpdating ||
                                isDeleting
                              }
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#315A42] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#274936] disabled:cursor-not-allowed disabled:opacity-50"
                            >

                              <CheckCircle2
                                size={13}
                              />

                              {isUpdating
                                ? "Updating..."
                                : "Approve"}

                            </button>
                          )}

                          {/* RENTED / SOLD */}

                          {(property.status ===
                            "rented" ||
                            property.status ===
                              "sold") && (
                            <button
                              type="button"
                              onClick={() =>
                                void updatePropertyStatus(
                                  property.id,
                                  "active"
                                )
                              }
                              disabled={
                                isUpdating ||
                                isDeleting
                              }
                              className="rounded-xl border border-[#D8D0BE] bg-white px-3 py-2 text-xs font-bold text-[#56645C] transition hover:border-[#1F2E28] disabled:cursor-not-allowed disabled:opacity-50"
                            >

                              {isUpdating
                                ? "Updating..."
                                : "Reactivate"}

                            </button>
                          )}

                          {/* VIEW */}

                          <Link
                            href={`/properties/${property.id}`}
                            className="rounded-xl border border-[#D8D0BE] px-3 py-2 text-xs font-bold transition hover:border-[#1F2E28]"
                          >
                            View
                          </Link>

                          {/* EDIT */}

                          <Link
                            href={`/admin/properties/${property.id}/edit`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#C9B999] bg-[#F7F3E9] px-3 py-2 text-xs font-bold text-[#6E542E] transition hover:border-[#A16F32] hover:bg-[#F2E8D7]"
                          >

                            <Pencil
                              size={13}
                            />

                            Edit

                          </Link>

                          {/* DELETE */}

                          <button
                            type="button"
                            onClick={() =>
                              void deleteProperty(
                                property
                              )
                            }
                            disabled={
                              isDeleting ||
                              isUpdating
                            }
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >

                            <Trash2
                              size={13}
                            />

                            {isDeleting
                              ? "Deleting..."
                              : "Delete"}

                          </button>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

          {/* PROPERTY SUMMARY */}

          <div className="flex items-center justify-between border-t border-[#EEE8DC] bg-[#FBFAF6] px-5 py-4">

            <p className="text-xs text-[#7B847E]">

              {properties.length} properties total

              {" · "}

              {stats.pending} pending

              {" · "}

              {stats.active} active

            </p>

            <Link
              href="/properties"
              className="inline-flex items-center gap-1.5 text-xs font-bold hover:text-[#A16F32]"
            >

              Marketplace

              <ArrowRight
                size={14}
              />

            </Link>

          </div>

        </section>

      </section>

      <footer className="mt-10 border-t border-[#DDD5C5]">

        <div className="mx-auto max-w-7xl px-6 py-8 text-xs text-[#788179]">
          © 2026 BaanNest · Admin
        </div>

      </footer>

    </main>
  );
}

function DarkMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">

      <div className="flex items-center justify-between">

        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#AEBAB3]">
          {label}
        </p>

        <span className="text-[#D0A260]">
          {icon}
        </span>

      </div>

      <p className="mt-2 font-display text-3xl text-white">
        {value}
      </p>

    </div>
  );
}

function QuickCard({
  href,
  label,
  value,
  icon,
}: {
  href: string;
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-[#DDD5C5] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#C9B999] hover:shadow-[0_10px_30px_rgba(31,46,40,0.06)]"
    >

      <div className="flex items-center justify-between">

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F2EEE3] text-[#A16F32]">
          {icon}
        </span>

        <ArrowRight
          size={15}
          className="text-[#9AA19B] transition group-hover:translate-x-0.5"
        />

      </div>

      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7B847E]">
        {label}
      </p>

      <p className="mt-1 font-display text-3xl">
        {value}
      </p>

    </Link>
  );
}

function statusBadgeClass(
  status: string
) {
  switch (status) {
    case "active":
      return "bg-[#EEF6EF] text-[#39704A]";

    case "pending":
      return "bg-amber-100 text-amber-800";

    case "paused":
      return "bg-[#F5E8D5] text-[#8A602C]";

    case "rejected":
      return "bg-red-50 text-red-700";

    case "rented":
    case "sold":
      return "bg-blue-50 text-blue-700";

    default:
      return "bg-[#F1F1EE] text-[#707870]";
  }
}

function pretty(
  value: string
) {
  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function formatShort(
  value: string
) {
  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? value
    : date.toLocaleDateString(
        "en-GB",
        {
          day: "numeric",
          month: "short",
        }
      );
}