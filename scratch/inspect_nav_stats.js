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

  let runningPeak = { date: series[0].date, val: series[0].val };
  const gapsBetweenHighs = [];

  for (let i = 1; i < series.length; i++) {
    const current = series[i];
    if (current.val > runningPeak.val) {
      const d1 = new Date(runningPeak.date);
      const d2 = new Date(current.date);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      gapsBetweenHighs.push(diffDays);
      runningPeak = { date: current.date, val: current.val };
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
  // 1. Fetch nav_series 3x
  const { data: nav3x, error: err3x } = await supabase
    .from('nav_series')
    .select('date, final_nav')
    .eq('dashboard_type', '3x')
    .order('date', { ascending: true });

  if (err3x) {
    console.error("3x fetch error:", err3x);
    return;
  }

  const series3x = nav3x.map(row => ({
    date: row.date,
    val: Number(row.final_nav)
  }));

  const stats3x = computeNewHighStats(series3x);
  console.log("\n=================== 3X NAV STATS ===================");
  console.log(`Total series count: ${series3x.length}`);
  console.log("Highest Point Achieved (NAV):", stats3x.highestPoint);
  console.log("Avg Days to Reach New High:", stats3x.avgDaysToNewHigh);
  console.log("Gaps between highs:", stats3x.gapsBetweenHighs);

  // 2. Fetch nav_series net
  const { data: navNet, error: errNet } = await supabase
    .from('nav_series')
    .select('date, final_nav')
    .eq('dashboard_type', 'net')
    .order('date', { ascending: true });

  if (errNet) {
    console.error("Net fetch error:", errNet);
    return;
  }

  const seriesNet = navNet.map(row => ({
    date: row.date,
    val: Number(row.final_nav)
  }));

  const statsNet = computeNewHighStats(seriesNet);
  console.log("\n=================== NET NAV STATS ===================");
  console.log(`Total series count: ${seriesNet.length}`);
  console.log("Highest Point Achieved (NAV):", statsNet.highestPoint);
  console.log("Avg Days to Reach New High:", statsNet.avgDaysToNewHigh);
  console.log("Gaps between highs:", statsNet.gapsBetweenHighs);
}

run().catch(console.error);
