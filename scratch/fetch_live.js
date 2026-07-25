async function main() {
  try {
    const res = await fetch('https://houserenter.in/api/properties');
    const json = await res.json();
    console.log('API RESPONSE Status:', res.status);
    console.log('API RESPONSE data length:', json.data ? json.data.length : 0);
    if (json.data && json.data.length > 0) {
      console.log('Sample Property:', JSON.stringify(json.data[0], null, 2));
      
      // Let's also fetch a single property details
      const firstId = json.data[0].id;
      const detRes = await fetch(`https://houserenter.in/api/properties/${firstId}`);
      const detJson = await detRes.json();
      console.log('Single Property Details Images:', detJson.data ? detJson.data.images : 'None');
    }
  } catch (err) {
    console.error(err);
  }
}

main();
