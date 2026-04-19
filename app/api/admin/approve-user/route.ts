import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: currentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("user_type, is_approved")
      .eq("id", currentUser.id)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json(
        { error: "Admin profile not found" },
        { status: 403 }
      );
    }

    if (currentProfile.user_type !== "admin") {
      return NextResponse.json(
        { error: "Only admins can approve users" },
        { status: 403 }
      );
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_approved: true })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
