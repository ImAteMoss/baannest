"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Download,
  FileSignature,
  Landmark,
  MapPin,
  PawPrint,
  Save,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Deal = {
  id: string;
  deal_number: string | null;
  deal_type: string | null;
  property_type: string | null;
  status: string;
  property_id: string | null;
  is_external_property: boolean | null;
  external_property_name: string | null;
  external_property_address: string | null;
  monthly_rent: number | null;
  security_deposit: number | null;
  advance_rent: number | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  contract_date: string | null;
};

type Party = {
  id: string;
  party_role: string;
  full_name_th: string | null;
  full_name_en: string | null;
  phone: string | null;
  email: string | null;
  id_type: string | null;
  id_number: string | null;
  nationality: string | null;
  address: string | null;
};

type Property = {
  id: string;
  title: string;
  project_name: string | null;
  location: string | null;
  property_type: string | null;
  floor_number: number | null;
  parking_spaces: number | null;
};

type ContractDetails = {
  id?: string;
  deal_id: string;
  template_type: "condo_lease" | "house_lease";
  status: "draft" | "ready" | "generated";
  property_address: string | null;
  project_name: string | null;
  condo_unit_number: string | null;
  condo_floor: string | null;
  condo_building_tower: string | null;
  house_number: string | null;
  village_project: string | null;
  rent_due_day: number | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  pets_allowed: boolean | null;
  pet_conditions: string | null;
  parking_spaces: number | null;
  parking_right_details: string | null;
  utilities_special_terms: string | null;
  early_termination_notice_days: number | null;
  early_termination_conditions: string | null;
  special_conditions: string | null;
};

type FormState = {
  property_address: string;
  project_name: string;
  condo_unit_number: string;
  condo_floor: string;
  condo_building_tower: string;
  house_number: string;
  village_project: string;
  rent_due_day: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  pets_allowed: "" | "yes" | "no";
  pet_conditions: string;
  parking_spaces: string;
  parking_right_details: string;
  utilities_special_terms: string;
  early_termination_notice_days: string;
  early_termination_conditions: string;
  special_conditions: string;
};

const emptyForm: FormState = {
  property_address: "",
  project_name: "",
  condo_unit_number: "",
  condo_floor: "",
  condo_building_tower: "",
  house_number: "",
  village_project: "",
  rent_due_day: "",
  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",
  pets_allowed: "",
  pet_conditions: "",
  parking_spaces: "",
  parking_right_details: "",
  utilities_special_terms: "",
  early_termination_notice_days: "30",
  early_termination_conditions: "",
  special_conditions: "",
};

export default function DealContractPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const dealId = String(params.id || "");

  const [deal, setDeal] = useState<Deal | null>(null);
  const [parties, setParties] = useState<Party[]>([]);
  const [property, setProperty] = useState<Property | null>(null);
  const [details, setDetails] = useState<ContractDetails | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (dealId) void load();
  }, [dealId]);

  async function load() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace(
        `/login?returnTo=${encodeURIComponent(`/admin/deals/${dealId}/contract`)}`
      );
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      router.replace("/properties");
      return;
    }

    const [{ data: dealRow, error: dealError }, { data: partyRows, error: partyError }] =
      await Promise.all([
        supabase
          .from("deals")
          .select(
            "id,deal_number,deal_type,property_type,status,property_id,is_external_property,external_property_name,external_property_address,monthly_rent,security_deposit,advance_rent,lease_start_date,lease_end_date,contract_date"
          )
          .eq("id", dealId)
          .single(),
        supabase
          .from("deal_parties")
          .select(
            "id,party_role,full_name_th,full_name_en,phone,email,id_type,id_number,nationality,address"
          )
          .eq("deal_id", dealId),
      ]);

    if (dealError || !dealRow) {
      setError(dealError?.message || "Deal not found.");
      setLoading(false);
      return;
    }

    if (partyError) {
      setError(partyError.message);
      setLoading(false);
      return;
    }

    const loadedDeal = dealRow as Deal;

    if (
      loadedDeal.deal_type !== "rental" ||
      !["condo", "house", "townhouse"].includes(loadedDeal.property_type || "")
    ) {
      setError(
        "Contract creation is currently available for Rental · Condo, House and Townhouse deals."
      );
      setDeal(loadedDeal);
      setParties((partyRows || []) as Party[]);
      setLoading(false);
      return;
    }

    setDeal(loadedDeal);
    setParties((partyRows || []) as Party[]);

    let loadedProperty: Property | null = null;

    if (loadedDeal.property_id) {
      const { data: propertyRow } = await supabase
        .from("properties")
        .select(
          "id,title,project_name,location,property_type,floor_number,parking_spaces"
        )
        .eq("id", loadedDeal.property_id)
        .maybeSingle();

      loadedProperty = (propertyRow as Property) || null;
      setProperty(loadedProperty);
    }

    const { data: contractRow, error: contractError } = await supabase
      .from("deal_contract_details")
      .select("*")
      .eq("deal_id", dealId)
      .maybeSingle();

    if (contractError) {
      setError(contractError.message);
      setLoading(false);
      return;
    }

    const existing = (contractRow as ContractDetails | null) || null;
    setDetails(existing);

    const templateType =
      loadedDeal.property_type === "condo" ? "condo_lease" : "house_lease";

    if (existing) {
      setForm({
        property_address: existing.property_address || "",
        project_name: existing.project_name || "",
        condo_unit_number: existing.condo_unit_number || "",
        condo_floor: existing.condo_floor || "",
        condo_building_tower: existing.condo_building_tower || "",
        house_number: existing.house_number || "",
        village_project: existing.village_project || "",
        rent_due_day: existing.rent_due_day?.toString() || "",
        bank_name: existing.bank_name || "",
        bank_account_name: existing.bank_account_name || "",
        bank_account_number: existing.bank_account_number || "",
        pets_allowed:
          existing.pets_allowed === true
            ? "yes"
            : existing.pets_allowed === false
              ? "no"
              : "",
        pet_conditions: existing.pet_conditions || "",
        parking_spaces: existing.parking_spaces?.toString() || "",
        parking_right_details: existing.parking_right_details || "",
        utilities_special_terms: existing.utilities_special_terms || "",
        early_termination_notice_days:
          existing.early_termination_notice_days?.toString() || "30",
        early_termination_conditions: existing.early_termination_conditions || "",
        special_conditions: existing.special_conditions || "",
      });
    } else {
      const defaultAddress =
        loadedDeal.is_external_property
          ? loadedDeal.external_property_address || ""
          : loadedProperty?.location || "";

      setForm({
        ...emptyForm,
        property_address: defaultAddress,
        project_name: loadedProperty?.project_name || "",
        condo_floor:
          templateType === "condo_lease" && loadedProperty?.floor_number != null
            ? String(loadedProperty.floor_number)
            : "",
        village_project:
          templateType === "house_lease" ? loadedProperty?.project_name || "" : "",
        parking_spaces:
          loadedProperty?.parking_spaces != null
            ? String(loadedProperty.parking_spaces)
            : "",
      });
    }

    setLoading(false);
  }

  const templateType: "condo_lease" | "house_lease" | null = useMemo(() => {
    if (!deal) return null;
    if (deal.property_type === "condo") return "condo_lease";
    if (["house", "townhouse"].includes(deal.property_type || "")) return "house_lease";
    return null;
  }, [deal]);

  const landlord = parties.find((party) => party.party_role === "landlord");
  const tenant = parties.find((party) => party.party_role === "tenant");

  const readiness = useMemo(() => {
    if (!deal || !templateType) return { ready: false, missing: [] as string[] };

    const missing: string[] = [];

    if (!landlord?.id_number) missing.push("Landlord ID / passport");
    if (!landlord?.address) missing.push("Landlord registered address");
    if (!tenant?.id_number) missing.push("Tenant ID / passport");
    if (!tenant?.nationality) missing.push("Tenant nationality");
    if (!deal.contract_date) missing.push("Contract date");
    if (!deal.monthly_rent) missing.push("Monthly rent");
    if (!deal.lease_start_date) missing.push("Lease start date");
    if (!deal.lease_end_date) missing.push("Lease end date");

    if (!form.property_address.trim()) missing.push("Property address");
    if (!form.rent_due_day) missing.push("Rent due day");
    if (!form.bank_name.trim()) missing.push("Bank name");
    if (!form.bank_account_name.trim()) missing.push("Bank account name");
    if (!form.bank_account_number.trim()) missing.push("Bank account number");
    if (!form.pets_allowed) missing.push("Pet policy");

    if (templateType === "condo_lease") {
      if (!form.condo_unit_number.trim()) missing.push("Condo unit number");
      if (!form.condo_floor.trim()) missing.push("Condo floor");
      if (!form.project_name.trim()) missing.push("Condo / project name");
    }

    return { ready: missing.length === 0, missing };
  }, [deal, templateType, landlord, tenant, form]);

  async function save(status: "draft" | "ready") {
    if (!deal || !templateType) return;

    setMessage("");
    setError("");

    if (status === "ready" && !readiness.ready) {
      setError(
        `Complete these fields first: ${readiness.missing.join(", ")}.`
      );
      return;
    }

    setSaving(true);

    const payload = {
      deal_id: deal.id,
      template_type: templateType,
      status,
      property_address: nullable(form.property_address),
      project_name: nullable(form.project_name),
      condo_unit_number:
        templateType === "condo_lease" ? nullable(form.condo_unit_number) : null,
      condo_floor:
        templateType === "condo_lease" ? nullable(form.condo_floor) : null,
      condo_building_tower:
        templateType === "condo_lease"
          ? nullable(form.condo_building_tower)
          : null,
      house_number:
        templateType === "house_lease" ? nullable(form.house_number) : null,
      village_project:
        templateType === "house_lease" ? nullable(form.village_project) : null,
      rent_due_day: numberOrNull(form.rent_due_day),
      bank_name: nullable(form.bank_name),
      bank_account_name: nullable(form.bank_account_name),
      bank_account_number: nullable(form.bank_account_number),
      pets_allowed:
        form.pets_allowed === "yes"
          ? true
          : form.pets_allowed === "no"
            ? false
            : null,
      pet_conditions: nullable(form.pet_conditions),
      parking_spaces: numberOrNull(form.parking_spaces),
      parking_right_details: nullable(form.parking_right_details),
      utilities_special_terms: nullable(form.utilities_special_terms),
      early_termination_notice_days:
        numberOrNull(form.early_termination_notice_days) ?? 30,
      early_termination_conditions: nullable(form.early_termination_conditions),
      special_conditions: nullable(form.special_conditions),
      updated_at: new Date().toISOString(),
    };

    const { data, error: saveError } = await supabase
      .from("deal_contract_details")
      .upsert(payload, { onConflict: "deal_id" })
      .select("*")
      .single();

    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }

    setDetails(data as ContractDetails);
    setMessage(
      status === "ready"
        ? "Contract information is complete and ready for generation."
        : "Contract draft saved."
    );
    setSaving(false);
  }

  async function generateWordContract() {
    if (!deal || !templateType || !details || !readiness.ready) return;

    if (!['ready', 'generated'].includes(details.status)) {
      setError('Mark the contract ready before generating the Word file.');
      return;
    }

    setGenerating(true);
    setError('');
    setMessage('');

    try {
      const templateUrl =
        templateType === 'condo_lease'
          ? '/contracts/BaanNest-Condo-Lease-Template.docx'
          : '/contracts/BaanNest-House-Lease-Template.docx';

      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error(
          `Could not load the Word template (${response.status}). Check that the template exists in public/contracts.`
        );
      }

      const templateBuffer = await response.arrayBuffer();
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => '',
      });

      const monthlyRent = Math.round(Number(deal.monthly_rent || 0));
      const landlordName = contractPartyName(landlord);
      const tenantName = contractPartyName(tenant);
      const houseAddress = joinHouseAddress(
        form.house_number,
        form.property_address
      );

      const contractData = {
        contract_date: formatDocDate(deal.contract_date),
        landlord_name: landlordName,
        landlord_id: landlord?.id_number || '',
        landlord_address: landlord?.address || '',
        landlord_phone: landlord?.phone || '',
        tenant_name: tenantName,
        tenant_id: tenant?.id_number || '',
        tenant_nationality: tenant?.nationality || '',
        tenant_phone: tenant?.phone || '',

        house_address: houseAddress,
        project_village: form.village_project || form.project_name || '-',

        condo_unit: form.condo_unit_number || '-',
        condo_floor: form.condo_floor || '-',
        condo_building: form.condo_building_tower || '-',
        condo_project: form.project_name || '-',
        property_address: form.property_address || '-',

        lease_term_th: leaseTermText(
          deal.lease_start_date,
          deal.lease_end_date,
          'th'
        ),
        lease_term_en: leaseTermText(
          deal.lease_start_date,
          deal.lease_end_date,
          'en'
        ),
        lease_start: formatDocDate(deal.lease_start_date),
        lease_end: formatDocDate(deal.lease_end_date),

        monthly_rent: formatPlainMoney(monthlyRent),
        monthly_rent_words_th: `${thaiNumberWords(monthlyRent)}บาทถ้วน`,
        monthly_rent_words_en: `${englishNumberWords(monthlyRent)} baht only`,
        rent_due_day: form.rent_due_day || '',
        security_deposit: formatPlainMoney(deal.security_deposit),
        advance_rent: formatPlainMoney(deal.advance_rent),

        utilities_special_terms:
          form.utilities_special_terms.trim() || 'ไม่มี / None',
        pet_allowed_box: form.pets_allowed === 'yes' ? '☒' : '☐',
        pet_not_allowed_box: form.pets_allowed === 'no' ? '☒' : '☐',
        pet_conditions: form.pet_conditions.trim() || '-',
        parking_spaces: form.parking_spaces || '0',
        parking_right_details: form.parking_right_details.trim() || '-',

        termination_days: form.early_termination_notice_days || '30',
        termination_conditions:
          form.early_termination_conditions.trim() || '-',

        bank_name: form.bank_name,
        bank_account_name: form.bank_account_name,
        bank_account_number: form.bank_account_number,
      };

      doc.render(contractData);

      const blob = doc.getZip().generate({
        type: 'blob',
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE',
      });

      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `${safeFileName(
        deal.deal_number || 'BaanNest-Deal'
      )}-${
        templateType === 'condo_lease' ? 'Condo-Lease' : 'House-Lease'
      }.docx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1500);

      const { error: generatedError } = await supabase
        .from('deal_contract_details')
        .update({
          status: 'generated',
          updated_at: new Date().toISOString(),
        })
        .eq('deal_id', deal.id);

      if (generatedError) {
        setMessage(
          'Word contract generated, but BaanNest could not update the generated status.'
        );
      } else {
        setDetails((current) =>
          current ? { ...current, status: 'generated' } : current
        );
        setMessage('Word contract generated successfully.');
      }
    } catch (generationError: any) {
      console.error('CONTRACT GENERATION ERROR:', generationError);
      setError(
        generationError?.message || 'Could not generate the Word contract.'
      );
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F3EFE5] px-6 py-12 text-[#1F2E28]">
        <div className="mx-auto max-w-6xl">
          <div className="h-12 w-80 animate-pulse rounded-xl bg-[#DDD6C3]" />
        </div>
      </main>
    );
  }

  if (!deal || !templateType) {
    return (
      <main className="min-h-screen bg-[#F3EFE5] px-6 py-12 text-[#1F2E28]">
        <div className="mx-auto max-w-3xl rounded-[1.5rem] border border-[#DCD4C2] bg-white p-8">
          <h1 className="font-display text-3xl">Contract unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-red-700">
            {error || "This deal does not have a supported contract template yet."}
          </p>
          <Link
            href={`/admin/deals/${dealId}`}
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold"
          >
            <ArrowLeft size={15} /> Back to Deal
          </Link>
        </div>
      </main>
    );
  }

  const propertyTitle =
    deal.is_external_property
      ? deal.external_property_name || "External property"
      : property?.title || "Property";

  const templateName =
    templateType === "condo_lease"
      ? "Condominium Unit Lease Agreement"
      : deal.property_type === "townhouse"
        ? "House Lease Agreement · Townhouse"
        : "House Lease Agreement";

  return (
    <main className="min-h-screen bg-[#F3EFE5] text-[#1F2E28]">
      <section className="border-b border-[#3C4B44] bg-[#1F2E28] text-white">
        <div className="mx-auto max-w-7xl px-6 py-9">
          <Link
            href={`/admin/deals/${deal.id}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#BFC9C2] hover:text-white"
          >
            <ArrowLeft size={14} /> Deal Workspace
          </Link>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C99A58]">
                {deal.deal_number || "Deal"} · Contract preparation
              </p>
              <h1 className="mt-2 font-display text-4xl">Make Contract</h1>
              <p className="mt-2 text-sm text-[#C9D1CB]">{propertyTitle}</p>
            </div>

            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#BFC9C2]">
                Selected template
              </p>
              <p className="mt-1 text-sm font-bold">{templateName}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-xl border border-[#BFD7C4] bg-[#EDF6EF] px-4 py-3 text-sm font-semibold text-[#315F3E]">
            {message}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
          <div className="space-y-6">
            <Section
              icon={<ShieldCheck size={18} />}
              eyebrow="Already in the deal"
              title="Contract parties & terms"
            >
              <p className="mb-5 text-xs leading-5 text-[#748078]">
                These values come from the Deal. To change them, edit the Deal instead of typing them twice.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <Readonly
                  label="Landlord"
                  value={partyName(landlord) || "Missing"}
                />
                <Readonly
                  label="Tenant"
                  value={partyName(tenant) || "Missing"}
                />
                <Readonly
                  label="Landlord ID / Passport"
                  value={landlord?.id_number || "Missing"}
                />
                <Readonly
                  label="Tenant ID / Passport"
                  value={tenant?.id_number || "Missing"}
                />
                <Readonly
                  label="Tenant nationality"
                  value={tenant?.nationality || "Missing"}
                />
                <Readonly
                  label="Contract date"
                  value={formatDate(deal.contract_date)}
                />
                <Readonly
                  label="Monthly rent"
                  value={money(deal.monthly_rent)}
                />
                <Readonly
                  label="Security deposit"
                  value={money(deal.security_deposit)}
                />
                <Readonly
                  label="Advance rent"
                  value={money(deal.advance_rent)}
                />
                <Readonly
                  label="Lease period"
                  value={`${formatDate(deal.lease_start_date)} → ${formatDate(
                    deal.lease_end_date
                  )}`}
                />
              </div>

              <Link
                href={`/admin/deals/${deal.id}/edit`}
                className="mt-5 inline-flex text-xs font-bold text-[#8A602C] underline underline-offset-4"
              >
                Edit shared Deal information
              </Link>
            </Section>

            <Section
              icon={<Building2 size={18} />}
              eyebrow="Contract details"
              title={
                templateType === "condo_lease"
                  ? "Condominium information"
                  : "House / townhouse information"
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                {templateType === "condo_lease" ? (
                  <>
                    <Field
                      label="Unit number"
                      required
                      value={form.condo_unit_number}
                      onChange={(value) =>
                        setForm({ ...form, condo_unit_number: value })
                      }
                      placeholder="e.g. 1802"
                    />
                    <Field
                      label="Floor"
                      required
                      value={form.condo_floor}
                      onChange={(value) =>
                        setForm({ ...form, condo_floor: value })
                      }
                      placeholder="e.g. 18"
                    />
                    <Field
                      label="Building / Tower"
                      value={form.condo_building_tower}
                      onChange={(value) =>
                        setForm({ ...form, condo_building_tower: value })
                      }
                      placeholder="e.g. Tower A"
                    />
                    <Field
                      label="Condominium / Project"
                      required
                      value={form.project_name}
                      onChange={(value) =>
                        setForm({ ...form, project_name: value })
                      }
                      placeholder="Project name"
                    />
                  </>
                ) : (
                  <>
                    <Field
                      label="House number"
                      value={form.house_number}
                      onChange={(value) =>
                        setForm({ ...form, house_number: value })
                      }
                      placeholder="e.g. 111/18"
                    />
                    <Field
                      label="Project / Village"
                      value={form.village_project}
                      onChange={(value) =>
                        setForm({ ...form, village_project: value })
                      }
                      placeholder="Optional"
                    />
                  </>
                )}

                <div className="md:col-span-2">
                  <TextArea
                    label="Property address"
                    required
                    value={form.property_address}
                    onChange={(value) =>
                      setForm({ ...form, property_address: value })
                    }
                    placeholder="Full property address used in the contract"
                    rows={3}
                  />
                </div>
              </div>
            </Section>

            <Section
              icon={<WalletCards size={18} />}
              eyebrow="Payment"
              title="Rent payment instructions"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Rent due day of each month"
                  required
                  type="number"
                  min="1"
                  max="31"
                  value={form.rent_due_day}
                  onChange={(value) =>
                    setForm({ ...form, rent_due_day: value })
                  }
                  placeholder="e.g. 5"
                />
                <div />
                <Field
                  label="Bank"
                  required
                  value={form.bank_name}
                  onChange={(value) => setForm({ ...form, bank_name: value })}
                  placeholder="e.g. Kasikornbank"
                />
                <Field
                  label="Account name"
                  required
                  value={form.bank_account_name}
                  onChange={(value) =>
                    setForm({ ...form, bank_account_name: value })
                  }
                  placeholder="Account holder name"
                />
                <div className="md:col-span-2">
                  <Field
                    label="Account number"
                    required
                    value={form.bank_account_number}
                    onChange={(value) =>
                      setForm({ ...form, bank_account_number: value })
                    }
                    placeholder="Bank account number"
                  />
                </div>
              </div>
            </Section>

            <Section
              icon={<PawPrint size={18} />}
              eyebrow="Conditions"
              title="Pets, parking & additional charges"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <Label required>Pets</Label>
                  <select
                    value={form.pets_allowed}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        pets_allowed: event.target.value as "" | "yes" | "no",
                      })
                    }
                    className={inputClass}
                  >
                    <option value="">Choose pet policy</option>
                    <option value="yes">Allowed</option>
                    <option value="no">Not allowed</option>
                  </select>
                </label>

                <Field
                  label="Parking spaces"
                  type="number"
                  min="0"
                  value={form.parking_spaces}
                  onChange={(value) =>
                    setForm({ ...form, parking_spaces: value })
                  }
                  placeholder="e.g. 1"
                />

                <div className="md:col-span-2">
                  <Field
                    label="Pet conditions"
                    value={form.pet_conditions}
                    onChange={(value) =>
                      setForm({ ...form, pet_conditions: value })
                    }
                    placeholder="Optional conditions"
                  />
                </div>

                {templateType === "condo_lease" && (
                  <div className="md:col-span-2">
                    <Field
                      label="Parking space / right details"
                      value={form.parking_right_details}
                      onChange={(value) =>
                        setForm({ ...form, parking_right_details: value })
                      }
                      placeholder="Parking space number, sticker, right or other details"
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <TextArea
                    label="Utilities / additional charge terms"
                    value={form.utilities_special_terms}
                    onChange={(value) =>
                      setForm({ ...form, utilities_special_terms: value })
                    }
                    placeholder="Leave blank if the standard contract wording applies"
                    rows={3}
                  />
                </div>
              </div>
            </Section>

            <Section
              icon={<FileSignature size={18} />}
              eyebrow="Termination & special terms"
              title="Additional contract conditions"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Early termination notice"
                  type="number"
                  min="0"
                  value={form.early_termination_notice_days}
                  onChange={(value) =>
                    setForm({
                      ...form,
                      early_termination_notice_days: value,
                    })
                  }
                  suffix="days"
                />
                <div />

                <div className="md:col-span-2">
                  <TextArea
                    label="Early termination conditions / charges"
                    value={form.early_termination_conditions}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        early_termination_conditions: value,
                      })
                    }
                    placeholder="Optional"
                    rows={3}
                  />
                </div>

                <div className="md:col-span-2">
                  <TextArea
                    label="Special conditions / notes for this contract"
                    value={form.special_conditions}
                    onChange={(value) =>
                      setForm({ ...form, special_conditions: value })
                    }
                    placeholder="Optional. We will map this carefully before adding it to generated contracts."
                    rows={4}
                  />
                </div>
              </div>
            </Section>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
            <div className="rounded-[1.5rem] border border-[#DCD4C2] bg-white p-6">
              <div className="flex items-center gap-2">
                <FileSignature size={17} className="text-[#A16F32]" />
                <h2 className="font-display text-xl">Contract readiness</h2>
              </div>

              <div className="mt-4 flex items-start gap-3">
                <CheckCircle2
                  size={20}
                  className={
                    readiness.ready ? "text-[#39704A]" : "text-[#A86C45]"
                  }
                />
                <div>
                  <p className="text-sm font-bold">
                    {readiness.ready
                      ? "All required information is ready"
                      : `${readiness.missing.length} item${
                          readiness.missing.length === 1 ? "" : "s"
                        } still needed`}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#748078]">
                    {details?.status === "ready"
                      ? "This contract has been marked ready."
                      : "Save as draft anytime. Mark it ready once required fields are complete."}
                  </p>
                </div>
              </div>

              {!readiness.ready && readiness.missing.length > 0 && (
                <div className="mt-4 rounded-xl bg-[#F7F3EA] p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#8A602C]">
                    Missing
                  </p>
                  <div className="mt-2 space-y-1.5 text-xs text-[#665F52]">
                    {readiness.missing.map((item) => (
                      <p key={item}>• {item}</p>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={saving}
                onClick={() => void save("draft")}
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#D8D0BE] bg-[#FBFAF6] px-4 text-xs font-bold transition hover:border-[#B8863F] disabled:opacity-50"
              >
                <Save size={15} />
                {saving ? "Saving..." : "Save Draft"}
              </button>

              <button
                type="button"
                disabled={saving || !readiness.ready}
                onClick={() => void save("ready")}
                className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1F2E28] px-4 text-xs font-bold text-white transition hover:bg-[#2B4038] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCircle2 size={15} />
                Mark Ready for Generation
              </button>

              <button
                type="button"
                disabled={
                  generating ||
                  !readiness.ready ||
                  !details ||
                  !["ready", "generated"].includes(details.status)
                }
                onClick={() => void generateWordContract()}
                className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#B8863F] px-4 text-xs font-bold text-white transition hover:bg-[#9F7334] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download size={16} />
                {generating
                  ? "Generating Word Contract..."
                  : details?.status === "generated"
                    ? "Generate Word Contract Again"
                    : "Generate Word Contract"}
              </button>
            </div>

            <div className="rounded-[1.5rem] border border-[#DCD4C2] bg-[#ECE6D8] p-6">
              <div className="flex items-center gap-2">
                <Landmark size={16} className="text-[#8A602C]" />
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A602C]">
                  Next stage
                </p>
              </div>
              <p className="mt-3 text-sm font-bold">
                Word contract generation
              </p>
              <p className="mt-2 text-xs leading-5 text-[#6D776F]">
                After this page is working, we will connect these saved values to your actual BaanNest Word templates and generate the completed contract.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[#DCD4C2] bg-white p-6">
              <div className="flex items-center gap-2">
                <UserRound size={16} className="text-[#A16F32]" />
                <h3 className="font-display text-lg">Source information</h3>
              </div>

              <div className="mt-4 space-y-3">
                <Mini label="Template" value={templateName} />
                <Mini
                  label="Property type"
                  value={pretty(deal.property_type || "—")}
                />
                <Mini label="Landlord" value={partyName(landlord) || "Missing"} />
                <Mini label="Tenant" value={partyName(tenant) || "Missing"} />
              </div>
            </div>

            {form.property_address && (
              <div className="rounded-[1.5rem] border border-[#DCD4C2] bg-white p-6">
                <div className="flex items-start gap-2">
                  <MapPin
                    size={16}
                    className="mt-0.5 shrink-0 text-[#A16F32]"
                  />
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#929A94]">
                      Contract property address
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#536159]">
                      {form.property_address}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-[#D8D0BE] bg-white px-3.5 text-sm outline-none transition focus:border-[#B8863F] focus:ring-4 focus:ring-[#B8863F]/10";

function Section({
  icon,
  eyebrow,
  title,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-[#DCD4C2] bg-white p-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-[#A16F32]">{icon}</div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#A16F32]">
            {eyebrow}
          </p>
          <h2 className="mt-1 font-display text-2xl">{title}</h2>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Label({
  children,
  required = false,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="block text-xs font-bold text-[#46544C]">
      {children}
      {required && <span className="ml-1 text-[#A86C45]">*</span>}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = "text",
  min,
  max,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  min?: string;
  max?: string;
  suffix?: string;
}) {
  return (
    <label>
      <Label required={required}>{label}</Label>
      <div className="relative">
        <input
          type={type}
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`${inputClass} ${suffix ? "pr-14" : ""}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-xs font-semibold text-[#7A837D]">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <label>
      <Label required={required}>{label}</Label>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full resize-y rounded-xl border border-[#D8D0BE] bg-white px-3.5 py-3 text-sm leading-6 outline-none transition focus:border-[#B8863F] focus:ring-4 focus:ring-[#B8863F]/10"
      />
    </label>
  );
}

function Readonly({ label, value }: { label: string; value: string }) {
  const missing = value === "Missing" || value === "—";
  return (
    <div className="rounded-xl border border-[#E4DDCF] bg-[#FBFAF6] px-4 py-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#929A94]">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-semibold ${
          missing ? "text-[#A86C45]" : "text-[#1F2E28]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-[#929A94]">
        {label}
      </p>
      <p className="mt-1 text-xs font-semibold leading-5">{value}</p>
    </div>
  );
}

function partyName(party?: Party) {
  if (!party) return "";
  return party.full_name_en || party.full_name_th || "";
}

function nullable(value: string) {
  const clean = value.trim();
  return clean ? clean : null;
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function pretty(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function money(value: number | null | undefined) {
  return value == null ? "—" : `฿${Number(value).toLocaleString()}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function contractPartyName(party?: Party) {
  if (!party) return '';
  const th = party.full_name_th?.trim() || '';
  const en = party.full_name_en?.trim() || '';
  if (th && en && th.toLowerCase() !== en.toLowerCase()) return `${th} / ${en}`;
  return th || en;
}

function joinHouseAddress(houseNumber: string, propertyAddress: string) {
  const number = houseNumber.trim();
  const address = propertyAddress.trim();
  if (!number) return address || '-';
  if (!address) return number;
  if (address.toLowerCase().startsWith(number.toLowerCase())) return address;
  return `${number}, ${address}`;
}

function formatPlainMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return '0';
  return Math.round(Number(value)).toLocaleString('en-US');
}

function formatDocDate(value: string | null | undefined) {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function leaseTermText(
  startValue: string | null | undefined,
  endValue: string | null | undefined,
  language: 'th' | 'en'
) {
  if (!startValue || !endValue) return '';
  const start = new Date(`${startValue.slice(0, 10)}T00:00:00`);
  const end = new Date(`${endValue.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';

  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  months = Math.max(0, months);

  if (months > 0 && months % 12 === 0) {
    const years = months / 12;
    return language === 'th'
      ? `${years} ปี`
      : `${years} ${years === 1 ? 'year' : 'years'}`;
  }

  return language === 'th'
    ? `${months} เดือน`
    : `${months} ${months === 1 ? 'month' : 'months'}`;
}

function englishNumberWords(value: number) {
  const n = Math.max(0, Math.floor(value));
  if (n === 0) return 'Zero';

  const ones = [
    '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen',
  ];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  function underThousand(number: number): string {
    const parts: string[] = [];
    let rest = number;
    if (rest >= 100) {
      parts.push(`${ones[Math.floor(rest / 100)]} hundred`);
      rest %= 100;
    }
    if (rest >= 20) {
      const ten = tens[Math.floor(rest / 10)];
      const one = ones[rest % 10];
      parts.push(one ? `${ten}-${one}` : ten);
    } else if (rest > 0) {
      parts.push(ones[rest]);
    }
    return parts.join(' ');
  }

  const groups = [
    { value: 1_000_000_000_000, name: 'trillion' },
    { value: 1_000_000_000, name: 'billion' },
    { value: 1_000_000, name: 'million' },
    { value: 1_000, name: 'thousand' },
  ];

  let rest = n;
  const parts: string[] = [];
  for (const group of groups) {
    if (rest >= group.value) {
      const count = Math.floor(rest / group.value);
      parts.push(`${underThousand(count)} ${group.name}`);
      rest %= group.value;
    }
  }
  if (rest > 0) parts.push(underThousand(rest));

  const result = parts.join(' ');
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function thaiNumberWords(value: number) {
  const n = Math.max(0, Math.floor(value));
  if (n === 0) return 'ศูนย์';

  const digits = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const places = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

  function underMillion(number: number) {
    const chars = String(number).padStart(6, '0').split('').map(Number);
    let output = '';
    for (let i = 0; i < chars.length; i += 1) {
      const digit = chars[i];
      if (digit === 0) continue;
      const position = chars.length - 1 - i;

      if (position === 1) {
        if (digit === 1) output += 'สิบ';
        else if (digit === 2) output += 'ยี่สิบ';
        else output += `${digits[digit]}สิบ`;
      } else if (position === 0) {
        if (digit === 1 && number % 100 > 10) output += 'เอ็ด';
        else output += digits[digit];
      } else {
        output += `${digits[digit]}${places[position]}`;
      }
    }
    return output;
  }

  function read(number: number): string {
    if (number < 1_000_000) return underMillion(number);
    const millions = Math.floor(number / 1_000_000);
    const remainder = number % 1_000_000;
    return `${read(millions)}ล้าน${remainder ? underMillion(remainder) : ''}`;
  }

  return read(n);
}

function safeFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'BaanNest-Contract';
}
