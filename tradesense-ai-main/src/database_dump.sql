-- =============================================
-- TradeSense AI - Complete Database Schema Dump
-- Generated: 2026-01-17
-- Description: Full PostgreSQL schema for TradeSense AI platform
-- =============================================

-- =============================================
-- ENUM TYPES
-- =============================================

CREATE TYPE public.challenge_status AS ENUM ('active', 'success', 'failed', 'pending');
CREATE TYPE public.trade_type AS ENUM ('buy', 'sell');
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- =============================================
-- CORE TABLES
-- =============================================

-- Profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table for authorization
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- User challenges table for prop firm challenges
CREATE TABLE public.user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_name TEXT NOT NULL,
  initial_capital DECIMAL(12,2) NOT NULL DEFAULT 5000.00,
  current_balance DECIMAL(12,2) NOT NULL DEFAULT 5000.00,
  profit_target_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  max_daily_loss_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  max_total_loss_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  daily_pnl DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_pnl DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status challenge_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trades table for storing trading transactions
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES public.user_challenges(id) ON DELETE CASCADE NOT NULL,
  asset_symbol TEXT NOT NULL,
  trade_type trade_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  entry_price DECIMAL(18,8) NOT NULL,
  exit_price DECIMAL(18,8),
  leverage INTEGER NOT NULL DEFAULT 1,
  pnl DECIMAL(12,2),
  is_open BOOLEAN NOT NULL DEFAULT true,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments table for transaction records
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES public.user_challenges(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MAD',
  payment_method TEXT NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leaderboard table for performance tracking
CREATE TABLE public.leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES public.user_challenges(id) ON DELETE CASCADE NOT NULL,
  profit_percent DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  total_trades INTEGER NOT NULL DEFAULT 0,
  win_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  rank_position INTEGER,
  period TEXT NOT NULL DEFAULT 'monthly',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id, period)
);

-- Price alerts table for notification system
CREATE TABLE public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_symbol TEXT NOT NULL,
  target_price DECIMAL(20, 8) NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('above', 'below')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat messages table for community chat
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- VIEWS
-- =============================================

-- Monthly leaderboard view aggregating trade data
CREATE VIEW public.monthly_leaderboard
WITH (security_invoker=on) AS
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

-- =============================================
-- SECURITY FUNCTIONS
-- =============================================

-- Role checking function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- New user signup handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_challenges_updated_at
  BEFORE UPDATE ON public.user_challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_price_alerts_updated_at
  BEFORE UPDATE ON public.price_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view profile names for leaderboard" ON public.profiles
  FOR SELECT USING (true);

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User challenges policies
CREATE POLICY "Users can view own challenges" ON public.user_challenges
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own challenges" ON public.user_challenges
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges" ON public.user_challenges
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all challenges" ON public.user_challenges
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all challenges" ON public.user_challenges
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trades policies
CREATE POLICY "Users can view own trades" ON public.trades
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trades" ON public.trades
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" ON public.trades
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Payments policies
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Leaderboard policies
CREATE POLICY "Anyone can view leaderboard" ON public.leaderboard
  FOR SELECT USING (true);

CREATE POLICY "Users can update own leaderboard entry" ON public.leaderboard
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can modify own leaderboard entry" ON public.leaderboard
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Price alerts policies
CREATE POLICY "Users can view their own alerts" ON public.price_alerts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alerts" ON public.price_alerts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" ON public.price_alerts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts" ON public.price_alerts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Authenticated users can view all messages" ON public.chat_messages
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create their own messages" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages" ON public.chat_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =============================================
-- REALTIME SUBSCRIPTIONS
-- =============================================

-- Enable replica identity for realtime updates
ALTER TABLE public.user_challenges REPLICA IDENTITY FULL;
ALTER TABLE public.trades REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.price_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- =============================================
-- PERMISSIONS AND ACCESS
-- =============================================

-- Grant select access to leaderboard view for public access
GRANT SELECT ON public.monthly_leaderboard TO authenticated;
GRANT SELECT ON public.monthly_leaderboard TO anon;

-- =============================================
-- INDEXES (Optional performance optimizations)
-- =============================================

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_challenge_id ON public.trades(challenge_id);
CREATE INDEX IF NOT EXISTS idx_trades_is_open ON public.trades(is_open);
CREATE INDEX IF NOT EXISTS idx_trades_closed_at ON public.trades(closed_at);
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON public.user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_status ON public.user_challenges(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- =============================================
-- SAMPLE DATA (Optional - uncomment to populate)
-- =============================================

/*
-- Insert sample admin user (replace with actual user ID)
INSERT INTO public.user_roles (user_id, role) 
VALUES ('YOUR_ADMIN_USER_ID_HERE', 'admin');

-- Insert sample challenge plans
INSERT INTO public.challenge_plans (name, price, initial_capital, profit_target, max_daily_loss, max_total_loss)
VALUES 
  ('Starter', 1000, 5000, 10, 5, 10),
  ('Professional', 2500, 15000, 10, 5, 10),
  ('Elite', 5000, 30000, 10, 5, 10);
*/

-- =============================================
-- DATABASE SCHEMA COMPLETION
-- =============================================

-- Add any additional extensions or configurations here
-- This schema is ready for deployment to Supabase or PostgreSQL

COMMIT;