import type { Profile, UserRole } from '@/services/database.types';
import { supabase } from '@/services/supabase';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Create a new account. With email confirmation disabled, this returns a session. */
export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });
  if (error) throw error;
  return data;
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Create the profile row for a freshly-signed-up user with their chosen role. */
export async function createProfile(input: {
  id: string;
  role: UserRole;
  name: string;
  email?: string | null;
  phone?: string | null;
}) {
  const { error } = await supabase.from('profiles').insert({
    id: input.id,
    role: input.role,
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
  });
  if (error) throw error;
}
