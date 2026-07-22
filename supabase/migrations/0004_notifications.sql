-- HandLancer in-app notifications: triggers populate the notifications feed
-- on the key events. Each is SECURITY DEFINER so it can write a row for the
-- recipient regardless of who triggered it.

alter table profiles add column if not exists push_token text;

-- New quote → notify the job owner.
create or replace function notify_new_quote()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_title text;
begin
  select owner_id, title into v_owner, v_title from jobs where id = new.job_id;
  insert into notifications (user_id, type, payload)
    values (v_owner, 'quote_received',
      jsonb_build_object('job_id', new.job_id, 'quote_id', new.id, 'title', v_title));
  return new;
end; $$;

create trigger on_quote_created after insert on quotes
  for each row execute function notify_new_quote();

-- Provider hired → notify the provider.
create or replace function notify_hire()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.hired_provider_id is not null
     and new.status = 'in_progress'
     and new.status is distinct from old.status then
    insert into notifications (user_id, type, payload)
      values (new.hired_provider_id, 'hired',
        jsonb_build_object('job_id', new.id, 'title', new.title));
  end if;
  return new;
end; $$;

create trigger on_job_hired after update on jobs
  for each row execute function notify_hire();

-- New message → notify the other participant.
create or replace function notify_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_recipient uuid;
begin
  select case when user_id = new.sender_id then provider_id else user_id end
    into v_recipient from conversations where id = new.conversation_id;
  insert into notifications (user_id, type, payload)
    values (v_recipient, 'message',
      jsonb_build_object('conversation_id', new.conversation_id, 'preview', left(new.body, 80)));
  return new;
end; $$;

create trigger on_message_created after insert on messages
  for each row execute function notify_new_message();

-- New review → notify the provider.
create or replace function notify_new_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, type, payload)
    values (new.provider_id, 'review',
      jsonb_build_object('job_id', new.job_id, 'rating', new.rating));
  return new;
end; $$;

create trigger on_review_created after insert on reviews
  for each row execute function notify_new_review();

-- Funds released / payout → notify the recipient wallet's owner.
create or replace function notify_wallet_credit()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if new.type in ('payout', 'escrow_release') and new.status = 'success' then
    select owner_id into v_owner from wallets where id = new.wallet_id;
    insert into notifications (user_id, type, payload)
      values (v_owner, new.type,
        jsonb_build_object('amount', new.amount, 'job_id', new.job_id));
  end if;
  return new;
end; $$;

create trigger on_wallet_credit after insert on transactions
  for each row execute function notify_wallet_credit();

-- NOTE: enable Realtime for the `notifications` table
-- (Database → Publications → supabase_realtime → add `notifications`).
