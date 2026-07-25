async function main() {
  try {
    const res = await fetch('https://houserenter.in/api/properties/debug/files');
    const json = await res.json();
    console.log('API RESPONSE Status:', res.status);
    console.log('API RESPONSE:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error(err);
  }
}
main();
