import {
  createClient,
  type SupabaseClient,
} from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { jsonError } from './errors.ts';

export interface AuthContext {
  userId: string;
  jwt: string;
  supabaseAdmin: SupabaseClient;
}

// Module-level admin client — env vars don't change at runtime, so creating a
// fresh client per request was pure overhead. A missing env at cold start
// fails fast here rather than silently producing broken 500s per request.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabaseAdmin: SupabaseClient | null =
  SUPABASE_URL && SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

/**
 * Validates the Authorization: Bearer <jwt> header and returns a user-scoped
 * AuthContext. On failure returns a ready-to-send 401 Response — callers
 * should `if (ctx instanceof Response) return ctx;` and then use ctx.
 */
export async function requireUser(
  req: Request,
): Promise<AuthContext | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonError(401, 'unauthorized', 'Missing bearer token');
  }
  const jwt = authHeader.slice('Bearer '.length).trim();
  if (!jwt) {
    return jsonError(401, 'unauthorized', 'Empty bearer token');
  }

  if (!supabaseAdmin) {
    return jsonError(500, 'server_misconfigured', 'Missing Supabase env');
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(jwt);
  if (error || !user) {
    return jsonError(401, 'unauthorized', 'Invalid or expired token');
  }

  return { userId: user.id, jwt, supabaseAdmin };
}
