-- Create a view for monthly leaderboard aggregated from trades
CREATE OR REPLACE VIEW public.monthly_leaderboard AS
SELECT 
  t.user_id,
  p.full_name,
  p.avatar_url,
  COUNT(*) AS total_trades,
  COUNT(*) FILTER (WHERE t.pnl > 0) AS winning_trades,
  COUNT(*) FILTER (WHERE t.pnl <= 0) AS losing_trades,
  ROUND(
    CASE WHEN COUNT(*) > 0 
    THEN (COUNT(*) FILTER (WHERE t.pnl > 0)::numeric / COUNT(*) * 100)
    ELSE 0 
    END, 2
  ) AS win_rate,
  COALESCE(SUM(t.pnl), 0) AS total_pnl,
  ROUND(COALESCE(AVG(t.pnl), 0), 2) AS avg_pnl,
  COALESCE(MAX(t.pnl), 0) AS best_trade,
  COALESCE(MIN(t.pnl), 0) AS worst_trade,
  -- Calculate profit percent based on initial capital from challenge
  ROUND(
    CASE WHEN uc.initial_capital > 0 
    THEN (COALESCE(SUM(t.pnl), 0) / uc.initial_capital * 100)
    ELSE 0 
    END, 2
  ) AS profit_percent
FROM trades t
JOIN profiles p ON t.user_id = p.id
JOIN user_challenges uc ON t.challenge_id = uc.id
WHERE t.is_open = false
  AND t.closed_at >= date_trunc('month', CURRENT_DATE)
  AND t.closed_at < date_trunc('month', CURRENT_DATE) + interval '1 month'
GROUP BY t.user_id, p.full_name, p.avatar_url, uc.initial_capital
ORDER BY profit_percent DESC
LIMIT 10;

-- Grant select access to authenticated users
GRANT SELECT ON public.monthly_leaderboard TO authenticated;
-- Grant select access to anonymous users for public leaderboard
GRANT SELECT ON public.monthly_leaderboard TO anon;