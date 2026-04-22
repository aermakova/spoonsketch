import { corsHeaders } from './cors.ts';

export function jsonError(
  status: number,
  code: string,
  message?: string,
  extra?: Record<string, unknown>,
): Response {
  return new Response(
    JSON.stringify({ error: code, message: message ?? code, ...extra }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
