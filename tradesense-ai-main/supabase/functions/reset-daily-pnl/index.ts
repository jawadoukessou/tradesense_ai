import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function should be called by a cron job daily to reset daily PnL
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting daily PnL reset for all active challenges');

    // Reset daily_pnl for all active challenges
    const { data, error } = await supabase
      .from('user_challenges')
      .update({ daily_pnl: 0 })
      .eq('status', 'active')
      .select('id');

    if (error) {
      console.error('Failed to reset daily PnL:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to reset daily PnL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const count = data?.length || 0;
    console.log(`Successfully reset daily PnL for ${count} active challenges`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reset daily PnL for ${count} active challenges`,
        reset_count: count,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in reset-daily-pnl function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
