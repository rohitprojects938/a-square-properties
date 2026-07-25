async function main() {
  try {
    const res = await fetch('https://houserenter.in/api/properties?limit=100');
    const json = await res.json();
    console.log('Total properties:', json.data ? json.data.length : 0);
    if (json.data) {
      json.data.forEach(p => {
        console.log(`ID: ${p.id}, Title: "${p.title}", Cover Image: "${p.cover_image}"`);
      });
    }
  } catch (err) {
    console.error(err);
  }
}
main();
