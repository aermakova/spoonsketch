import { supabase } from './client';

export class ApiError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function signUp(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw new ApiError(error.message, error.code);
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new ApiError(error.message, error.code);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  // "Auth session missing" means the user is already signed out — not an error.
  if (error && !error.message.toLowerCase().includes('missing')) {
    throw new ApiError(error.message, error.code);
  }
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new ApiError(error.message, error.code);
  return data.session;
}
