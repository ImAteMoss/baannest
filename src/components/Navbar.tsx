// src/components/Navbar.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthModal } from "@/components/auth/AuthProvider";

type Role =
  | "client"
  | "owner"
  | "external_agent"
  | "baannest_agent"
  | "admin";

type Profile = {
  full_name: string;
  role: Role;
};

export default function Navbar() {
  const pathname = usePathname();
  const supabase = createClient();
  const { openAuth } = useAuthModal();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const lastScrollY = useRef(0);

  const isHome = pathname === "/";

  // --------------------------------------------------
  // LOAD CURRENT USER
  // --------------------------------------------------

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setProfile(null);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name,role")
        .eq("id", user.id)
        .single();

      if (mounted && data) {
        setProfile(data as Profile);
      }
    }

    loadProfile();

    const { data: authListener } =
      supabase.auth.onAuthStateChange(() => {
        loadProfile();
      });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // --------------------------------------------------
  // NAVBAR SCROLL BEHAVIOUR
  // --------------------------------------------------

  useEffect(() => {
    // Homepage navbar always remains visible.
    if (isHome) {
      setVisible(true);
      return;
    }

    function handleScroll() {
      const currentY = window.scrollY;

      if (currentY < 30) {
        setVisible(true);
      } else if (currentY > lastScrollY.current + 8) {
        setVisible(false);
        setOpen(false);
      } else if (currentY < lastScrollY.current - 8) {
        setVisible(true);
      }

      lastScrollY.current = currentY;
    }

    lastScrollY.current = window.scrollY;

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  // Close menus when page changes.
  useEffect(() => {
    setMobileOpen(false);
    setOpen(false);
  }, [pathname]);

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  function displayName() {
    if (!profile?.full_name) return "My Account";

    return profile.full_name.split(" ")[0];
  }

  function dashboardHref() {
    if (!profile) return "/profile";

    if (profile.role === "admin") {
      return "/admin";
    }

    if (
      profile.role === "baannest_agent" ||
      profile.role === "external_agent"
    ) {
      return "/agent";
    }

    if (profile.role === "owner") {
      return "/my-properties";
    }

    return "/profile";
  }

  function dashboardLabel() {
    if (!profile) return "My Account";

    if (profile.role === "owner") {
      return "My Listings";
    }

    if (profile.role === "client") {
      return "My Enquiries";
    }

    return "Dashboard";
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function openLogin() {
    setMobileOpen(false);
    setOpen(false);
    openAuth("login");
  }

  function openRegister() {
    setMobileOpen(false);
    setOpen(false);
    openAuth("register");
  }

  const shellClass = isHome
    ? "bg-white/10 text-white backdrop-blur-xl border-white/20"
    : "bg-[#F2EEE3]/95 text-[#1F2E28] backdrop-blur-xl border-[#DDD6C3]/80";

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <>
      <header
        className={`fixed left-0 right-0 top-0 z-50 px-4 pt-4 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:px-6 ${
          visible
            ? "translate-y-0"
            : "-translate-y-[130%]"
        }`}
      >
        <nav
          className={`mx-auto max-w-7xl rounded-2xl border shadow-[0_12px_40px_rgba(31,46,40,0.12)] transition-[background-color,border-color,box-shadow] duration-500 ${shellClass}`}
        >
          <div className="flex h-[68px] items-center justify-between px-4 md:px-6">
            {/* LOGO */}

            <Link
              href="/"
              className={`font-display text-2xl tracking-tight ${
                isHome
                  ? "text-white"
                  : "text-[#1F2E28]"
              }`}
            >
              BaanNest
            </Link>

            {/* DESKTOP NAVIGATION */}

            <div className="hidden items-center gap-7 md:flex">
              <Link
                href="/"
                className="text-sm font-medium transition hover:text-[#B8863F]"
              >
                Home
              </Link>

              <Link
                href="/properties"
                className="text-sm font-medium transition hover:text-[#B8863F]"
              >
                Properties
              </Link>

              <Link
                href="/properties?listing=rent"
                className="text-sm font-medium transition hover:text-[#B8863F]"
              >
                Rent
              </Link>

              <Link
                href="/properties?listing=sale"
                className="text-sm font-medium transition hover:text-[#B8863F]"
              >
                Buy
              </Link>

              <Link
                href="/list-property"
                className="text-sm font-medium transition hover:text-[#B8863F]"
              >
                List Property
              </Link>

              <Link
                href="/about"
                className="text-sm font-medium transition hover:text-[#B8863F]"
              >
                About
              </Link>
            </div>

            {/* DESKTOP ACCOUNT AREA */}

            <div className="hidden md:block">
              {profile ? (
                <div className="relative">
                  {/* ACCOUNT BUTTON */}

                  <button
                    type="button"
                    onClick={() =>
                      setOpen((value) => !value)
                    }
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-all duration-200 active:scale-[0.98] ${
                      isHome
                        ? "border-white/20 bg-white/10 hover:bg-white/20"
                        : "border-[#DDD6C3] bg-white hover:border-[#B8863F]"
                    }`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1F2E28] text-sm font-semibold text-white">
                      {displayName()
                        .charAt(0)
                        .toUpperCase()}
                    </span>

                    <span className="min-w-0">
                      <span className="block max-w-28 truncate text-sm font-semibold">
                        {displayName()}
                      </span>

                      <span
                        className={`block text-[11px] ${
                          isHome
                            ? "text-white/70"
                            : "text-[#7A817A]"
                        }`}
                      >
                        My account
                      </span>
                    </span>

                    <span className={`text-xs opacity-70 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}>▼</span>
                  </button>

                  {/* ACCOUNT DROPDOWN */}

                  <div
                    className={`absolute right-0 mt-3 w-64 origin-top-right overflow-hidden rounded-2xl border border-[#DDD6C3] bg-white p-2 text-[#1F2E28] shadow-2xl transition-all duration-200 ease-out ${
                      open
                        ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                        : "pointer-events-none -translate-y-2 scale-[0.97] opacity-0"
                    }`}
                    aria-hidden={!open}
                  >
                      <div className="border-b border-[#EEE9DB] px-3 py-3">
                        <p className="text-xs uppercase tracking-widest text-[#B8863F]">
                          Account
                        </p>

                        <p className="mt-1 truncate text-sm font-semibold">
                          {profile.full_name ||
                            "BaanNest Member"}
                        </p>
                      </div>

                      {/* DASHBOARD / LISTINGS */}

                      {profile.role !== "client" && (
                        <Link
                          href={dashboardHref()}
                          className="mt-2 block rounded-xl px-3 py-3 text-sm transition hover:bg-[#F2EEE3]"
                        >
                          <span className="font-medium">
                            {dashboardLabel()}
                          </span>

                          <span className="mt-0.5 block text-xs text-[#7A817A]">
                            Manage your BaanNest activity
                          </span>
                        </Link>
                      )}

                      {["client", "baannest_agent", "admin"].includes(profile.role) && (
                        <Link
                          href="/enquiries"
                          className="block rounded-xl px-3 py-3 text-sm transition hover:bg-[#F2EEE3]"
                        >
                          <span className="font-medium">{["baannest_agent", "admin"].includes(profile.role) ? "Lead CRM" : "My Enquiries"}</span>
                          <span className="mt-0.5 block text-xs text-[#7A817A]">
                            {["baannest_agent", "admin"].includes(profile.role) ? "Manage BaanNest property leads" : "Track your property enquiries"}
                          </span>
                        </Link>
                      )}

                      {/* PROFILE */}

                      <Link
                        href="/profile"
                        className="block rounded-xl px-3 py-3 text-sm transition hover:bg-[#F2EEE3]"
                      >
                        <span className="font-medium">
                          Profile & Settings
                        </span>

                        <span className="mt-0.5 block text-xs text-[#7A817A]">
                          Personal and account details
                        </span>
                      </Link>

                      {/* CONTACT */}

                      <Link
                        href="/contact"
                        className="block rounded-xl px-3 py-3 text-sm transition hover:bg-[#F2EEE3]"
                      >
                        <span className="font-medium">
                          Contact BaanNest
                        </span>

                        <span className="mt-0.5 block text-xs text-[#7A817A]">
                          Talk to our team
                        </span>
                      </Link>

                      {/* LIST PROPERTY */}

                      {(profile.role === "owner" ||
                        profile.role ===
                          "external_agent" ||
                        profile.role ===
                          "baannest_agent") && (
                        <Link
                          href="/list-property"
                          className="block rounded-xl px-3 py-3 text-sm transition hover:bg-[#F2EEE3]"
                        >
                          <span className="font-medium">
                            Add Property
                          </span>

                          <span className="mt-0.5 block text-xs text-[#7A817A]">
                            Create a new listing
                          </span>
                        </Link>
                      )}

                      {/* LOG OUT */}

                      <div className="mt-1 border-t border-[#EEE9DB] pt-1">
                        <button
                          type="button"
                          onClick={signOut}
                          className="w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                        >
                          Log Out
                        </button>
                      </div>
                    </div>
                </div>
              ) : (
                /* LOGGED OUT */

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openLogin}
                    className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                      isHome
                        ? "text-white hover:bg-white/10"
                        : "text-[#1F2E28] hover:bg-white"
                    }`}
                  >
                    Log in
                  </button>

                  <button
                    type="button"
                    onClick={openRegister}
                    className="rounded-xl bg-[#B8863F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#9F7135]"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>

            {/* MOBILE MENU BUTTON */}

            <button
              type="button"
              onClick={() =>
                setMobileOpen((value) => !value)
              }
              className={`flex h-11 w-11 items-center justify-center rounded-xl border md:hidden ${
                isHome
                  ? "border-white/20"
                  : "border-[#DDD6C3]"
              }`}
              aria-label="Open menu"
            >
              <span className={`text-lg transition-transform duration-300 ${mobileOpen ? "rotate-90" : "rotate-0"}`}>
                {mobileOpen ? "×" : "☰"}
              </span>
            </button>
          </div>

          {/* MOBILE MENU */}

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out md:hidden ${
              mobileOpen ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className={`border-t px-4 pb-4 pt-3 ${
                  isHome ? "border-white/15" : "border-[#DDD6C3]"
                }`}
              >
              <div className="grid gap-1">
                <Link
                  href="/"
                  className="rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-white/10"
                >
                  Home
                </Link>

                <Link
                  href="/properties"
                  className="rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-white/10"
                >
                  Properties
                </Link>

                <Link
                  href="/properties?listing=rent"
                  className="rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-white/10"
                >
                  Rent
                </Link>

                <Link
                  href="/properties?listing=sale"
                  className="rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-white/10"
                >
                  Buy
                </Link>

                <Link
                  href="/list-property"
                  className="rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-white/10"
                >
                  List Property
                </Link>

                <Link
                  href="/about"
                  className="rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-white/10"
                >
                  About
                </Link>

                {/* MOBILE ACCOUNT */}

                {profile ? (
                  <>
                    <div
                      className={`my-2 border-t ${
                        isHome
                          ? "border-white/15"
                          : "border-[#DDD6C3]"
                      }`}
                    />

                    <div className="px-3 py-2">
                      <p className="text-xs uppercase tracking-widest opacity-60">
                        Signed in as
                      </p>

                      <p className="mt-1 font-semibold">
                        {profile.full_name ||
                          "BaanNest Member"}
                      </p>
                    </div>

                    {profile.role !== "client" && (
                      <Link
                        href={dashboardHref()}
                        className="rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-white/10"
                      >
                        {dashboardLabel()}
                      </Link>
                    )}

                    {["client", "baannest_agent", "admin"].includes(profile.role) && (
                      <Link
                        href="/enquiries"
                        className="rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-white/10"
                      >
                        {["baannest_agent", "admin"].includes(profile.role) ? "Lead CRM" : "My Enquiries"}
                      </Link>
                    )}

                    <Link
                      href="/profile"
                      className="rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-white/10"
                    >
                      Profile & Settings
                    </Link>

                    <Link
                      href="/contact"
                      className="rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-white/10"
                    >
                      Contact BaanNest
                    </Link>

                    <button
                      type="button"
                      onClick={signOut}
                      className="rounded-xl px-3 py-3 text-left text-sm font-medium text-red-500 transition hover:bg-red-50/10"
                    >
                      Log Out
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className={`my-2 border-t ${
                        isHome
                          ? "border-white/15"
                          : "border-[#DDD6C3]"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={openLogin}
                      className={`rounded-xl px-3 py-3 text-center text-sm font-semibold transition ${
                        isHome
                          ? "border border-white/20 bg-white/10 text-white"
                          : "border border-[#DDD6C3] bg-white text-[#1F2E28]"
                      }`}
                    >
                      Log in
                    </button>

                    <button
                      type="button"
                      onClick={openRegister}
                      className="mt-1 rounded-xl bg-[#B8863F] px-3 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#9F7135]"
                    >
                      Create account
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        </nav>
      </header>

      {!isHome && (
        <div
          className="h-[100px]"
          aria-hidden="true"
        />
      )}
    </>
  );
}