import { createClient } from "../lib/supabase/client";

type UserType = "customer" | "provider" | "admin";

export async function createProfile(profile: {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  id_number: string;
  user_type: UserType;
  request_reason: string;
}) {
  const supabase = createClient();

  const { data, error } = await supabase.from("profiles").insert([
    {
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: profile.phone,
      email: profile.email,
      id_number: profile.id_number,
      user_type: profile.user_type,
      request_reason: profile.request_reason,
      is_approved: false,
    },
  ]);

  return { data, error };
}