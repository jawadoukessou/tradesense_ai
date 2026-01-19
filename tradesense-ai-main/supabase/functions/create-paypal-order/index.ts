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

function safeStrLen(v: string) {
  return v ? v.length : 0;
}

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
  // Try sandbox first, then live (helps when creds don't match the environment)
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
      console.error("Missing PayPal secrets", {
        clientIdLen: safeStrLen(PAYPAL_CLIENT_ID),
        clientSecretLen: safeStrLen(PAYPAL_CLIENT_SECRET),
      });
      return new Response(JSON.stringify({ error: "Missing PayPal secrets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user from JWT (prevents forging user_id in request body)
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

    const userId = userData.user.id;

    const { planName, amount, currency = "USD", initialCapital } = await req.json();

    console.log("Creating PayPal order:", { planName, amount, currency, userId, initialCapital });

    if (!planName || !amount) {
      throw new Error("Missing required fields: planName or amount");
    }

    const { accessToken, apiBaseUrl } = await getPayPalAccessTokenAuto();

    const origin = req.headers.get("origin") ?? "";

    const orderResponse = await fetch(`${apiBaseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toString(),
            },
            description: `TradeSense AI - ${planName} Challenge`,
            custom_id: JSON.stringify({ userId, planName, initialCapital }),
          },
        ],
        application_context: {
          brand_name: "TradeSense AI",
          landing_page: "NO_PREFERENCE",
          user_action: "PAY_NOW",
          // PayPal will redirect to these URLs
          return_url: `${origin}/dashboard?payment=success`,
          cancel_url: `${origin}/pricing?payment=cancelled`,
        },
      }),
    });

    const orderData = await orderResponse.json().catch(() => ({}));

    if (!orderResponse.ok) {
      console.error("PayPal order creation error:", {
        apiBaseUrl,
        status: orderResponse.status,
        body: orderData,
      });
      throw new Error("Failed to create PayPal order");
    }

    console.log("PayPal order created:", orderData.id);

    // Record pending payment (service role)
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { error: paymentError } = await supabaseAdmin.from("payments").insert({
      user_id: userId,
      amount,
      currency,
      payment_method: "paypal",
      status: "pending",
      transaction_id: orderData.id,
    });

    if (paymentError) {
      console.error("Error creating payment record:", paymentError);
    }

    const approvalUrl = orderData.links?.find((link: any) => link.rel === "approve")?.href;

    return new Response(JSON.stringify({ orderId: orderData.id, approvalUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in create-paypal-order:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
