import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { trade_id, exit_price } = await req.json();
    console.log(`Evaluating trade ${trade_id} with exit price ${exit_price} for user ${user.id}`);

    if (!trade_id || exit_price === undefined) {
      return new Response(
        JSON.stringify({ error: 'trade_id and exit_price are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the trade
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', trade_id)
      .eq('user_id', user.id)
      .eq('is_open', true)
      .maybeSingle();

    if (tradeError || !trade) {
      console.error('Trade not found or already closed:', tradeError);
      return new Response(
        JSON.stringify({ error: 'Trade not found or already closed' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate PnL
    const priceChange = exit_price - trade.entry_price;
    const direction = trade.trade_type === 'buy' ? 1 : -1;
    const pnl = (priceChange / trade.entry_price) * trade.amount * trade.leverage * direction;
    
    console.log(`Calculated PnL: ${pnl} for trade type: ${trade.trade_type}`);

    // Update trade with exit price and PnL
    const { error: updateTradeError } = await supabase
      .from('trades')
      .update({
        exit_price: exit_price,
        pnl: pnl,
        is_open: false,
        closed_at: new Date().toISOString(),
      })
      .eq('id', trade_id);

    if (updateTradeError) {
      console.error('Failed to update trade:', updateTradeError);
      return new Response(
        JSON.stringify({ error: 'Failed to update trade' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('user_challenges')
      .select('*')
      .eq('id', trade.challenge_id)
      .single();

    if (challengeError || !challenge) {
      console.error('Challenge not found:', challengeError);
      return new Response(
        JSON.stringify({ error: 'Challenge not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update challenge balances
    const newBalance = challenge.current_balance + pnl;
    const newTotalPnl = challenge.total_pnl + pnl;
    const newDailyPnl = challenge.daily_pnl + pnl;

    console.log(`Updating challenge: balance ${challenge.current_balance} -> ${newBalance}, total PnL: ${newTotalPnl}`);

    const { error: updateChallengeError } = await supabase
      .from('user_challenges')
      .update({
        current_balance: newBalance,
        total_pnl: newTotalPnl,
        daily_pnl: newDailyPnl,
      })
      .eq('id', trade.challenge_id);

    if (updateChallengeError) {
      console.error('Failed to update challenge:', updateChallengeError);
      return new Response(
        JSON.stringify({ error: 'Failed to update challenge' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check challenge status
    const checkResponse = await supabase.functions.invoke('check-challenge-status', {
      body: { challenge_id: trade.challenge_id },
      headers: { Authorization: authHeader },
    });

    console.log('Challenge status check result:', checkResponse.data);

    return new Response(
      JSON.stringify({
        success: true,
        trade: {
          id: trade_id,
          pnl: pnl,
          exit_price: exit_price,
        },
        challenge: {
          id: trade.challenge_id,
          new_balance: newBalance,
          total_pnl: newTotalPnl,
          status: checkResponse.data?.status || 'active',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in evaluate-trade function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
