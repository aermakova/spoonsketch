import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import type { AiJobType } from './ai.ts';

export type Tier = 'free' | 'premium';

export const FREE_MONTHLY_LIMITS: Record<AiJobType, number> = {
  url_extract: 20,
  image_extract: 20,
  auto_sticker: 5,
};

// Minimum seconds between consecutive calls from the same user to the same
// function. Prevents runaway loops if a client has a bug. Not a security
// control — just a guard rail.
export const RATE_LIMIT_WINDOW_SECONDS = 10;

export async function getUserTier(
  supabaseAdmin: SupabaseClient,
  userId: string,
): Promise<Tier> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('tier')
    .eq('id', userId)
    .single();
  if (error || !data) return 'free';
  return data.tier === 'premium' ? 'premium' : 'free';
}

export interface QuotaStatus {
  tier: Tier;
  used: number;
  /** null = unlimited (premium) */
  limit: number | null;
  /** null = unlimited */
  remaining: number | null;
  /** First of next UTC month, ISO */
  resetAt: string;
}

export async function getQuota(
  supabaseAdmin: SupabaseClient,
  userId: string,
  jobType: AiJobType,
): Promise<QuotaStatus> {
  const tier = await getUserTier(supabaseAdmin, userId);
  const monthStart = startOfMonthUtc(new Date());

  const { count, error } = await supabaseAdmin
    .from('ai_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('job_type', jobType)
    .eq('status', 'done')
    .gte('created_at', monthStart.toISOString());

  if (error) throw new Error(`quota lookup failed: ${error.message}`);

  const used = count ?? 0;
  const limit = tier === 'premium' ? null : FREE_MONTHLY_LIMITS[jobType];
  const remaining = limit === null ? null : Math.max(0, limit - used);

  return {
    tier,
    used,
    limit,
    remaining,
    resetAt: startOfNextMonthUtc(new Date()).toISOString(),
  };
}

export interface QuotaExceededPayload {
  error: 'monthly_limit_reached';
  used: number;
  limit: number;
  reset_at: string;
}

/**
 * Returns a structured payload if the quota is exhausted, or null if the
 * caller may proceed. Premium (limit === null) always returns null.
 */
export function checkQuotaAllowed(
  quota: QuotaStatus,
): QuotaExceededPayload | null {
  if (quota.limit === null) return null;
  if (quota.used < quota.limit) return null;
  return {
    error: 'monthly_limit_reached',
    used: quota.used,
    limit: quota.limit,
    reset_at: quota.resetAt,
  };
}

export interface RateLimitAllowed {
  ok: true;
}
export interface RateLimitBlocked {
  ok: false;
  retryAfterSeconds: number;
}

export async function checkRateLimit(
  supabaseAdmin: SupabaseClient,
  userId: string,
  jobType: AiJobType,
): Promise<RateLimitAllowed | RateLimitBlocked> {
  const { data, error } = await supabaseAdmin
    .from('ai_jobs')
    .select('created_at')
    .eq('user_id', userId)
    .eq('job_type', jobType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return { ok: true };

  const lastMs = new Date(data.created_at).getTime();
  const elapsedSeconds = (Date.now() - lastMs) / 1000;
  if (elapsedSeconds >= RATE_LIMIT_WINDOW_SECONDS) return { ok: true };
  return {
    ok: false,
    retryAfterSeconds: Math.ceil(RATE_LIMIT_WINDOW_SECONDS - elapsedSeconds),
  };
}

function startOfMonthUtc(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0),
  );
}
function startOfNextMonthUtc(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
}
