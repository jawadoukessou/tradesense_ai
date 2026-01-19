import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") ?? "";
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") ?? "";

const PAYPAL_API_SANDBOX = "https://api-m.sandbox.paypal.com";
const PAYPAL_API_LIVE = "https://api-m.paypal.com";

async function getPayPalAccessToken(apiBaseUrl: string): Promise<string> {
  const auth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);

  const response = await fetch(`${apiBaseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("PayPal auth error:", {
      apiBaseUrl,
      status: response.status,
      body: data,
    });
    throw new Error(
      `PayPal auth failed (${apiBaseUrl}): ${data?.error ?? response.status}`
    );
  }

  return data.access_token;
}

async function getPayPalAccessTokenAuto(): Promise<{
  accessToken: string;
  apiBaseUrl: string;
}> {
  try {
    const accessToken = await getPayPalAccessToken(PAYPAL_API_SANDBOX);
    return { accessToken, apiBaseUrl: PAYPAL_API_SANDBOX };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("Sandbox token failed, trying live...", msg);
  }

  const accessToken = await getPayPalAccessToken(PAYPAL_API_LIVE);
  return { accessToken, apiBaseUrl: PAYPAL_API_LIVE };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      return new Response(JSON.stringify({ error: "Missing PayPal secrets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure caller is authenticated (prevents arbitrary captures)
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseAuthClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { orderId } = await req.json();

    console.log("Capturing PayPal order:", orderId);

    if (!orderId) {
      throw new Error("Missing orderId");
    }

    const { accessToken, apiBaseUrl } = await getPayPalAccessTokenAuto();

    const captureResponse = await fetch(
      `${apiBaseUrl}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const captureData = await captureResponse.json().catch(() => ({}));

    if (!captureResponse.ok) {
      console.error("PayPal capture error:", {
        apiBaseUrl,
        status: captureResponse.status,
        body: captureData,
      });
      throw new Error("Failed to capture PayPal order");
    }

    const customId = captureData.purchase_units?.[0]?.custom_id;

    let userId: string, planName: string, initialCapital: number;
    try {
      const customData = JSON.parse(customId);
      userId = customData.userId;
      planName = customData.planName;
      initialCapital = customData.initialCapital || 5000;
    } catch {
      console.error("Failed to parse custom_id:", customId);
      throw new Error("Invalid order data");
    }

    // Update payment + create challenge (service role)
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { error: paymentError } = await supabaseAdmin
      .from("payments")
      .update({ status: "completed" })
      .eq("transaction_id", orderId);

    if (paymentError) {
      console.error("Error updating payment:", paymentError);
    }

    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from("user_challenges")
      .insert({
        user_id: userId,
        plan_name: planName,
        initial_capital: initialCapital,
        current_balance: initialCapital,
        status: "active",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (challengeError) {
      console.error("Error creating challenge:", challengeError);
      throw new Error("Failed to create challenge");
    }

    await supabaseAdmin
      .from("payments")
      .update({ challenge_id: challenge.id })
      .eq("transaction_id", orderId);

    return new Response(
      JSON.stringify({
        success: true,
        challengeId: challenge.id,
        status: captureData.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in capture-paypal-order:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
