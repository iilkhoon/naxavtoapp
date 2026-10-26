import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const expoPushUrl = "https://exp.host/--/api/v2/push/send";

serve(async (req) => {
    try {
        const payload = await req.json();
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Re-read the message from the database instead of trusting the request
        // body: this endpoint is public, so a forged payload must not be able to
        // push arbitrary text to devices.
        const { data: record, error: messageError } = await supabase
            .from("messages")
            .select("*")
            .eq("id", payload?.record?.id)
            .maybeSingle();

        if (messageError || !record) {
            return new Response("Message not found", { status: 404 });
        }

        // 1. Get Chat details to find the recipient
        const { data: chat, error: chatError } = await supabase
            .from("chats")
            .select("*")
            .eq("id", record.chat_id)
            .single();

        if (chatError || !chat) {
            console.error("Error fetching chat:", chatError);
            return new Response("Chat not found", { status: 404 });
        }

        let tokens: string[] = [];
        let title = "";
        let body = record.content;

        if (record.sender_type === "user") {
            // Message is FROM user TO admin
            title = "Yeni müraciət var";

            // Only admins' devices. (Any signed-in user has a user_id on their
            // token, so "user_id is not null" leaked customer chats to everyone.)
            const { data: admins } = await supabase
                .from("profiles")
                .select("id")
                .or("role.eq.admin,is_superadmin.eq.true");
            const adminIds = (admins || []).map((a: { id: string }) => a.id);

            if (adminIds.length > 0) {
                const { data: adminTokens } = await supabase
                    .from("push_tokens")
                    .select("token")
                    .in("user_id", adminIds);
                tokens = adminTokens?.map((t: { token: string }) => t.token) || [];
            }
        } else {
            // Message is FROM admin TO user
            title = "Yeni mesajınız var";

            // Fetch tokens for the specific user/device
            if (chat.user_id) {
                const { data: userTokens } = await supabase
                    .from("push_tokens")
                    .select("token")
                    .eq("user_id", chat.user_id);
                tokens = userTokens?.map(t => t.token) || [];
            } else {
                const { data: deviceTokens } = await supabase
                    .from("push_tokens")
                    .select("token")
                    .eq("device_id", chat.device_id);
                tokens = deviceTokens?.map(t => t.token) || [];
            }
        }

        if (tokens.length === 0) {
            return new Response("No tokens found", { status: 200 });
        }

        // 2. Prepare Expo Push Notification
        const messages = tokens.map(token => ({
            to: token,
            sound: "default",
            title: title,
            body: body,
            data: { chatId: record.chat_id },
        }));

        // Chunk messages (Expo accepts up to 100 per request)
        const chunks = [];
        for (let i = 0; i < messages.length; i += 100) {
            chunks.push(messages.slice(i, i + 100));
        }

        const results = await Promise.all(
            chunks.map(chunk =>
                fetch(expoPushUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify(chunk),
                }).then(res => res.json())
            )
        );

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("Function error:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});
