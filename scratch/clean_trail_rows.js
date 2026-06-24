const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('@upstash/redis');

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

const redisUrl = (envVars['UPSTASH_REDIS_REST_URL'] || '').replace(/"/g, '').trim();
const redisToken = (envVars['UPSTASH_REDIS_REST_TOKEN'] || '').replace(/"/g, '').trim();

if (!supabaseUrl || !supabaseKey || !redisUrl || !redisToken) {
  console.error('Missing configuration variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const redis = new Redis({ url: redisUrl, token: redisToken });

async function cleanup() {
  console.log('Deleteting rows from max_upside_downside where date > 2026-06-22...');
  
  const { data, error } = await supabase
    .from('max_upside_downside')
    .delete()
    .gt('date', '2026-06-22')
    .select();
    
  if (error) {
    console.error('Error deleting rows:', error);
    process.exit(1);
  }
  
  console.log(`Deleted rows:`, data);
  console.log(`Deleted count: ${data ? data.length : 0}`);
  
  console.log('Invalidating Redis cache key: "dashboard:max_upside_downside"...');
  await redis.del('dashboard:max_upside_downside');
  console.log('Redis cache cleared successfully.');
}

cleanup().catch(console.error);
