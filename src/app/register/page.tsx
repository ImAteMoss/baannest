"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RegisterRole = "owner" | "external_agent" | "client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [nationality, setNationality] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RegisterRole>("client");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    if (
      !fullName.trim() ||
      !nationality.trim() ||
      !phone.trim() ||
      !lineId.trim() ||
      !email.trim() ||
      !password ||
      !role
    ) {
      setMessage("Please complete all required fields.");
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
      console.error("REGISTER ERROR:", error);
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setMessage("Account created successfully.");

    setTimeout(() => {
      router.push("/login");
    }, 1500);
  }

  return (
    <main className="min-h-screen bg-[#F2EEE3] text-[#1F2E28]">
      {/* Main */}
      <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-6xl items-center justify-center px-6 py-16">
        <div className="grid w-full items-center gap-14 lg:grid-cols-[0.85fr_1.15fr]">

          {/* Left side */}
          <div className="hidden lg:block">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#B8863F]">
                Welcome to BaanNest
              </p>

              <h1 className="mt-5 font-display text-6xl leading-[0.95] tracking-tight">
                Your next
                <br />
                <span className="text-[#B8863F]">place</span> starts here.
              </h1>

              <p className="mt-7 max-w-md text-base leading-7 text-[#5C6B62]">
                Whether you're looking for a home, listing a property, or
                working as an agent, BaanNest connects you with the right
                people.
              </p>

              <div className="mt-10 flex items-center gap-4">
                <div className="h-px w-16 bg-[#B8863F]" />

                <span className="text-xs uppercase tracking-widest text-[#5C6B62]">
                  Bangkok · Thailand
                </span>
              </div>
            </div>
          </div>

          {/* Registration card */}
          <div>
            <div className="rounded-[2rem] border border-[#DDD6C3] bg-white p-8 shadow-[0_30px_80px_rgba(31,46,40,0.08)] sm:p-10">

              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-[#B8863F]">
                  Create account
                </p>

                <h2 className="mt-3 font-display text-4xl tracking-tight">
                  Join BaanNest
                </h2>

                <p className="mt-3 text-sm leading-6 text-[#5C6B62]">
                  Choose how you'll use BaanNest.
                </p>
              </div>

              <form onSubmit={handleRegister} className="mt-8 space-y-5">

                {/* ROLE */}
                <div>
                  <label className="text-sm font-medium">
                    I am a{" "}
                    <span className="text-[#B8863F]">*</span>
                  </label>

                  <div className="mt-2 grid gap-3 sm:grid-cols-3">

                    {/* Property Seeker */}
                    <button
                      type="button"
                      onClick={() => setRole("client")}
                      className={`rounded-xl border p-4 text-left transition-all duration-200 ${
                        role === "client"
                          ? "border-[#B8863F] bg-[#F8F2E7] shadow-sm"
                          : "border-[#DDD6C3] bg-[#FCFAF5] hover:-translate-y-0.5 hover:border-[#B8B09E]"
                      }`}
                    >
                      <div className="text-xl">🔎</div>

                      <p className="mt-2 text-sm font-medium">
                        Property Seeker
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#7B827C]">
                        Looking to rent or buy
                      </p>
                    </button>

                    {/* Property Owner */}
                    <button
                      type="button"
                      onClick={() => setRole("owner")}
                      className={`rounded-xl border p-4 text-left transition-all duration-200 ${
                        role === "owner"
                          ? "border-[#B8863F] bg-[#F8F2E7] shadow-sm"
                          : "border-[#DDD6C3] bg-[#FCFAF5] hover:-translate-y-0.5 hover:border-[#B8B09E]"
                      }`}
                    >
                      <div className="text-xl">🏠</div>

                      <p className="mt-2 text-sm font-medium">
                        Property Owner
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#7B827C]">
                        Want to list my property
                      </p>
                    </button>

                    {/* External Agent */}
                    <button
                      type="button"
                      onClick={() => setRole("external_agent")}
                      className={`rounded-xl border p-4 text-left transition-all duration-200 ${
                        role === "external_agent"
                          ? "border-[#B8863F] bg-[#F8F2E7] shadow-sm"
                          : "border-[#DDD6C3] bg-[#FCFAF5] hover:-translate-y-0.5 hover:border-[#B8B09E]"
                      }`}
                    >
                      <div className="text-xl">🤝</div>

                      <p className="mt-2 text-sm font-medium">
                        Real Estate Agent
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#7B827C]">
                        Work with BaanNest
                      </p>
                    </button>

                  </div>
                </div>

                {/* FULL NAME */}
                <div>
                  <label className="text-sm font-medium">
                    Full name{" "}
                    <span className="text-[#B8863F]">*</span>
                  </label>

                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="mt-2 w-full rounded-xl border border-[#DDD6C3] bg-[#FCFAF5] px-4 py-3.5 outline-none transition-all duration-200 placeholder:text-[#A6A99F] hover:border-[#B8B09E] focus:border-[#1F2E28] focus:bg-white focus:ring-4 focus:ring-[#1F2E28]/5"
                  />
                </div>

                {/* NATIONALITY */}
                <div>
                  <label className="text-sm font-medium">
                    Nationality{" "}
                    <span className="text-[#B8863F]">*</span>
                  </label>

                  <input
                    type="text"
                    required
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    placeholder="e.g. Thai, British, American"
                    className="mt-2 w-full rounded-xl border border-[#DDD6C3] bg-[#FCFAF5] px-4 py-3.5 outline-none transition-all duration-200 placeholder:text-[#A6A99F] hover:border-[#B8B09E] focus:border-[#1F2E28] focus:bg-white focus:ring-4 focus:ring-[#1F2E28]/5"
                  />
                </div>

                {/* PHONE + LINE */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">
                      Phone{" "}
                      <span className="text-[#B8863F]">*</span>
                    </label>

                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08X-XXX-XXXX"
                      className="mt-2 w-full rounded-xl border border-[#DDD6C3] bg-[#FCFAF5] px-4 py-3.5 outline-none transition-all duration-200 placeholder:text-[#A6A99F] hover:border-[#B8B09E] focus:border-[#1F2E28] focus:bg-white focus:ring-4 focus:ring-[#1F2E28]/5"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      LINE ID{" "}
                      <span className="text-[#B8863F]">*</span>
                    </label>

                    <input
                      type="text"
                      required
                      value={lineId}
                      onChange={(e) => setLineId(e.target.value)}
                      placeholder="Your LINE ID"
                      className="mt-2 w-full rounded-xl border border-[#DDD6C3] bg-[#FCFAF5] px-4 py-3.5 outline-none transition-all duration-200 placeholder:text-[#A6A99F] hover:border-[#B8B09E] focus:border-[#1F2E28] focus:bg-white focus:ring-4 focus:ring-[#1F2E28]/5"
                    />
                  </div>
                </div>

                {/* EMAIL */}
                <div>
                  <label className="text-sm font-medium">
                    Email{" "}
                    <span className="text-[#B8863F]">*</span>
                  </label>

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-2 w-full rounded-xl border border-[#DDD6C3] bg-[#FCFAF5] px-4 py-3.5 outline-none transition-all duration-200 placeholder:text-[#A6A99F] hover:border-[#B8B09E] focus:border-[#1F2E28] focus:bg-white focus:ring-4 focus:ring-[#1F2E28]/5"
                  />
                </div>

                {/* PASSWORD */}
                <div>
                  <label className="text-sm font-medium">
                    Password{" "}
                    <span className="text-[#B8863F]">*</span>
                  </label>

                  <div className="relative mt-2">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-xl border border-[#DDD6C3] bg-[#FCFAF5] px-4 py-3.5 pr-12 outline-none transition-all duration-200 placeholder:text-[#A6A99F] hover:border-[#B8B09E] focus:border-[#1F2E28] focus:bg-white focus:ring-4 focus:ring-[#1F2E28]/5"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#7B827C] transition hover:bg-[#F2EEE3]"
                    >
                      {showPassword ? "◉" : "○"}
                    </button>
                  </div>
                </div>

                {/* MESSAGE */}
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

                {/* SUBMIT */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center rounded-xl bg-[#1F2E28] px-5 py-4 text-sm font-medium text-[#F2EEE3] transition-all duration-200 hover:-translate-y-1 hover:bg-[#2D4038] hover:shadow-[0_12px_30px_rgba(31,46,40,0.22)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#F2EEE3]/30 border-t-[#F2EEE3]" />
                      Creating account...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Create Account
                      <span>→</span>
                    </span>
                  )}
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-[#5C6B62]">
                Already registered?{" "}
                <a
                  href="/login"
                  className="font-medium text-[#1F2E28] underline decoration-[#B8863F] underline-offset-4 hover:text-[#B8863F]"
                >
                  Log in
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}