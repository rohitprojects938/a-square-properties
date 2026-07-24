const blogTopics = [
  { title: 'Real Estate Trends in India (2026)', category: 'Market Trends', img: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80' },
  { title: 'Step-by-Step Buying Guide for First Time Home Buyers', category: 'Buying Guide', img: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=600&q=80' },
  { title: 'Investment Guide: High ROI Locations in NCR and Hyderabad', category: 'Investment Guide', img: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80' },
  { title: 'Understanding Home Loan Interest Rates and Eligibility', category: 'Home Loan', img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80' },
  { title: 'Top 10 Modern Interior Design Ideas for Cozy Apartments', category: 'Interior Design', img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80' },
  { title: 'Quality Assessment Checklist for New Construction Properties', category: 'Construction', img: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80' },
  { title: 'Indian Budget Impact on Housing and Real Estate Sector', category: 'Market News', img: 'https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=600&q=80' }
];

async function check() {
  for (const topic of blogTopics) {
    try {
      const res = await fetch(topic.img, { method: 'HEAD' });
      console.log(`TITLE: ${topic.title} -> STATUS: ${res.status}`);
    } catch (err) {
      console.log(`TITLE: ${topic.title} -> ERROR: ${err.message}`);
    }
  }
}

check();
