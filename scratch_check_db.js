const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTradingData() {
  const { data, error } = await supabase.from('trading_data').select('date, net_mtm').order('date', { ascending: false }).limit(10);
  console.log('Latest dates in trading_data:', data);
}
checkTradingData();
