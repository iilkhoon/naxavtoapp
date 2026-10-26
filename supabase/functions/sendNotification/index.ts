import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function isValidExpoToken(token: string): boolean {
  return typeof token === 'string' && (
    token.startsWith('ExpoPushToken') || token.startsWith('ExponentPushToken')
  );
}

interface RequestBody { title?: string; body?: string; sound?: string }

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Only admins may broadcast. The token is verified by Supabase Auth (getUser),
// not just decoded: a decoded payload can be forged, and any signed-up user is
// "authenticated", so role === 'authenticated' alone let anyone spam every device.
async function requireAdmin(req: Request): Promise<Response | null> {
  const unauthorized = (status: number, error: string) =>
    new Response(JSON.stringify({ error }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  const authHeader = req.headers.get('Authorization') || '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!jwt) return unauthorized(401, 'Unauthorized');

  const { data: userData, error: userError } = await adminClient.auth.getUser(jwt);
  if (userError || !userData?.user) return unauthorized(401, 'Invalid token');

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role, is_superadmin')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!profile || (profile.role !== 'admin' && !profile.is_superadmin)) {
    return unauthorized(403, 'Admins only');
  }
  return null;
}

console.info('sendNotification v12 started (Unlimited Pagination & Duplicate Filter)');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authError = await requireAdmin(req);
    if (authError) return authError;

    let payload: RequestBody;
    try {
      payload = await req.json();
    } catch (_) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const title = (payload.title ?? '').toString();
    const body = (payload.body ?? '').toString();
    const sound = payload.sound || 'default';

    if (!title || !body) {
      return new Response(JSON.stringify({ error: 'Missing title or body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch ALL tokens using pagination (bypassing PostgREST 1000 row default limit)
    let allRawTokens: string[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: rows, error: tokensError } = await adminClient
        .from('push_tokens')
        .select('token')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (tokensError) {
        console.error('Error fetching tokens page', page, JSON.stringify(tokensError));
        break;
      }

      if (!rows || rows.length === 0) {
        hasMore = false;
      } else {
        const tokens = rows.map((r: { token: string }) => r.token).filter(isValidExpoToken);
        allRawTokens.push(...tokens);

        if (rows.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
    }

    // Deduplicate tokens so each device only receives 1 notification per send
    const validTokens: string[] = Array.from(new Set(allRawTokens));

    if (validTokens.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: 'No valid tokens found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const chunks = chunkArray(validTokens, 100);
    let sentCount = 0;
    const tokensToDelete: string[] = [];

    for (const chunk of chunks) {
      const messages = chunk.map((token) => ({
        to: token,
        title,
        body,
        sound,
        priority: 'high',
        channelId: 'default',
        _displayInForeground: true
      }));

      const resp = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate'
        },
        body: JSON.stringify(messages),
      });

      if (!resp.ok) {
        console.error('Expo API error', resp.status, await resp.text().catch(() => ''));
        continue;
      }

      const respJson = await resp.json().catch(() => ({ data: [] }));
      const tickets = respJson.data ?? [];

      for (let i = 0; i < tickets.length; i++) {
        if (tickets[i]?.status === 'ok') {
          sentCount += 1;
        } else if (tickets[i]?.details?.error === 'DeviceNotRegistered') {
          tokensToDelete.push(chunk[i]);
        } else if (tickets[i]?.status === 'error') {
          console.error('[Expo Ticket Error]', tickets[i]?.message, tickets[i]?.details);
        }
      }
    }

    // Remove unregistered expired tokens from database
    if (tokensToDelete.length > 0) {
      await adminClient.from('push_tokens').delete().in('token', tokensToDelete);
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount, totalTokens: validTokens.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('Internal Server Error', e);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
