async function main() {
  try {
    const res = await fetch('https://houserenter.in/api/properties?limit=100');
    const json = await res.json();
    if (json.data) {
      const filtered = json.data.filter(p => p.cover_image && p.cover_image.startsWith('/uploads'));
      console.log('Properties with local uploads:', filtered.length);
      filtered.forEach(p => {
        console.log(`ID: ${p.id}, Title: "${p.title}", Cover Image: "${p.cover_image}"`);
      });
    }
  } catch (err) {
    console.error(err);
  }
}
main();
