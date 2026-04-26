-- Helper RPC for client-side consent toggles. Inserts a row into the
-- service-role-only `user_consents` audit table on behalf of the
-- authenticated user, after verifying the kind is valid.
--
-- Why an RPC: `user_consents` has no client RLS policies (audit
-- integrity), so a plain insert from the client would be denied.
-- This SECURITY DEFINER function bridges that gap while still
-- requiring an authenticated session.

create or replace function public.record_consent_audit(
  p_kind text,
  p_granted boolean,
  p_pp_version text
) returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if p_kind not in ('tos','ai','print','marketing') then
    raise exception 'invalid consent kind: %', p_kind;
  end if;
  insert into public.user_consents (user_id, kind, granted, pp_version)
  values (auth.uid(), p_kind, p_granted, p_pp_version);
end;
$$;

-- Grant execute to authenticated only — anon and service-role both
-- have other paths.
revoke all on function public.record_consent_audit(text, boolean, text) from public;
grant execute on function public.record_consent_audit(text, boolean, text) to authenticated;
