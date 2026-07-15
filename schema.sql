-- Database Schema for Rising Capital Group Dashboard
-- Run these queries in your Supabase Project SQL Editor

CREATE TABLE IF NOT EXISTS trading_data (
  id              SERIAL PRIMARY KEY,
  date            DATE NOT NULL UNIQUE,
  net_mtm         NUMERIC(15, 4),
  running_pl      NUMERIC(15, 4),
  carry_peak      NUMERIC(15, 4),
  avg_deposit     NUMERIC(15, 4),
  net_margin      NUMERIC(15, 4),
  position_cr_dr  NUMERIC(15, 4),
  cr_dr_vs_margin_pct NUMERIC(10, 6),
  margin_use_carry NUMERIC(15, 4),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_3x (
  id              SERIAL PRIMARY KEY,
  date            DATE NOT NULL UNIQUE,
  net_mtm         NUMERIC(15, 4),
  roi_on_deposit  NUMERIC(12, 6),
  running_roi     NUMERIC(12, 6),
  nifty_daily     NUMERIC(12, 6),
  nifty_continue  NUMERIC(12, 6),
  daily_swing     NUMERIC(12, 6),
  high            NUMERIC(15, 4),
  low             NUMERIC(15, 4),
  close           NUMERIC(15, 4),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_net_asset (
  id              SERIAL PRIMARY KEY,
  date            DATE NOT NULL UNIQUE,
  net_mtm         NUMERIC(15, 4),
  running_roi     NUMERIC(12, 6),
  day_roi         NUMERIC(12, 6),
  nifty_daily     NUMERIC(12, 6),
  nifty_continue  NUMERIC(12, 6),
  daily_swing     NUMERIC(12, 6),
  high            NUMERIC(15, 4),
  low             NUMERIC(15, 4),
  close           NUMERIC(15, 4),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trading_data_date ON trading_data(date);
CREATE INDEX IF NOT EXISTS idx_portfolio_3x_date ON portfolio_3x(date);
CREATE INDEX IF NOT EXISTS idx_portfolio_net_asset_date ON portfolio_net_asset(date);

-- Enable Row Level Security (RLS)
ALTER TABLE trading_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_3x ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_net_asset ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS site_settings (
  id              SERIAL PRIMARY KEY,
  password_hash   TEXT NOT NULL,
  password_version INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS nav_series (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_type  TEXT NOT NULL CHECK (dashboard_type IN ('3x', 'net')),
  date            DATE NOT NULL,
  final_nav       NUMERIC(15, 4) NOT NULL,
  uploaded_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (dashboard_type, date)
);

CREATE TABLE IF NOT EXISTS nav_forecast (
  dashboard_type      TEXT PRIMARY KEY CHECK (dashboard_type IN ('3x', 'net')),
  annualized_forecast NUMERIC(10, 6) NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nav_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE nav_forecast ENABLE ROW LEVEL SECURITY;

-- Strategies Data
CREATE TABLE IF NOT EXISTS strategies_data (
  id              SERIAL PRIMARY KEY,
  strategy_name   TEXT NOT NULL,
  date            DATE NOT NULL,
  day             TEXT,
  trades_count    INTEGER,
  net_pnl         NUMERIC(15, 4),
  cumulative_pnl  NUMERIC(15, 4),
  result          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (strategy_name, date)
);

CREATE TABLE IF NOT EXISTS strategies_summary (
  strategy_name   TEXT PRIMARY KEY,
  period          TEXT,
  lot_size        TEXT,
  win_days        INTEGER,
  loss_days       INTEGER,
  best_day_pnl    NUMERIC(15, 4),
  worst_day_pnl   NUMERIC(15, 4),
  avg_daily_pnl   NUMERIC(15, 4),
  win_rate        NUMERIC(10, 6),
  total_net_pnl   NUMERIC(15, 4),
  total_trades    INTEGER,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE strategies_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies_summary ENABLE ROW LEVEL SECURITY;

-- Max Upside / Downside Statistics Data
CREATE TABLE IF NOT EXISTS max_upside_downside (
  id                  SERIAL PRIMARY KEY,
  date                DATE NOT NULL UNIQUE,
  max_downside_10     NUMERIC(15, 4),
  max_downside_t0     NUMERIC(15, 4),
  max_upside_t0       NUMERIC(15, 4),
  max_upside_10       NUMERIC(15, 4),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_max_upside_downside_date ON max_upside_downside(date);
ALTER TABLE max_upside_downside ENABLE ROW LEVEL SECURITY;

-- Position Data (P&L vs LOT)
CREATE TABLE IF NOT EXISTS position_data (
  id              SERIAL PRIMARY KEY,
  date            DATE NOT NULL,
  lot             NUMERIC(15, 4) NOT NULL,
  pnl_lot         NUMERIC(15, 4) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

CREATE INDEX IF NOT EXISTS idx_position_data_date ON position_data(date);
ALTER TABLE position_data ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Row-Level User Isolation (clean slate)
-- =============================================================================
-- 1. Clear all existing data since we're starting fresh
DELETE FROM trading_data;
DELETE FROM portfolio_3x;
DELETE FROM portfolio_net_asset;
DELETE FROM nav_series;
DELETE FROM nav_forecast;
DELETE FROM strategies_data;
DELETE FROM strategies_summary;
DELETE FROM max_upside_downside;
DELETE FROM position_data;

-- 2. Users table mapping emails to UUIDs for custom JWT auth
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 3. Add user_id to every data table + FK + index (NOT NULL since no legacy data)

ALTER TABLE trading_data ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_trading_data_user_id ON trading_data(user_id);

ALTER TABLE portfolio_3x ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_portfolio_3x_user_id ON portfolio_3x(user_id);

ALTER TABLE portfolio_net_asset ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_portfolio_net_asset_user_id ON portfolio_net_asset(user_id);

ALTER TABLE nav_series ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_nav_series_user_id ON nav_series(user_id);

ALTER TABLE nav_forecast ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_nav_forecast_user_id ON nav_forecast(user_id);

ALTER TABLE strategies_data ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_strategies_data_user_id ON strategies_data(user_id);

ALTER TABLE strategies_summary ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_strategies_summary_user_id ON strategies_summary(user_id);

ALTER TABLE max_upside_downside ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_max_upside_downside_user_id ON max_upside_downside(user_id);

ALTER TABLE position_data ADD COLUMN user_id UUID NOT NULL REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_position_data_user_id ON position_data(user_id);

-- 4. Update UNIQUE constraints to be per-user
--    (drop old global constraints, add new ones scoped to user_id)

ALTER TABLE trading_data DROP CONSTRAINT IF EXISTS trading_data_date_key;
ALTER TABLE trading_data ADD CONSTRAINT trading_data_user_date_unique UNIQUE (user_id, date);

ALTER TABLE portfolio_3x DROP CONSTRAINT IF EXISTS portfolio_3x_date_key;
ALTER TABLE portfolio_3x ADD CONSTRAINT portfolio_3x_user_date_unique UNIQUE (user_id, date);

ALTER TABLE portfolio_net_asset DROP CONSTRAINT IF EXISTS portfolio_net_asset_date_key;
ALTER TABLE portfolio_net_asset ADD CONSTRAINT portfolio_net_asset_user_date_unique UNIQUE (user_id, date);

ALTER TABLE nav_series DROP CONSTRAINT IF EXISTS nav_series_dashboard_type_date_key;
ALTER TABLE nav_series ADD CONSTRAINT nav_series_user_type_date_unique UNIQUE (user_id, dashboard_type, date);

ALTER TABLE strategies_data DROP CONSTRAINT IF EXISTS strategies_data_strategy_name_date_key;
ALTER TABLE strategies_data ADD CONSTRAINT strategies_data_user_name_date_unique UNIQUE (user_id, strategy_name, date);

-- Fix: strategies_summary PK was originally scoped to strategy_name only
-- (table-wide), which caused cross-user collisions on upload. Migrate to a
-- surrogate id PK + a per-user composite uniqueness constraint, mirroring
-- strategies_data above.
ALTER TABLE strategies_summary DROP CONSTRAINT IF EXISTS strategies_summary_pkey;
ALTER TABLE strategies_summary ADD COLUMN IF NOT EXISTS id BIGSERIAL;
ALTER TABLE strategies_summary ADD CONSTRAINT strategies_summary_pkey PRIMARY KEY (id);
ALTER TABLE strategies_summary
  ADD CONSTRAINT strategies_summary_user_name_unique UNIQUE (user_id, strategy_name);

-- Hybrid Adaptive Options Framework support: per-leg P&L columns.
-- Nullable; unused by "3 Red Candle" / "Soldier Pattern" rows.
ALTER TABLE strategies_data
  ADD COLUMN IF NOT EXISTS directional_pnl NUMERIC(15, 4),
  ADD COLUMN IF NOT EXISTS non_directional_pnl NUMERIC(15, 4);

ALTER TABLE strategies_summary
  ADD COLUMN IF NOT EXISTS directional_pnl NUMERIC(15, 4),
  ADD COLUMN IF NOT EXISTS non_directional_pnl NUMERIC(15, 4),
  ADD COLUMN IF NOT EXISTS total_days INTEGER;

ALTER TABLE max_upside_downside DROP CONSTRAINT IF EXISTS max_upside_downside_date_key;
ALTER TABLE max_upside_downside ADD CONSTRAINT max_upside_downside_user_date_unique UNIQUE (user_id, date);

ALTER TABLE position_data DROP CONSTRAINT IF EXISTS position_data_date_key;
ALTER TABLE position_data ADD CONSTRAINT position_data_user_date_unique UNIQUE (user_id, date);

-- Fix: nav_forecast's PRIMARY KEY was left scoped to dashboard_type alone
-- (table-wide) when the other tables above were migrated to per-user
-- constraints. That means only one account in the whole system could ever
-- hold a '3x' forecast row and one a 'net' row -- any other account's NAV
-- upload fails with "duplicate key value violates unique constraint
-- nav_forecast_pkey". Migrate to a composite per-user PK, mirroring
-- nav_series_user_type_date_unique above.
ALTER TABLE nav_forecast DROP CONSTRAINT IF EXISTS nav_forecast_pkey;
ALTER TABLE nav_forecast ADD CONSTRAINT nav_forecast_pkey PRIMARY KEY (user_id, dashboard_type);

-- 5. RLS Policies
--    Only allow operations where user_id matches the authenticated user.
--    Uses a custom session variable set server-side.
CREATE FUNCTION public.current_user_id() RETURNS UUID
LANGUAGE SQL STABLE AS $$
  SELECT NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
$$;

-- trading_data
ALTER TABLE trading_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS trading_data_self ON trading_data;
CREATE POLICY trading_data_self ON trading_data
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- portfolio_3x
ALTER TABLE portfolio_3x ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS portfolio_3x_self ON portfolio_3x;
CREATE POLICY portfolio_3x_self ON portfolio_3x
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- portfolio_net_asset
ALTER TABLE portfolio_net_asset ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS portfolio_net_asset_self ON portfolio_net_asset;
CREATE POLICY portfolio_net_asset_self ON portfolio_net_asset
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- nav_series
ALTER TABLE nav_series ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nav_series_self ON nav_series;
CREATE POLICY nav_series_self ON nav_series
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- nav_forecast
ALTER TABLE nav_forecast ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nav_forecast_self ON nav_forecast;
CREATE POLICY nav_forecast_self ON nav_forecast
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- strategies_data
ALTER TABLE strategies_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS strategies_data_self ON strategies_data;
CREATE POLICY strategies_data_self ON strategies_data
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- strategies_summary
ALTER TABLE strategies_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS strategies_summary_self ON strategies_summary;
CREATE POLICY strategies_summary_self ON strategies_summary
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- max_upside_downside
ALTER TABLE max_upside_downside ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS max_upside_downside_self ON max_upside_downside;
CREATE POLICY max_upside_downside_self ON max_upside_downside
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- position_data
ALTER TABLE position_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS position_data_self ON position_data;
CREATE POLICY position_data_self ON position_data
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

-- users table: each user can only see their own record
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_self ON users;
CREATE POLICY users_self ON users
  USING (id = current_user_id())
  WITH CHECK (id = current_user_id());

-- =============================================================================
-- Per-user passwords (replaces the single shared site_settings password)
-- =============================================================================
-- 1. Add per-user credential columns.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Backfill any pre-existing users (created under the old shared-password
--    system) with the current shared hash as their starting password, so
--    they keep working until they change it via the change-password page.
UPDATE users u
SET password_hash = s.password_hash
FROM (SELECT password_hash FROM site_settings ORDER BY id ASC LIMIT 1) s
WHERE u.password_hash IS NULL;

-- 3. Going forward every user is created with their own password at signup,
--    so this column should be required -- but only enforce that once every
--    existing row actually has a hash (guards against site_settings being
--    empty/missing when this script runs).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE password_hash IS NULL) THEN
    ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
  ELSE
    RAISE NOTICE 'Some users still have a NULL password_hash (no site_settings row to backfill from). Skipping NOT NULL constraint -- set their passwords manually, then re-run this ALTER.';
  END IF;
END $$;

-- =============================================================================
-- Backoffice Clients & Data
-- =============================================================================

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, mobile),
  UNIQUE (user_id, email)
);

CREATE TABLE IF NOT EXISTS client_data (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  vix_close NUMERIC(15, 4),
  vix_change_pct NUMERIC(15, 4),
  nifty_change_pct NUMERIC(15, 4),
  net_mtm NUMERIC(15, 4),
  running_pl NUMERIC(15, 4),
  net_margin NUMERIC(15, 4),
  running_roi NUMERIC(15, 4),
  day_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, date)
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_client_data_client_id ON client_data(client_id);
CREATE INDEX IF NOT EXISTS idx_client_data_date ON client_data(date);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clients_self ON clients;
CREATE POLICY clients_self ON clients
  USING (user_id = current_user_id())
  WITH CHECK (user_id = current_user_id());

ALTER TABLE client_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS client_data_self ON client_data;
CREATE POLICY client_data_self ON client_data
  USING (client_id IN (SELECT id FROM clients WHERE user_id = current_user_id()))
  WITH CHECK (client_id IN (SELECT id FROM clients WHERE user_id = current_user_id()));
