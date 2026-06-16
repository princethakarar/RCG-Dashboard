const fs = require('fs');

async function run() {
  const res = await fetch('http://localhost:3002/api/portfolio-data');
  const json = await res.json();
  
  console.log('3x (data) last 5 rows:');
  const d3x = json.data;
  d3x.slice(-5).forEach(r => {
    console.log(`  Date: ${r.date}, NetMTM: ${r.netMTM}, DayROI: ${r.dayROI}%`);
  });

  console.log('\nNet Asset last 5 rows:');
  const dna = json.netAssetData;
  dna.slice(-5).forEach(r => {
    console.log(`  Date: ${r.date}, NetMTM: ${r.netMTM}, DayROI: ${r.dayROI}%`);
  });

  console.log('\nAPI forecasts:');
  console.log('  3x forecast:', json.annualizedForecast3x);
  console.log('  Net Asset forecast:', json.annualizedForecastNetAsset);
}

run().catch(console.error);
