import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = (await req.json()) as { orderId?: string };
    if (!orderId || typeof orderId !== "string") {
      return json({ error: "Missing orderId" }, 400);
    }

    // Use the service-role client so we can read the notification payload
    // (the helper is locked down — only service role can call it).
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .rpc("get_order_notification_payload", { _order_id: orderId })
      .maybeSingle();

    if (error) {
      return json({ error: `Lookup failed: ${error.message}` }, 500);
    }
    if (!data) {
      return json({ error: "Order not found" }, 404);
    }

    const {
      order_number,
      status,
      customer_name,
      customer_whatsapp,
      restaurant_name,
      table_number,
    } = data as {
      order_number: number;
      status: string;
      customer_name: string;
      customer_whatsapp: string;
      restaurant_name: string;
      table_number: string;
    };

    if (status !== "ready") {
      return json({ skipped: true, reason: `Order is "${status}", not "ready"` });
    }

    // Sanitize WhatsApp number to E.164 (digits + leading +)
    const digits = (customer_whatsapp || "").replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 20) {
      return json({ skipped: true, reason: "Invalid WhatsApp number on order" });
    }
    const toNumber = `+${digits}`;

    // Read Twilio credentials. If not configured yet, skip silently —
    // the in-page + browser push notifications still alert the customer.
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM");

    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !TWILIO_WHATSAPP_FROM) {
      return json({
        skipped: true,
        reason: "Twilio not configured. Connect Twilio + set TWILIO_WHATSAPP_FROM to enable WhatsApp alerts.",
      });
    }

    const fromDigits = TWILIO_WHATSAPP_FROM.replace(/\D/g, "");
    const fromAddr = `whatsapp:+${fromDigits}`;
    const toAddr = `whatsapp:${toNumber}`;

    const body =
      `Hi ${customer_name || "there"} 👋\n\n` +
      `Your order #${order_number}` +
      (table_number ? ` (Table ${table_number})` : "") +
      ` at ${restaurant_name} is *READY* 🍽️\n\n` +
      `Please collect it from the counter or wait for staff to bring it over.`;

    const params = new URLSearchParams({
      To: toAddr,
      From: fromAddr,
      Body: body,
    });

    const resp = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const result = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      console.error("Twilio error", resp.status, result);
      return json({ error: `Twilio ${resp.status}`, details: result }, 502);
    }

    return json({ sent: true, sid: result?.sid ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("notify-order-ready failed", msg);
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}