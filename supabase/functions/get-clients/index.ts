import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const { data, error } = await client.from('clients').select('telegram_user_id, first_name, username, last_contact_at').order('last_contact_at', { ascending: false });
  if (error) return Response.json({ error: 'Could not load clients.' }, { status: 500 });
  return Response.json((data ?? []).map((row) => ({
    telegramUserId: Number(row.telegram_user_id), firstName: row.first_name, username: row.username, lastContactAt: row.last_contact_at,
  })));
});
