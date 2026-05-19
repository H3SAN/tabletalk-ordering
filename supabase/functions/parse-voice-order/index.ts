import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  modifiers?: { id: string; name: string; price_delta: number }[];
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, menu } = (await req.json()) as {
      transcript: string;
      menu: MenuItem[];
    };

    if (!transcript || typeof transcript !== "string") {
      return new Response(JSON.stringify({ error: "Missing transcript" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(menu) || menu.length === 0) {
      return new Response(JSON.stringify({ error: "Missing menu" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Compact menu for prompt
    const menuForPrompt = menu.map((m) => ({
      id: m.id,
      name: m.name,
      price: m.price,
      modifiers: (m.modifiers ?? []).map((x) => ({ id: x.id, name: x.name })),
    }));

    const systemPrompt = `You are a restaurant order parser. The customer is dictating an order in natural speech.
Match what they say to items from the provided menu (case-insensitive, allow synonyms and plurals).
Only return items that exist in the menu. If something cannot be matched, list it under "unmatched".
Quantities default to 1 unless explicitly stated.
Modifiers must be matched from the item's modifiers list.`;

    const userPrompt = `MENU (JSON):\n${JSON.stringify(menuForPrompt)}\n\nCUSTOMER SAID:\n"${transcript}"`;

    const tools = [
      {
        type: "function",
        function: {
          name: "submit_parsed_order",
          description: "Return parsed cart lines from the customer's speech.",
          parameters: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    menu_item_id: { type: "string" },
                    quantity: { type: "integer", minimum: 1, maximum: 20 },
                    modifier_ids: {
                      type: "array",
                      items: { type: "string" },
                    },
                    special_instructions: { type: "string" },
                  },
                  required: ["menu_item_id", "quantity"],
                  additionalProperties: false,
                },
              },
              unmatched: {
                type: "array",
                items: { type: "string" },
                description: "Phrases the customer said that did not match any menu item",
              },
            },
            required: ["items", "unmatched"],
            additionalProperties: false,
          },
        },
      },
    ];

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools,
          tool_choice: {
            type: "function",
            function: { name: "submit_parsed_order" },
          },
        }),
      },
    );

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, try again shortly." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Add credits in Workspace → Usage.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ items: [], unmatched: [transcript] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    let parsed: { items: unknown[]; unmatched: string[] };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (_e) {
      return new Response(
        JSON.stringify({ items: [], unmatched: [transcript] }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-voice-order error", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});