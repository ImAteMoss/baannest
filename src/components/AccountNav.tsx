"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Role =
  | "owner"
  | "external_agent"
  | "baannest_agent"
  | "admin";

export default function AccountNav() {
  const supabase = createClient();

  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccount();
  }, []);

  async function loadAccount() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (data?.role) {
      setRole(data.role as Role);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="h-9 w-24 animate-pulse rounded-full bg-[#DDD6C3]/50" />
    );
  }

  if (!role) {
    return (
      <div className="flex items-center gap-3">
        <a
          href="/login"
          className="text-sm font-medium text-[#1F2E28] transition-colors hover:text-[#B8863F]"
        >
          Agent Login
        </a>

        <a
          href="/register"
          className="rounded-full bg-[#1F2E28] px-5 py-2.5 text-sm font-medium text-[#F2EEE3] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#2D4038] hover:shadow-lg"
        >
          Register
        </a>
      </div>
    );
  }

  if (role === "admin") {
    return (
      <div className="flex items-center gap-3">
        <a
          href="/profile"
          className="text-sm font-medium text-[#5C6B62] transition-colors hover:text-[#1F2E28]"
        >
          Profile
        </a>

        <a
          href="/admin"
          className="rounded-full bg-[#1F2E28] px-5 py-2.5 text-sm font-medium text-[#F2EEE3] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#2D4038] hover:shadow-lg"
        >
          Admin Dashboard
        </a>
      </div>
    );
  }

  if (role === "baannest_agent" || role === "external_agent") {
    return (
      <div className="flex items-center gap-3">
        <a
          href="/profile"
          className="text-sm font-medium text-[#5C6B62] transition-colors hover:text-[#1F2E28]"
        >
          Profile
        </a>

        <a
          href="/agent"
          className="rounded-full bg-[#1F2E28] px-5 py-2.5 text-sm font-medium text-[#F2EEE3] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#2D4038] hover:shadow-lg"
        >
          Agent Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <a
        href="/profile"
        className="text-sm font-medium text-[#5C6B62] transition-colors hover:text-[#1F2E28]"
      >
        Profile
      </a>

      <a
        href="/my-properties"
        className="rounded-full bg-[#1F2E28] px-5 py-2.5 text-sm font-medium text-[#F2EEE3] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#2D4038] hover:shadow-lg"
      >
        My Properties
      </a>
    </div>
  );
}