import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import type { Database } from '@/integrations/supabase/types';

type Challenge = Database['public']['Tables']['user_challenges']['Row'];
type Trade = Database['public']['Tables']['trades']['Row'];

interface UseChallengeReturn {
  challenge: Challenge | null;
  trades: Trade[];
  openTrades: Trade[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  openTrade: (params: OpenTradeParams) => Promise<Trade | null>;
  closeTrade: (tradeId: string, exitPrice: number) => Promise<boolean>;
  calculateRealTimeEquity: (currentPrices: Record<string, number>) => number;
}

interface OpenTradeParams {
  assetSymbol: string;
  tradeType: 'buy' | 'sell';
  amount: number;
  entryPrice: number;
  leverage: number;
}

export const useChallenge = (): UseChallengeReturn => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) {
      setChallenge(null);
      setTrades([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch active challenge
      const { data: challengeData, error: challengeError } = await supabase
        .from('user_challenges')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (challengeError) throw challengeError;
      setChallenge(challengeData);

      // Fetch trades for this challenge
      if (challengeData) {
        const { data: tradesData, error: tradesError } = await supabase
          .from('trades')
          .select('*')
          .eq('challenge_id', challengeData.id)
          .order('created_at', { ascending: false });

        if (tradesError) throw tradesError;
        setTrades(tradesData || []);
      } else {
        setTrades([]);
      }
    } catch (err) {
      console.error('Error fetching challenge data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    fetchData();

    if (!user) return;

    // Subscribe to challenge updates
    const challengeChannel = supabase
      .channel('challenge-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_challenges',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Challenge update:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newChallenge = payload.new as Challenge;
            if (newChallenge.status === 'active') {
              setChallenge(newChallenge);
            } else if (challenge?.id === newChallenge.id) {
              setChallenge(newChallenge);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to trades updates
    const tradesChannel = supabase
      .channel('trades-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Trade update:', payload);
          if (payload.eventType === 'INSERT') {
            setTrades((prev) => [payload.new as Trade, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTrades((prev) =>
              prev.map((t) => (t.id === (payload.new as Trade).id ? (payload.new as Trade) : t))
            );
          } else if (payload.eventType === 'DELETE') {
            setTrades((prev) => prev.filter((t) => t.id !== (payload.old as Trade).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(challengeChannel);
      supabase.removeChannel(tradesChannel);
    };
  }, [user, fetchData]);

  const openTrades = trades.filter((t) => t.is_open);

  const calculateRealTimeEquity = useCallback((currentPrices: Record<string, number>): number => {
    if (!challenge) return 0;
    
    let equity = challenge.current_balance;
    
    // Calculate P&L from open trades
    openTrades.forEach(trade => {
      const currentPrice = currentPrices[trade.asset_symbol];
      if (currentPrice !== undefined) {
        const priceChange = currentPrice - trade.entry_price;
        const direction = trade.trade_type === 'buy' ? 1 : -1;
        const pnl = (priceChange / trade.entry_price) * trade.amount * trade.leverage * direction;
        equity += pnl;
      }
    });
    
    return equity;
  }, [challenge, openTrades]);

  const openTrade = async (params: OpenTradeParams): Promise<Trade | null> => {
    if (!user || !challenge) {
      toast({
        title: 'No Active Challenge',
        description: 'You need an active challenge to trade.',
        variant: 'destructive',
      });
      return null;
    }

    if (challenge.status !== 'active') {
      toast({
        title: 'Challenge Not Active',
        description: 'Your challenge is no longer active.',
        variant: 'destructive',
      });
      return null;
    }

    // Check if amount is valid
    if (params.amount <= 0 || params.amount > challenge.current_balance) {
      toast({
        title: 'Invalid Amount',
        description: 'Trade amount must be positive and less than your balance.',
        variant: 'destructive',
      });
      return null;
    }


    try {
      const { data, error } = await supabase
        .from('trades')
        .insert({
          user_id: user.id,
          challenge_id: challenge.id,
          asset_symbol: params.assetSymbol,
          trade_type: params.tradeType,
          amount: params.amount,
          entry_price: params.entryPrice,
          leverage: params.leverage,
          is_open: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: params.tradeType === 'buy' ? '🟢 Buy Order Opened' : '🔴 Sell Order Opened',
        description: `${params.tradeType.toUpperCase()} $${params.amount} on ${params.assetSymbol} at $${params.entryPrice.toLocaleString()}`,
      });

      return data;
    } catch (err) {
      console.error('Error opening trade:', err);
      toast({
        title: 'Trade Failed',
        description: err instanceof Error ? err.message : 'Failed to open trade',
        variant: 'destructive',
      });
      return null;
    }
  };

  const closeTrade = async (tradeId: string, exitPrice: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('evaluate-trade', {
        body: { trade_id: tradeId, exit_price: exitPrice },
      });

      if (error) throw error;

      const pnl = data?.trade?.pnl || 0;
      const isProfit = pnl >= 0;

      toast({
        title: isProfit ? '🟢 Trade Closed - Profit!' : '🔴 Trade Closed - Loss',
        description: `P&L: ${isProfit ? '+' : ''}$${pnl.toFixed(2)}`,
        variant: isProfit ? 'default' : 'destructive',
      });

      // Check if challenge status changed
      if (data?.challenge?.status === 'failed') {
        toast({
          title: '💔 Challenge Failed',
          description: 'You have exceeded the loss limit.',
          variant: 'destructive',
        });
      } else if (data?.challenge?.status === 'success') {
        toast({
          title: '🎉 Challenge Completed!',
          description: 'Congratulations! You reached the profit target!',
        });
      }

      // Refetch to get latest data
      await fetchData();

      return true;
    } catch (err) {
      console.error('Error closing trade:', err);
      toast({
        title: 'Close Failed',
        description: err instanceof Error ? err.message : 'Failed to close trade',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    challenge,
    trades,
    openTrades,
    loading,
    error,
    refetch: fetchData,
    openTrade,
    closeTrade,
    calculateRealTimeEquity,
  };
};
