-- Migration 011: RPC-Funktion zum atomaren Credit-Increment (verhindert Race Conditions)
create or replace function public.increment_listing_credits(uid uuid, amount integer)
returns void
language sql
security definer
as $$
  update public.profiles
  set listing_credits = coalesce(listing_credits, 0) + amount
  where id = uid;
$$;
