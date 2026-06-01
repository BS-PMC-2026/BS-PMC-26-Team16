"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 hover:text-white"
    >
      Logout
    </button>
  );
}
