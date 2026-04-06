import { createClient } from "../lib/supabase/client";

type UserType = "customer" | "provider" | "admin";

type RegisterUserInput = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  password: string;
  id_number: string;
  user_type: UserType;
  request_reason: string;
};

export async function registerUser(input: RegisterUserInput) {
  const supabase = createClient();

  const normalizedEmail = input.email.trim().toLowerCase();

  const { data: existingProfile, error: existingError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingError) {
    return { data: null, error: existingError };
  }

  if (existingProfile) {
    return {
      data: null,
      error: { message: "This email already exists in the system." },
    };
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: input.password,
  });

  if (signUpError) {
    return { data: null, error: signUpError };
  }

  const user = signUpData.user;

  if (!user) {
    return {
      data: null,
      error: { message: "User account was not created correctly." },
    };
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .update({
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      phone: input.phone.trim(),
      id_number: input.id_number.trim(),
      user_type: input.user_type,
      request_reason: input.request_reason.trim(),
      is_approved: false,
    })
    .eq("id", user.id)
    .select()
    .single();

  if (profileError) {
    return { data: null, error: profileError };
  }

  return {
    data: {
      user: signUpData.user,
      session: signUpData.session,
      profile: profileData,
    },
    error: null,
  };
}