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

