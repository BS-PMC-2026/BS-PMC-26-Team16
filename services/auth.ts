import { createClient } from "../lib/supabase/client";

// הרשמה
export async function signUpUser(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  return { data, error };
}

// התחברות
export async function signInUser(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

// התנתקות
export async function signOutUser() {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();

  return { error };
}

// משתמש נוכחי
export async function getCurrentUser() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.getUser();

  return { data, error };
}

// איפוס סיסמה
export async function resetPasswordForEmail(email: string, redirectTo: string) {
  const supabase = createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  return { error };
}