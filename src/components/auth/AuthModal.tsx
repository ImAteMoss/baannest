"use client";

import { useState } from "react";
import { Building2, Eye, EyeOff, House, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "register";
type RegisterRole = "client" | "owner" | "external_agent";

type Props = {
  mode: Mode;
  setMode: (mode: Mode) => void;
  close: () => void;
  visible: boolean;
};

const inputClass =
  "mt-2 w-full rounded-2xl border border-[#D6CEBC] bg-white px-4 py-3.5 text-[15px] text-[#17251F] shadow-[0_1px_0_rgba(31,46,40,0.03)] outline-none transition-all duration-200 placeholder:text-[#8A918C] hover:border-[#B9AE98] focus:border-[#B8863F] focus:ring-4 focus:ring-[#B8863F]/10";
const labelClass = "text-sm font-semibold text-[#26372F]";

const NATIONALITIES = [
  "Thai",
  "Afghan",
  "Albanian",
  "Algerian",
  "American",
  "Argentine",
  "Australian",
  "Austrian",
  "Bangladeshi",
  "Belgian",
  "Brazilian",
  "British",
  "Cambodian",
  "Canadian",
  "Chinese",
  "Colombian",
  "Danish",
  "Dutch",
  "Egyptian",
  "Filipino",
  "Finnish",
  "French",
  "German",
  "Greek",
  "Hong Kong",
  "Indian",
  "Indonesian",
  "Irish",
  "Israeli",
  "Italian",
  "Japanese",
  "Korean",
  "Laotian",
  "Malaysian",
  "Mexican",
  "Myanmar",
  "Nepalese",
  "New Zealander",
  "Norwegian",
  "Pakistani",
  "Portuguese",
  "Russian",
  "Singaporean",
  "South African",
  "Spanish",
  "Sri Lankan",
  "Swedish",
  "Swiss",
  "Taiwanese",
  "Turkish",
  "Ukrainian",
  "Vietnamese",
  "Other",
] as const;



function normalizeThaiPhone(value: string) {
  return value.replace(/[^\d]/g, "").slice(0, 10);
}

function formatThaiPhone(value: string) {
  const digits = normalizeThaiPhone(value);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function isValidThaiPhone(value: string) {
  const digits = normalizeThaiPhone(value);

  // Thai mobile numbers are 10 digits and normally begin 06, 08, or 09.
  return /^0[689]\d{8}$/.test(digits);
}

export default function AuthModal({ mode, setMode, close, visible }: Props) {
  const supabase = createClient();
  const [role, setRole] = useState<RegisterRole>("client");
  const [fullName, setFullName] = useState("");
  const [nationality, setNationality] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [contentKey, setContentKey] = useState(0);

  function switchMode(nextMode: Mode) {
    setMessage("");
    setSuccess(false);
    setMode(nextMode);
    setContentKey((value) => value + 1);
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setSuccess(false);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    close();
    window.setTimeout(() => window.location.reload(), 260);
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);

    if (!fullName.trim() || !nationality.trim() || !phone.trim() || !lineId.trim() || !email.trim() || !password) {
      setMessage("Please complete all required fields.");
      return;
    }
    if (!isValidThaiPhone(phone)) {
      setMessage("Please enter a valid Thai mobile number, for example 081-234-5678.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          nationality: nationality.trim(),
          phone: phone.trim(),
          line_id: lineId.trim(),
          role,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setSuccess(true);
    setMessage("Account created successfully. You can now log in.");
    window.setTimeout(() => switchMode("login"), 1200);
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto px-3 py-4 transition-all duration-300 sm:px-6 sm:py-8 ${
        visible ? "bg-[#07100C]/65 backdrop-blur-[10px] opacity-100" : "bg-[#07100C]/0 backdrop-blur-none opacity-0"
      }`}
      onMouseDown={(event) => event.target === event.currentTarget && close()}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`relative my-auto w-full max-w-[590px] overflow-hidden rounded-[28px] border border-white/50 bg-[#F7F3E9] shadow-[0_30px_100px_rgba(0,0,0,0.38)] transition-all duration-300 ease-out sm:rounded-[32px] ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-5 scale-[0.975] opacity-0"
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/55 to-transparent" />

        <button
          type="button"
          onClick={close}
          className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-[#D9D1BF] bg-[#FFFDF8]/90 text-[#26372F] shadow-sm transition-all duration-200 hover:rotate-90 hover:border-[#B8863F] hover:bg-white hover:text-[#B8863F] active:scale-90 sm:right-5 sm:top-5"
          aria-label="Close"
        >
          <X size={19} />
        </button>

        <div className="relative max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain px-5 py-7 scrollbar-thin sm:max-h-[88vh] sm:px-9 sm:py-9">
          <div key={`${mode}-${contentKey}`} className="animate-[authContent_.35s_ease-out]">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#A96F27]">BaanNest</p>

            {mode === "login" ? (
              <>
                <h2 className="mt-4 font-display text-[2.35rem] leading-tight tracking-tight text-[#17251F] sm:text-[2.65rem]">Welcome back.</h2>
                <p className="mt-2 max-w-md text-[15px] leading-6 text-[#5F6D65]">Sign in to save homes, contact listings and manage your BaanNest account.</p>

                <form onSubmit={handleLogin} className="mt-8 space-y-5">
                  <Field label="Email">
                    <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
                  </Field>

                  <Field label="Password">
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className={`${inputClass} pr-12`} />
                      <PasswordToggle show={showPassword} toggle={() => setShowPassword((v) => !v)} />
                    </div>
                  </Field>

                  {message && <StatusMessage success={false}>{message}</StatusMessage>}

                  <button type="submit" disabled={loading} className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1F2E28] px-5 py-4 text-sm font-bold text-white shadow-[0_10px_28px_rgba(31,46,40,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2B4037] hover:shadow-[0_14px_34px_rgba(31,46,40,0.24)] active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60">
                    {loading ? "Signing in..." : <>Log in <span className="transition-transform duration-200 group-hover:translate-x-1">→</span></>}
                  </button>
                </form>

                <div className="mt-7 border-t border-[#DDD6C3] pt-6 text-center">
                  <p className="text-sm text-[#657169]">New to BaanNest? <button type="button" onClick={() => switchMode("register")} className="font-bold text-[#1F2E28] decoration-[#B8863F] decoration-2 underline-offset-4 transition hover:text-[#A96F27] hover:underline">Create an account</button></p>
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-4 font-display text-[2.35rem] leading-tight tracking-tight text-[#17251F] sm:text-[2.65rem]">Join BaanNest.</h2>
                <p className="mt-2 text-[15px] leading-6 text-[#5F6D65]">Create your account and choose how you&apos;ll use BaanNest.</p>

                <form onSubmit={handleRegister} className="mt-7 space-y-5">
                  <div>
                    <label className={labelClass}>I am a</label>
                    <div className="mt-2.5 grid grid-cols-3 gap-2.5">
                      <RoleButton
                        active={role === "client"}
                        onClick={() => setRole("client")}
                        icon={<Search size={20} />}
                        title="Seeker"
                        description="I want to rent or buy a property"
                      />
                      <RoleButton
                        active={role === "owner"}
                        onClick={() => setRole("owner")}
                        icon={<House size={20} />}
                        title="Owner"
                        description="I want to list property I own"
                      />
                      <RoleButton
                        active={role === "external_agent"}
                        onClick={() => setRole("external_agent")}
                        icon={<Building2 size={20} />}
                        title="Agent"
                        description="I list properties for clients"
                      />
                    </div>
                  </div>

                  <Field label="Full name"><input type="text" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className={inputClass} /></Field>
                  <Field label="Nationality">
                    <div className="relative">
                      <select
                        required
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                        className={`${inputClass} appearance-none pr-11 ${nationality ? "text-[#17251F]" : "text-[#8A918C]"}`}
                      >
                        <option value="" disabled>
                          Select your nationality
                        </option>
                        {NATIONALITIES.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        aria-hidden="true"
                        className="pointer-events-none absolute right-4 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-[#66736B]"
                      >
                        <path
                          d="m6 8 4 4 4-4"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Phone">
                      <div className="relative">
                        <input
                          type="tel"
                          required
                          inputMode="numeric"
                          autoComplete="tel"
                          value={formatThaiPhone(phone)}
                          onChange={(e) => setPhone(normalizeThaiPhone(e.target.value))}
                          placeholder="081-234-5678"
                          maxLength={12}
                          aria-invalid={phone.length > 0 && !isValidThaiPhone(phone)}
                          className={`${inputClass} pr-10 ${
                            phone.length > 0
                              ? isValidThaiPhone(phone)
                                ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/10"
                                : "border-rose-400 focus:border-rose-500 focus:ring-rose-500/10"
                              : ""
                          }`}
                        />
                        {phone.length > 0 && (
                          <span
                            className={`pointer-events-none absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-sm font-bold ${
                              isValidThaiPhone(phone) ? "text-emerald-600" : "text-rose-500"
                            }`}
                            aria-hidden="true"
                          >
                            {isValidThaiPhone(phone) ? "✓" : "!"}
                          </span>
                        )}
                      </div>
                      <p
                        className={`mt-1.5 text-[11px] leading-4 ${
                          phone.length > 0 && !isValidThaiPhone(phone)
                            ? "font-semibold text-[#B42318]"
                            : "font-medium text-[#5F6D65]"
                        }`}
                      >
                        {phone.length > 0 && !isValidThaiPhone(phone)
                          ? "Please enter a valid Thai mobile number starting with 06, 08, or 09."
                          : "Thai mobile number · no OTP or SMS charge"}
                      </p>
                    </Field>
                    <Field label="LINE ID"><input type="text" required value={lineId} onChange={(e) => setLineId(e.target.value)} placeholder="Your LINE ID" className={inputClass} /></Field>
                  </div>

                  <Field label="Email"><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} /></Field>
                  <Field label="Password">
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className={`${inputClass} pr-12`} />
                      <PasswordToggle show={showPassword} toggle={() => setShowPassword((v) => !v)} />
                    </div>
                  </Field>

                  {message && <StatusMessage success={success}>{message}</StatusMessage>}

                  <button type="submit" disabled={loading} className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1F2E28] px-5 py-4 text-sm font-bold text-white shadow-[0_10px_28px_rgba(31,46,40,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2B4037] hover:shadow-[0_14px_34px_rgba(31,46,40,0.24)] active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60">
                    {loading ? "Creating account..." : <>Create account <span className="transition-transform duration-200 group-hover:translate-x-1">→</span></>}
                  </button>
                </form>

                <div className="mt-7 border-t border-[#DDD6C3] pt-6 text-center">
                  <p className="text-sm text-[#657169]">Already registered? <button type="button" onClick={() => switchMode("login")} className="font-bold text-[#1F2E28] decoration-[#B8863F] decoration-2 underline-offset-4 transition hover:text-[#A96F27] hover:underline">Log in</button></p>
                </div>
              </>
            )}
          </div>
        </div>

        <style jsx global>{`
          @keyframes authContent {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className={labelClass}>{label}</label>{children}</div>;
}

function PasswordToggle({ show, toggle }: { show: boolean; toggle: () => void }) {
  return (
    <button type="button" onClick={toggle} className="absolute right-2.5 top-[calc(50%+4px)] -translate-y-1/2 rounded-xl p-2 text-[#657169] transition hover:bg-[#F1EBDD] hover:text-[#1F2E28] active:scale-90" aria-label={show ? "Hide password" : "Show password"}>
      {show ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}

function StatusMessage({ success, children }: { success: boolean; children: React.ReactNode }) {
  return <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>{children}</div>;
}

function RoleButton({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group relative flex min-h-[132px] flex-col items-center justify-center rounded-2xl border px-3 py-4 text-center transition-all duration-200 active:scale-[0.97] ${
        active
          ? "-translate-y-0.5 border-[#B8863F] bg-[#F5E8D5] text-[#17251F] shadow-[0_8px_22px_rgba(184,134,63,0.12)]"
          : "border-[#D9D1BF] bg-white text-[#66736B] hover:-translate-y-0.5 hover:border-[#B9AE98] hover:text-[#26372F] hover:shadow-sm"
      }`}
    >
      <span
        className={`transition-transform duration-200 group-hover:scale-110 ${
          active ? "text-[#A96F27]" : ""
        }`}
      >
        {icon}
      </span>
      <span className="mt-2 text-sm font-bold">{title}</span>
      <span
        className={`mt-1.5 max-w-[145px] text-[11px] leading-[1.35] ${
          active ? "text-[#5E665F]" : "text-[#7B857F]"
        }`}
      >
        {description}
      </span>
      {active && (
        <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-[#B8863F]" />
      )}
    </button>
  );
}
