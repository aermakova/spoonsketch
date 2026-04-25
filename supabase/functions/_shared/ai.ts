import Anthropic from 'npm:@anthropic-ai/sdk@0.30.1';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
});

export const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

export type AiJobType = 'url_extract' | 'image_extract' | 'pdf_extract' | 'auto_sticker';
export type AiJobStatus = 'done' | 'failed';

export interface LogAiJobParams {
  supabaseAdmin: SupabaseClient;
  userId: string;
  jobType: AiJobType;
  status: AiJobStatus;
  input?: unknown;
  output?: unknown;
  tokensUsed?: number;
  model?: string;
  errorMessage?: string;
}

/**
 * Writes a row to `ai_jobs` for every AI call (success or failure) so we have
 * per-user usage counts, cost observability, and a server-side quota source.
 * Logging failures are swallowed — they must never propagate to the user.
 */
export async function logAiJob(params: LogAiJobParams): Promise<void> {
  const { error } = await params.supabaseAdmin.from('ai_jobs').insert({
    user_id: params.userId,
    job_type: params.jobType,
    status: params.status,
    input_data: params.input ?? null,
    output_data: params.output ?? null,
    tokens_used: params.tokensUsed ?? null,
    model: params.model ?? HAIKU_MODEL,
    error_message: params.errorMessage ?? null,
  });
  if (error) {
    console.error('[logAiJob] failed to write ai_jobs row', error);
  }
}
