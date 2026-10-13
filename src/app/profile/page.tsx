"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BadgeCheck, ChevronDown, Globe2, LockKeyhole, Mail, Phone, Save, UserRound, RotateCcw, CheckCircle2, AlertCircle, ShieldCheck, KeyRound, ExternalLink } from "lucide-react";

type Profile = {
  full_name: string;
  nationality: string;
  phone: string;
  line_id: string;
  role: string;
};

const NATIONALITIES = ['Thai', 'Afghan', 'Albanian', 'Algerian', 'American', 'Andorran', 'Angolan', 'Antiguan and Barbudan', 'Argentine', 'Armenian', 'Australian', 'Austrian', 'Azerbaijani', 'Bahamian', 'Bahraini', 'Bangladeshi', 'Barbadian', 'Belarusian', 'Belgian', 'Belizean', 'Beninese', 'Bhutanese', 'Bolivian', 'Bosnian and Herzegovinian', 'Botswanan', 'Brazilian', 'British', 'Bruneian', 'Bulgarian', 'Burkinabé', 'Burundian', 'Cambodian', 'Cameroonian', 'Canadian', 'Cape Verdean', 'Central African', 'Chadian', 'Chilean', 'Chinese', 'Colombian', 'Comorian', 'Congolese', 'Costa Rican', 'Croatian', 'Cuban', 'Cypriot', 'Czech', 'Danish', 'Djiboutian', 'Dominican', 'Dutch', 'Ecuadorian', 'Egyptian', 'Emirati', 'Equatorial Guinean', 'Eritrean', 'Estonian', 'Ethiopian', 'Fijian', 'Filipino', 'Finnish', 'French', 'Gabonese', 'Gambian', 'Georgian', 'German', 'Ghanaian', 'Greek', 'Grenadian', 'Guatemalan', 'Guinean', 'Guyanese', 'Haitian', 'Honduran', 'Hungarian', 'Icelandic', 'Indian', 'Indonesian', 'Iranian', 'Iraqi', 'Irish', 'Israeli', 'Italian', 'Ivorian', 'Jamaican', 'Japanese', 'Jordanian', 'Kazakh', 'Kenyan', 'Kuwaiti', 'Kyrgyz', 'Lao', 'Latvian', 'Lebanese', 'Liberian', 'Libyan', 'Liechtensteiner', 'Lithuanian', 'Luxembourgish', 'Malagasy', 'Malawian', 'Malaysian', 'Maldivian', 'Malian', 'Maltese', 'Mauritanian', 'Mauritian', 'Mexican', 'Moldovan', 'Monegasque', 'Mongolian', 'Montenegrin', 'Moroccan', 'Mozambican', 'Myanmar', 'Namibian', 'Nepalese', 'New Zealander', 'Nicaraguan', 'Nigerian', 'North Korean', 'North Macedonian', 'Norwegian', 'Omani', 'Pakistani', 'Palestinian', 'Panamanian', 'Papua New Guinean', 'Paraguayan', 'Peruvian', 'Polish', 'Portuguese', 'Qatari', 'Romanian', 'Russian', 'Rwandan', 'Saudi Arabian', 'Senegalese', 'Serbian', 'Singaporean', 'Slovak', 'Slovenian', 'Somali', 'South African', 'South Korean', 'Spanish', 'Sri Lankan', 'Sudanese', 'Swedish', 'Swiss', 'Syrian', 'Taiwanese', 'Tajik', 'Tanzanian', 'Timorese', 'Togolese', 'Trinidadian and Tobagonian', 'Tunisian', 'Turkish', 'Turkmen', 'Ugandan', 'Ukrainian', 'Uruguayan', 'Uzbek', 'Venezuelan', 'Vietnamese', 'Yemeni', 'Zambian', 'Zimbabwean'];

function isValidPhone(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  if (/^0[689]\d{8}$/.test(compact)) return true;
  return /^\+\d{8,15}$/.test(compact);
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [originalProfile, setOriginalProfile] = useState<Profile | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);

  const [fullName, setFullName] = useState("");
  const [nationality, setNationality] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    setUserEmail(user.email ?? "");

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, nationality, phone, line_id, role")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      console.error("PROFILE ERROR:", error);
      setMessage("Unable to load your profile.");
      setLoading(false);
      return;
    }

    setProfile(data);
    setOriginalProfile(data);

    setFullName(data.full_name);
    setNationality(data.nationality);
    setPhone(data.phone);
    setLineId(data.line_id);

    setLoading(false);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    if (!fullName.trim() || !nationality.trim() || !phone.trim() || !lineId.trim()) {
      setMessage("Please complete all required fields.");
      return;
    }

    if (!isValidPhone(phone)) {
      setMessage("Enter a valid Thai mobile number (06, 08 or 09) or an international number beginning with +.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        nationality: nationality.trim(),
        phone: phone.trim(),
        line_id: lineId.trim(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("UPDATE PROFILE ERROR:", error);
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setSuccess(true);
    setMessage("Profile updated successfully.");

    const savedProfile: Profile = {
      full_name: fullName.trim(),
      nationality: nationality.trim(),
      phone: phone.trim(),
      line_id: lineId.trim(),
      role: profile?.role ?? "",
    };

    setProfile((current) =>
      current
        ? {
            ...current,
            full_name: fullName.trim(),
            nationality: nationality.trim(),
            phone: phone.trim(),
            line_id: lineId.trim(),
          }
        : current
    );
    setOriginalProfile(savedProfile);
    setPhoneTouched(false);

    setSaving(false);
  }

  function handleDiscard() {
    if (!originalProfile) return;
    setFullName(originalProfile.full_name ?? "");
    setNationality(originalProfile.nationality ?? "");
    setPhone(originalProfile.phone ?? "");
    setLineId(originalProfile.line_id ?? "");
    setMessage("");
    setSuccess(false);
    setPhoneTouched(false);
  }

  const phoneHasValue = phone.trim().length > 0;
  const phoneValid = phoneHasValue && isValidPhone(phone);
  const phoneInvalid = phoneTouched && phoneHasValue && !phoneValid;

  const hasChanges = originalProfile
    ? fullName.trim() !== (originalProfile.full_name ?? "").trim() ||
      nationality.trim() !== (originalProfile.nationality ?? "").trim() ||
      phone.trim() !== (originalProfile.phone ?? "").trim() ||
      lineId.trim() !== (originalProfile.line_id ?? "").trim()
    : false;

  const completedFields = [fullName.trim(), nationality.trim(), phone.trim(), lineId.trim(), userEmail.trim()].filter(Boolean).length;
  const profileCompletion = Math.round((completedFields / 5) * 100);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("LOGOUT ERROR:", error);
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  function formatRole(role: string) {
    switch (role) {
      case "admin":
        return "Administrator";
      case "baannest_agent":
        return "BaanNest Agent";
      case "external_agent":
        return "External Agent";
      case "owner":
        return "Property Owner";
      case "seeker":
        return "Property Seeker";
      default:
        return role;
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F2EEE3] text-[#1F2E28]">
        <div className="flex items-center gap-3 text-sm text-[#5C6B62]">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#B8863F]/30 border-t-[#B8863F]" />
          Loading profile...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F2EEE3] text-[#1F2E28]">
      {/* CONTENT */}
      <section className="mx-auto max-w-5xl px-6 py-14">
        <div className="mb-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#B8863F]">BaanNest account</p>
          <h1 className="mt-3 font-display text-5xl tracking-tight">Your Profile</h1>
          <p className="mt-3 max-w-2xl text-[#5C6B62]">Keep your identity and contact details accurate so owners, agents and BaanNest can reach you when needed.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          {/* PROFILE FORM */}
          <div className="rounded-[2rem] border border-[#DDD6C3] bg-white p-8 shadow-[0_20px_60px_rgba(31,46,40,0.06)] sm:p-10">
            <div className="mb-8">
              <h2 className="font-display text-3xl">
                Personal Information
              </h2>

              <p className="mt-2 text-sm text-[#5C6B62]">
                Keep your contact information up to date.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="text-sm font-medium">
                  Full name <span className="text-[#B8863F]">*</span>
                </label>

                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  className="mt-2 w-full rounded-xl border border-[#DDD6C3] bg-[#FCFAF5] px-4 py-3.5 outline-none transition-all duration-300 hover:border-[#B8B09E] focus:-translate-y-0.5 focus:border-[#1F2E28] focus:bg-white focus:ring-4 focus:ring-[#1F2E28]/5"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Nationality <span className="text-[#B8863F]">*</span>
                </label>

                <div className="relative mt-2">
                  <Globe2 size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7B847E]" />
                  <select
                    required
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#DDD6C3] bg-[#FCFAF5] py-3.5 pl-11 pr-11 outline-none transition-all duration-300 hover:border-[#B8B09E] focus:border-[#1F2E28] focus:bg-white focus:ring-4 focus:ring-[#1F2E28]/5"
                  >
                    <option value="" disabled>Select nationality</option>
                    {nationality && !NATIONALITIES.includes(nationality) && <option value={nationality}>{nationality}</option>}
                    {NATIONALITIES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <ChevronDown size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#7B847E]" />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">
                    Phone <span className="text-[#B8863F]">*</span>
                  </label>

                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setPhoneTouched(true);
                      if (message && !success) setMessage("");
                    }}
                    onBlur={() => setPhoneTouched(true)}
                    placeholder="08X-XXX-XXXX or +66..."
                    autoComplete="tel"
                    className={`mt-2 w-full rounded-xl border bg-[#FCFAF5] px-4 py-3.5 outline-none transition-all duration-300 focus:bg-white focus:ring-4 ${
                      phoneInvalid
                        ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                        : phoneTouched && phoneValid
                          ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-100"
                          : "border-[#DDD6C3] hover:border-[#B8B09E] focus:border-[#1F2E28] focus:ring-[#1F2E28]/5"
                    }`}
                  />
                  {phoneInvalid ? (
                    <p className="mt-2 flex items-start gap-1.5 text-[11px] font-semibold leading-5 text-red-600">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      Enter a valid Thai mobile number starting with 06, 08 or 09 (10 digits), or an international number beginning with +.
                    </p>
                  ) : phoneTouched && phoneValid ? (
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle2 size={14} /> Number format looks valid.
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] leading-5 text-[#7A837D]">Thai mobile numbers must begin with 06, 08 or 09. International numbers can begin with +.</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">
                    LINE ID <span className="text-[#B8863F]">*</span>
                  </label>

                  <input
                    type="text"
                    required
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    placeholder="Your LINE ID"
                    autoComplete="off"
                    className="mt-2 w-full rounded-xl border border-[#DDD6C3] bg-[#FCFAF5] px-4 py-3.5 outline-none transition-all duration-300 hover:border-[#B8B09E] focus:border-[#1F2E28] focus:bg-white focus:ring-4 focus:ring-[#1F2E28]/5"
                  />
                  <p className="mt-2 text-[11px] leading-5 text-[#7A837D]">Used as a contact method for property enquiries. This is not your LINE display name.</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Email
                </label>

                <input
                  type="email"
                  value={userEmail}
                  disabled
                  className="mt-2 w-full cursor-not-allowed rounded-xl border border-[#DDD6C3] bg-[#F1EEE6] px-4 py-3.5 text-[#7B827C] outline-none"
                />

                <p className="mt-2 text-xs text-[#8A918B]">
                  Email changes will be handled separately for account
                  security.
                </p>
              </div>

              {message && (
                <div
                  className={
                    success
                      ? "rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
                      : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                  }
                >
                  <div className="flex items-center gap-2">
                    <span>{success ? "✓" : "!"}</span>
                    <span>{message}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-[#EEE8DC] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-[#7A837D]">
                  {hasChanges ? "You have unsaved changes." : "Everything is up to date."}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDiscard}
                    disabled={!hasChanges || saving}
                    className="flex items-center justify-center gap-2 rounded-xl border border-[#D6CEBD] bg-white px-5 py-3.5 text-sm font-bold text-[#536159] transition hover:border-[#9C927D] hover:bg-[#F8F5EE] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RotateCcw size={15}/> Discard
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !hasChanges || phoneInvalid}
                    className="group relative flex min-w-[170px] items-center justify-center overflow-hidden rounded-xl bg-[#1F2E28] px-5 py-3.5 text-sm font-bold text-[#F2EEE3] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#2D4038] hover:shadow-[0_12px_30px_rgba(31,46,40,0.18)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <span className="relative flex items-center gap-2">
                      {saving ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#F2EEE3]/30 border-t-[#F2EEE3]" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16}/> Save changes
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* ACCOUNT CARD */}
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[#DDD6C3] bg-white p-7 shadow-[0_20px_60px_rgba(31,46,40,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B8863F]">
                Account type
              </p>

              <h3 className="mt-3 font-display text-2xl">
                {profile ? formatRole(profile.role) : "Account"}
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#5C6B62]">
                Your account permissions are based on your assigned role.
              </p>
              <div className="mt-5 rounded-xl bg-[#F6F2E8] p-4 text-xs leading-5 text-[#66726A]">
                Role changes are controlled by BaanNest so listing and account permissions stay consistent.
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#DDD6C3] bg-[#1F2E28] p-7 text-[#F7F3E9] shadow-[0_20px_60px_rgba(31,46,40,0.10)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><BadgeCheck size={21}/></div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{profileCompletion}% complete</span>
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-[#D7B273]">Profile quality</p>
              <h3 className="mt-2 font-display text-2xl">{profileCompletion === 100 ? "Contact-ready account" : "Complete your profile"}</h3>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-[#D7B273] transition-all duration-500" style={{ width: `${profileCompletion}%` }} />
              </div>
              <p className="mt-4 text-sm leading-6 text-white/65">Accurate contact details help property enquiries reach the right person without delays.</p>
              <div className="mt-5 space-y-2 text-xs text-white/75">
                <p className="flex items-center gap-2"><LockKeyhole size={14}/> Email protected by your login.</p>
                <p className="flex items-center gap-2"><Phone size={14}/> {phoneValid ? "Phone format checked." : "Phone needs a valid format."}</p>
                <p className="flex items-center gap-2"><Mail size={14}/> {userEmail}</p>
              </div>
            </div>

            {/* LOGOUT */}
            <div className="rounded-[2rem] border border-[#DDD6C3] bg-white p-7 shadow-[0_20px_60px_rgba(31,46,40,0.06)]">
              <p className="text-sm font-medium">
                Account settings
              </p>

              <p className="mt-2 text-sm leading-6 text-[#5C6B62]">
                Security and account access.
              </p>

              <div className="mt-5 space-y-2">
                <a href="/forgot-password" className="flex items-center justify-between rounded-xl border border-[#E2DCCA] bg-[#FCFAF5] px-4 py-3.5 text-sm font-semibold transition hover:border-[#B8863F] hover:bg-[#FFF9ED]">
                  <span className="flex items-center gap-2"><KeyRound size={16}/> Change password</span><ExternalLink size={14}/>
                </a>
                <div className="rounded-xl border border-[#E2DCCA] bg-[#FCFAF5] px-4 py-3.5">
                  <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16}/> Account security</div>
                  <p className="mt-1 text-xs leading-5 text-[#778079]">Email changes and stronger identity verification should use a separate secure flow.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-[#CFC7B4] px-4 py-3.5 text-sm font-medium text-[#1F2E28] transition-all duration-300 hover:border-[#1F2E28] hover:bg-[#1F2E28] hover:text-[#F2EEE3] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                    Signing out...
                  </>
                ) : (
                  <>
                    <span>↪</span>
                    Log out
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}