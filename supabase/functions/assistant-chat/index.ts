// Tenant-isolated AI assistant for restaurant menus.
// Receives { messages, menu, restaurantName } and returns { reply }.
// Uses the Lovable AI gateway — no extra secrets needed.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Msg = { role: "user" | "assistant"; content: string };
type MenuItem = { id: string; name: string; description?: string | null; price: number };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, menu, restaurantName } = (await req.json()) as {
      messages?: Msg[];
      menu?: MenuItem[];
      restaurantName?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const compactMenu = (menu ?? [])
      .slice(0, 200)
      .map((m) => `- ${m.name}${m.description ? ` (${m.description})` : ""} — $${Number(m.price).toFixed(2)}`)
      .join("\n");

    const systemPrompt = [
      `You are a friendly assistant for "${restaurantName ?? "this restaurant"}".`,
      "Only answer using the menu below. If asked about anything not on the menu, politely say it's not available here.",
      "Be concise (2-3 short sentences). Suggest items when helpful. Never invent prices.",
      "",
      "MENU:",
      compactMenu || "(no items)",
    ].join("\n");

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ reply: "I'm getting too many requests right now. Please try again in a moment." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ reply: "AI credits are exhausted. Please contact the restaurant." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: t }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const reply: string = data?.choices?.[0]?.message?.content ?? "Sorry, I have no answer.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});