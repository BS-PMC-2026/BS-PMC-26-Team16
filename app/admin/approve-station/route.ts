import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { stationId } = await req.json();

    if (!stationId) {
      return NextResponse.json(
        { error: "Missing stationId" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("user_type, is_approved")
      .eq("id", currentUser.id)
      .single();

    if (
      profileError ||
      !currentProfile ||
      currentProfile.user_type !== "admin" ||
      currentProfile.is_approved !== true
    ) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { data: station, error: stationError } = await supabase
      .from("charging_stations")
      .select("id, user_id")
      .eq("id", stationId)
      .single();

    if (stationError || !station) {
      return NextResponse.json(
        { error: stationError?.message ?? "Station request not found" },
        { status: 404 }
      );
    }

    const { error: stationUpdateError } = await supabase
      .from("charging_stations")
      .update({ is_approve: true })
      .eq("id", station.id);

    if (stationUpdateError) {
      return NextResponse.json(
        { error: stationUpdateError.message },
        { status: 500 }
      );
    }

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ user_type: "provider", is_approved: true })
      .eq("id", station.user_id);

    if (profileUpdateError) {
      return NextResponse.json(
        { error: profileUpdateError.message },
        { status: 500 }
      );
    }

    revalidatePath("/admin");
    revalidatePath("/User");
    revalidatePath("/map");

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
