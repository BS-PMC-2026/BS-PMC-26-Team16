import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, operator, address, total, fast, slow } = body;

    if (!name || !operator || !address || total == null || fast == null || slow == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_type, is_approved")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 403 });
    }

    if (profile.user_type !== "provider" || !profile.is_approved) {
      return NextResponse.json({ error: "Only approved providers can add charging points" }, { status: 403 });
    }

    const { error: insertError } = await supabase
      .from("charging_points")
      .insert({
        name,
        operator,
        address,
        total_chargers: total,
        fast_chargers: fast,
        slow_chargers: slow,
        provider_id: user.id,
        is_approved: false,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
