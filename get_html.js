const fs = require('fs');
const path = require('path');

async function test() {
  try {
    const res = await fetch('http://localhost:3001/intern-portfolio');
    console.log('Status:', res.status);
    const html = await res.text();
    fs.writeFileSync(path.join(__dirname, 'raw_html.txt'), html);
    console.log('HTML saved to raw_html.txt successfully.');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
