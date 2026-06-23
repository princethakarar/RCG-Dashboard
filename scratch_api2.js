const http = require('http');

http.get('http://localhost:3000/api/portfolio-data', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log("Status Code:", res.statusCode);
    if (res.statusCode === 200) {
      const json = JSON.parse(data);
      console.log("tradingData length:", json.tradingData ? json.tradingData.length : "UNDEFINED");
      if (json.tradingData && json.tradingData.length > 0) {
        console.log("First element:", json.tradingData[0]);
      }
    } else {
      console.log("Response:", data.substring(0, 200));
    }
  });
});
