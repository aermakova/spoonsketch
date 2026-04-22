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

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonError(500, 'server_misconfigured', 'Missing Supabase env');
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(jwt);
  if (error || !user) {
    return jsonError(401, 'unauthorized', 'Invalid or expired token');
  }

  return { userId: user.id, jwt, supabaseAdmin };
}
