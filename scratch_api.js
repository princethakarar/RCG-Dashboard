const fs = require('fs');

async function main() {
  const res = await fetch("http://localhost:3000/api/portfolio-data", { cache: 'no-store' });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("JSON chunk:", text.substring(0, 1000));
}
main();
