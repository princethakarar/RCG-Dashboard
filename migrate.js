const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const connectionString = envVars.DATABASE_URL;

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  
  try {
    await client.query(`ALTER TABLE trading_data ADD COLUMN IF NOT EXISTS carry_peak NUMERIC(15, 4);`);
    console.log("Successfully added carry_peak to trading_data");
  } catch (e) {
    console.error("Migration error:", e);
  } finally {
    await client.end();
  }
}

main();
