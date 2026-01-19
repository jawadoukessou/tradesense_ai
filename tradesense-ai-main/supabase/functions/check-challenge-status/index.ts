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

    const { challenge_id } = await req.json();
    console.log(`Checking challenge status for ${challenge_id}`);

    if (!challenge_id) {
      return new Response(
        JSON.stringify({ error: 'challenge_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('user_challenges')
      .select('*')
      .eq('id', challenge_id)
      .eq('user_id', user.id)
      .single();

    if (challengeError || !challenge) {
      console.error('Challenge not found:', challengeError);
      return new Response(
        JSON.stringify({ error: 'Challenge not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Skip if challenge is already completed
    if (challenge.status === 'success' || challenge.status === 'failed') {
      console.log(`Challenge ${challenge_id} already completed with status: ${challenge.status}`);
      return new Response(
        JSON.stringify({ status: challenge.status, message: 'Challenge already completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate percentages
    const profitPercent = (challenge.total_pnl / challenge.initial_capital) * 100;
    const dailyLossPercent = Math.abs(Math.min(0, challenge.daily_pnl)) / challenge.initial_capital * 100;
    const totalLossPercent = Math.abs(Math.min(0, challenge.total_pnl)) / challenge.initial_capital * 100;

    console.log(`Challenge ${challenge_id} metrics:`, {
      profitPercent,
      dailyLossPercent,
      totalLossPercent,
      profitTarget: challenge.profit_target_percent,
      maxDailyLoss: challenge.max_daily_loss_percent,
      maxTotalLoss: challenge.max_total_loss_percent,
    });

    let newStatus = challenge.status;
    let statusMessage = '';

    // Check if challenge failed (hit loss limits)
    if (dailyLossPercent >= challenge.max_daily_loss_percent) {
      newStatus = 'failed';
      statusMessage = `Daily loss limit of ${challenge.max_daily_loss_percent}% exceeded`;
      console.log(`Challenge ${challenge_id} FAILED: ${statusMessage}`);
    } else if (totalLossPercent >= challenge.max_total_loss_percent) {
      newStatus = 'failed';
      statusMessage = `Total loss limit of ${challenge.max_total_loss_percent}% exceeded`;
      console.log(`Challenge ${challenge_id} FAILED: ${statusMessage}`);
    }
    // Check if challenge succeeded (hit profit target)
    else if (profitPercent >= challenge.profit_target_percent) {
      newStatus = 'success';
      statusMessage = `Profit target of ${challenge.profit_target_percent}% achieved!`;
      console.log(`Challenge ${challenge_id} SUCCESS: ${statusMessage}`);
    }

    // Update challenge status if changed
    if (newStatus !== challenge.status) {
      const { error: updateError } = await supabase
        .from('user_challenges')
        .update({
          status: newStatus,
          ended_at: newStatus !== 'active' ? new Date().toISOString() : null,
        })
        .eq('id', challenge_id);

      if (updateError) {
        console.error('Failed to update challenge status:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update challenge status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update leaderboard if successful
      if (newStatus === 'success') {
        // Get trade stats for leaderboard
        const { data: trades } = await supabase
          .from('trades')
          .select('pnl')
          .eq('challenge_id', challenge_id)
          .eq('is_open', false);

        const totalTrades = trades?.length || 0;
        const winningTrades = trades?.filter(t => (t.pnl || 0) > 0).length || 0;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

        // Upsert leaderboard entry
        const { error: leaderboardError } = await supabase
          .from('leaderboard')
          .upsert({
            user_id: user.id,
            challenge_id: challenge_id,
            profit_percent: profitPercent,
            total_trades: totalTrades,
            win_rate: winRate,
            period: 'monthly',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,challenge_id',
          });

        if (leaderboardError) {
          console.error('Failed to update leaderboard:', leaderboardError);
        } else {
          console.log(`Leaderboard updated for user ${user.id}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: newStatus,
        message: statusMessage || 'Challenge is active',
        metrics: {
          profit_percent: profitPercent,
          daily_loss_percent: dailyLossPercent,
          total_loss_percent: totalLossPercent,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-challenge-status function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
