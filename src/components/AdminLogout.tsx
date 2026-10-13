"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogout() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;

    setLoading(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("LOGOUT ERROR:", error);
      setLoading(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="group relative flex h-11 items-center overflow-hidden rounded-full border border-[#CFC7B4] bg-[#F2EEE3] px-4 text-[#1F2E28] transition-all duration-300 ease-out hover:border-[#1F2E28] hover:bg-[#1F2E28] hover:px-5 hover:text-[#F2EEE3] hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {/* Icon */}
      <span className="relative z-10 flex items-center justify-center transition-transform duration-500 ease-out group-hover:rotate-[-12deg] group-hover:translate-x-0.5">
        {loading ? (
          <svg
            className="h-[17px] w-[17px] animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke="currentColor"
              strokeWidth="2"
              className="opacity-25"
            />
            <path
              d="M21 12a9 9 0 0 1-9 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg
            className="h-[17px] w-[17px] transition-all duration-500 ease-out group-hover:translate-x-1"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 17l5-5-5-5" />
            <path d="M15 12H3" />
            <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
          </svg>
        )}
      </span>

      {/* Text */}
      <span
        className={`relative z-10 ml-2 whitespace-nowrap text-sm font-medium transition-all duration-300 ease-out ${
          loading
            ? "translate-x-0 opacity-100"
            : "group-hover:translate-x-0.5"
        }`}
      >
        {loading ? "Signing out..." : "Logout"}
      </span>

      {/* Animated background sweep */}
      <span className="absolute inset-0 -translate-x-full bg-[#2D4038] transition-transform duration-500 ease-out group-hover:translate-x-0" />
    </button>
  );
}