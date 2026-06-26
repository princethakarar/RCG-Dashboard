const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const cleanedLine = line.replace(/\r/g, '').trim();
  const match = cleanedLine.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const val = match[2].trim().replace(/^["']|["']$/g, ''); // strip quotes
    envVars[key] = val;
  }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials:", { supabaseUrl, supabaseKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function computeNewHighStats(series) {
  if (!series || series.length === 0) {
    return { highestPoint: null, avgDaysToNewHigh: null };
  }

  let runningPeak = { date: series[0].date, roi: series[0].roi };
  const gapsBetweenHighs = [];

  for (let i = 1; i < series.length; i++) {
    const current = series[i];
    if (current.roi > runningPeak.roi) {
      const d1 = new Date(runningPeak.date);
      const d2 = new Date(current.date);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      gapsBetweenHighs.push(diffDays);
      runningPeak = { date: current.date, roi: current.roi };
    }
  }

  const avgDaysToNewHigh = gapsBetweenHighs.length > 0
    ? Number((gapsBetweenHighs.reduce((sum, val) => sum + val, 0) / gapsBetweenHighs.length).toFixed(1))
    : null;

  return {
    highestPoint: runningPeak,
    avgDaysToNewHigh,
    gapsBetweenHighs
  };
}

async function run() {
  // 1. Fetch portfolio_3x data
  const { data: db3x, error: err3x } = await supabase
    .from('portfolio_3x')
    .select('date, running_roi')
    .order('date', { ascending: true });

  if (err3x) {
    console.error("3x fetch error:", err3x);
    return;
  }

  const series3x = db3x
    .filter(row => row.running_roi !== null && !isNaN(row.running_roi))
    .map(row => ({
      date: row.date,
      roi: Number(row.running_roi)
    }));

  const stats3x = computeNewHighStats(series3x);
  console.log("\n=================== 3X PORTFOLIO STATS ===================");
  console.log(`Total series count: ${series3x.length}`);
  console.log("Highest Point Achieved:", stats3x.highestPoint);
  console.log("Avg Days to Reach New High:", stats3x.avgDaysToNewHigh);
  console.log("Gaps between highs:", stats3x.gapsBetweenHighs);

  // 2. Fetch portfolio_net_asset data
  const { data: dbNet, error: errNet } = await supabase
    .from('portfolio_net_asset')
    .select('date, running_roi')
    .order('date', { ascending: true });

  if (errNet) {
    console.error("Net asset fetch error:", errNet);
    return;
  }

  const seriesNet = dbNet
    .filter(row => row.running_roi !== null && !isNaN(row.running_roi))
    .map(row => ({
      date: row.date,
      roi: Number(row.running_roi)
    }));

  const statsNet = computeNewHighStats(seriesNet);
  console.log("\n=================== NET ASSET PORTFOLIO STATS ===================");
  console.log(`Total series count: ${seriesNet.length}`);
  console.log("Highest Point Achieved:", statsNet.highestPoint);
  console.log("Avg Days to Reach New High:", statsNet.avgDaysToNewHigh);
  console.log("Gaps between highs:", statsNet.gapsBetweenHighs);
}

run().catch(console.error);
