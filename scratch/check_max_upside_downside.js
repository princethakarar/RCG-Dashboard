const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split(/\r?\n/).forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim();
    envVars[key] = val;
  }
});

const supabaseUrl = (envVars['NEXT_PUBLIC_SUPABASE_URL'] || '').replace(/"/g, '').trim();
const supabaseKey = (envVars['SUPABASE_SERVICE_ROLE_KEY'] || '').replace(/"/g, '').trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDB() {
  const { data, error } = await supabase
    .from('max_upside_downside')
    .select('*')
    .order('date', { ascending: false });
    
  if (error) {
    console.error('Error fetching max_upside_downside:', error);
  } else {
    console.log('Latest 10 rows in max_upside_downside:');
    console.table(data.slice(0, 10));
  }
}

checkDB();
