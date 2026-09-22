import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async () => {
  const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const { data, error } = await client.from('messages').select('telegram_user_id, telegram_chat_id, telegram_message_id, direction, text, sent_at, clients!inner(first_name, username)').order('sent_at', { ascending: false });
  if (error) return Response.json({ error: 'Could not load messages.' }, { status: 500 });
  return Response.json((data ?? []).map((row) => ({
    telegramUserId: Number(row.telegram_user_id), chatId: Number(row.telegram_chat_id), messageId: Number(row.telegram_message_id),
    firstName: row.clients.first_name, username: row.clients.username, direction: row.direction, text: row.text, sentAt: row.sent_at,
  })));
});
