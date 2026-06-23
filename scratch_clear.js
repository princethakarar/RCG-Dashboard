const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearTradingData() {
  const { error } = await supabase.from('trading_data').delete().neq('date', '1900-01-01');
  if (error) {
    console.error('Error clearing trading_data:', error);
  } else {
    console.log('Successfully cleared trading_data');
  }
}
clearTradingData();
