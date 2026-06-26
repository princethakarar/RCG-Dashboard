const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const SQL_MIGRATION = `
ALTER TABLE trading_data ADD COLUMN IF NOT EXISTS position_cr_dr NUMERIC(15, 4);
ALTER TABLE trading_data ADD COLUMN IF NOT EXISTS cr_dr_vs_margin_pct NUMERIC(10, 6);
ALTER TABLE trading_data ADD COLUMN IF NOT EXISTS margin_use_carry NUMERIC(15, 4);
`;

async function main() {
  // Read env variables from .env.local
  const envPath = path.join(__dirname, '..', '.env.local');
  let envVars = {};
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    env.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const val = match[2].trim();
        envVars[match[1].trim()] = val.replace(/^["']|["']$/g, '');
      }
    });
  }

  const connectionString = envVars.DATABASE_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.log("==============================================================================");
    console.log("No DATABASE_URL found in env. Please run the following SQL queries manually");
    console.log("in your Supabase Project SQL Editor to update the database schema:");
    console.log("==============================================================================");
    console.log(SQL_MIGRATION.trim());
    console.log("==============================================================================");
    return;
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected to PostgreSQL database successfully.");
    await client.query(SQL_MIGRATION);
    console.log("Migration executed successfully. Added columns: position_cr_dr, cr_dr_vs_margin_pct, margin_use_carry");
  } catch (e) {
    console.error("Migration execution failed via Client connection:", e);
    console.log("\nAlternative: Please run the SQL queries manually in your Supabase Project SQL Editor:");
    console.log("------------------------------------------------------------------------------");
    console.log(SQL_MIGRATION.trim());
    console.log("------------------------------------------------------------------------------");
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}

main().catch(console.error);
