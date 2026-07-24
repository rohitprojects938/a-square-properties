const db = require('./db');

const cities = ['Lucknow', 'Delhi', 'Noida', 'Gurgaon', 'Jaipur', 'Pune', 'Hyderabad', 'Mumbai', 'Bangalore', 'Ahmedabad'];

const builderNames = [
  'DLF Group', 'Lodha Developers', 'Godrej Properties', 'Prestige Group', 'Tata Housing',
  'Shapoorji Pallonji', 'Sobha Limited', 'L&T Realty', 'Brigade Enterprises', 'Hiranandani',
  'Omaxe Ltd', 'Supertech Limited', 'Unitech Group', 'Salarpuria Sattva', 'Puravankara',
  'Mahindra Lifespaces', 'Rustomjee', 'Kolte-Patil', 'Oberoi Realty', 'Vatika Group',
  'ATS Infrastructure', 'Jaypee Greens', 'Emaar India', 'Casagrand', 'Ashiana Housing'
];

const agentNames = [
  'Rajesh Kumar', 'Amit Sharma', 'Sanjay Patel', 'Vikram Singh', 'Anil Mehta',
  'Vijay Gupta', 'Sunil Joshi', 'Ramesh Nair', 'Deepak Verma', 'Arun Mishra',
  'Suresh Reddy', 'Naresh Rao', 'Manoj Saxena', 'Karan Johar', 'Rahul Bose',
  'Pankaj Tripathi', 'Harish Iyer', 'Mohit Sharma', 'Vivek Oberoi', 'Alok Nath',
  'Priya Sharma', 'Sneha Patel', 'Neha Gupta', 'Ananya Sen', 'Pooja Reddy',
  'Kiran Rao', 'Shweta Tiwari', 'Ritu Kumar', 'Meera Nair', 'Aditi Rao',
  'Sandhya Singh', 'Divya Teja', 'Kavita Krishnamurthy', 'Deepa Mehta', 'Asha Bhosle',
  'Aishwarya Sen', 'Swati Mishra', 'Preeti Zinta', 'Sonam Kapoor', 'Kareena Kapoor',
  'Rohan Mehra', 'Ashish Vidyarthi', 'Paresh Rawal', 'Boman Irani', 'Anupam Kher',
  'Naseeruddin Shah', 'Rajkummar Rao', 'Ayushmann Khurrana', 'Vicky Kaushal', 'Ranbir Kapoor'
];

const blogTopics = [
  { title: 'Real Estate Trends in India (2026)', category: 'Market Trends', img: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80' },
  { title: 'Step-by-Step Buying Guide for First Time Home Buyers', category: 'Buying Guide', img: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=600&q=80' },
  { title: 'Investment Guide: High ROI Locations in NCR and Hyderabad', category: 'Investment Guide', img: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80' },
  { title: 'Understanding Home Loan Interest Rates and Eligibility', category: 'Home Loan', img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80' },
  { title: 'Top 10 Modern Interior Design Ideas for Cozy Apartments', category: 'Interior Design', img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80' },
  { title: 'Quality Assessment Checklist for New Construction Properties', category: 'Construction', img: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80' },
  { title: 'Indian Budget Impact on Housing and Real Estate Sector', category: 'Market News', img: 'https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=600&q=80' }
];

const propertyImages = [
  'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1527030280862-64139fbe04ca?auto=format&fit=crop&w=600&q=80'
];

async function seedDatabaseData() {
  console.log('🚀 Checking database seeding requirements...');

  let userCount = 0;
  let propertyCount = 0;

  if (db.isMock()) {
    userCount = db.mockDb.users.length;
    propertyCount = db.mockDb.properties.length;
  } else {
    try {
      const [uRows] = await db.query('SELECT COUNT(*) as count FROM users');
      const [pRows] = await db.query('SELECT COUNT(*) as count FROM properties');
      userCount = uRows[0].count;
      propertyCount = pRows[0].count;
    } catch (err) {
      console.error('Failed to query seed count, skipping SQL seed:', err.message);
      return;
    }
  }

  // Already seeded check
  if (userCount > 10 || propertyCount > 10) {
    console.log('✅ Database already seeded with ample data.');
    return;
  }

  console.log('⏳ Seeding database tables with realistic Indian data...');

  const mockUsersList = [];
  const mockPropertiesList = [];
  const mockImagesList = [];
  const mockReelsList = [];
  const mockServicesList = [];
  const mockBlogsList = [];

  // 1. Seed Builders (5 items)
  for (let i = 0; i < 5; i++) {
    const builderObj = {
      id: i + 2, // admin is ID 1
      supabase_uid: `mock-builder-${i}`,
      name: builderNames[i],
      email: `${builderNames[i].toLowerCase().replace(/\s+/g, '')}@asquare.com`,
      phone: `+91992901${1000 + i}`,
      role: 'builder',
      subscription_status: 'active'
    };
    mockUsersList.push(builderObj);
  }

  // 2. Seed Agents/Brokers (15 items)
  for (let i = 0; i < 15; i++) {
    const agentObj = {
      id: i + 7, // Starts immediately after 5 builders (IDs 2-6)
      supabase_uid: `mock-agent-${i}`,
      name: agentNames[i],
      email: `${agentNames[i].toLowerCase().replace(/\s+/g, '')}@asquare.com`,
      phone: `+91981901${2000 + i}`,
      role: 'broker',
      subscription_status: 'active'
    };
    mockUsersList.push(agentObj);
  }

  // 3. Seed 200 Properties
  const propCategories = ['apartment', 'villa', 'pg', 'commercial', 'plot', 'farmhouse'];
  const types = ['sale', 'rent', 'lease'];
  const furnishing = ['fully', 'semi', 'unfurnished'];
  const facings = ['East', 'West', 'North', 'South'];

  const lucknowAreas = ['Munshi Pulia', 'Indra Nagar', 'Gomti Nagar', 'Aliganj', 'Hazratganj', 'Rajajipuram', 'Vikas Nagar', 'Chinhat', 'Telibagh', 'Alambagh'];

  for (let i = 0; i < 200; i++) {
    const city = cities[i % cities.length];
    const category = propCategories[i % propCategories.length];
    const listingType = types[i % types.length];
    const BHK = (i % 4) + 1; // 1 to 4 BHK
    const price = listingType === 'sale' ? (2000000 + (i * 350000)) : (8000 + (i * 1200));
    const area = 600 + (i * 24);
    const locality = city === 'Lucknow' ? lucknowAreas[i % lucknowAreas.length] : `Sector ${(i % 15) + 1}`;
    const address = `Flat ${101 + (i % 20)}, ${locality}, Near Central Park`;
    const title = city === 'Lucknow' ? `${BHK} BHK ${category.replace('_', ' ')} in ${locality}, Lucknow` : `${BHK} BHK Luxury ${category.replace('_', ' ')} in ${city}`;
    const desc = `Premium luxury living environment in ${city}. Features modern spacing, close to main transit links, local markets, hospitals and standard schools. Designed inside a green aesthetic.`;

    const propObj = {
      id: i + 3,
      user_id: mockUsersList[i % mockUsersList.length].id,
      title,
      description: desc,
      category,
      listing_type: listingType,
      category_type: i % 2 === 0 ? 'new' : 'resale',
      price: parseFloat(price),
      area_sqft: area,
      bedrooms: BHK,
      bathrooms: Math.max(1, BHK - (i % 2)),
      facing: facings[i % facings.length],
      floor_number: i % 12,
      parking_spaces: (i % 2) + 1,
      furnishing_status: furnishing[i % furnishing.length],
      address,
      city,
      state: city === 'Lucknow' ? 'Uttar Pradesh' :
             city === 'Delhi' ? 'Delhi' :
             city === 'Noida' || city === 'Gurgaon' ? 'Haryana' :
             city === 'Jaipur' ? 'Rajasthan' :
             city === 'Pune' || city === 'Mumbai' ? 'Maharashtra' :
             city === 'Hyderabad' ? 'Telangana' :
             city === 'Bangalore' ? 'Karnataka' : 'Gujarat',
      pincode: `${302001 + (i % 99)}`,
      latitude: 17.385 + (i * 0.001),
      longitude: 78.486 - (i * 0.001),
      is_verified: i % 3 !== 0,
      approval_status: 'approved'
    };

    mockPropertiesList.push(propObj);

    // Save image
    mockImagesList.push({
      id: mockImagesList.length + 9, // Start after 8 pre-seeded images
      property_id: propObj.id,
      image_url: propertyImages[i % propertyImages.length],
      is_cover: true
    });
  }

  // 4. Seed 100 Reels
  const reelVideoUrls = [
    'https://www.w3schools.com/html/mov_bbb.mp4',
    'https://www.w3schools.com/html/movie.mp4'
  ];
  for (let i = 0; i < 100; i++) {
    const reelObj = {
      id: i + 4, // Start after 3 pre-seeded reels
      user_id: mockUsersList[i % mockUsersList.length].id,
      video_url: reelVideoUrls[i % reelVideoUrls.length],
      thumbnail_url: propertyImages[i % propertyImages.length],
      caption: `Beautiful home tour in ${cities[i % cities.length]}! #premium #asquare #realestate`,
      likes_count: 10 + (i * 5),
      views_count: 120 + (i * 32),
      approval_status: 'approved'
    };
    mockReelsList.push(reelObj);
  }

  // 5. Seed 100 Services
  const serviceCats = ['painter', 'electrician', 'plumber', 'packers', 'interior', 'cleaning', 'gardening', 'vastu', 'architecture', 'contractor'];
  const serviceImages = {
    painter: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
    electrician: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
    plumber: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=600&q=80',
    packers: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=600&q=80',
    interior: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80',
    cleaning: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80',
    gardening: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80',
    vastu: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80',
    architecture: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=80',
    contractor: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80'
  };

  for (let i = 0; i < 100; i++) {
    const cat = serviceCats[i % serviceCats.length];
    const servObj = {
      id: i + 3,
      name: `${agentNames[i % agentNames.length].split(' ')[0]} ${cat.charAt(0).toUpperCase() + cat.slice(1)} Services`,
      category: cat,
      contact_number: `+91991901${4000 + i}`,
      experience_years: (i % 12) + 2,
      ratings: parseFloat((4.0 + (i % 10) * 0.1).toFixed(1)),
      reviews_count: 22 + (i * 3),
      description: `Verified professional home ${cat} provider. High quality tools, guaranteed services, and standard sanitization measures.`,
      image_url: serviceImages[cat]
    };
    mockServicesList.push(servObj);
  }

  // 6. Seed 50 Blogs
  for (let i = 0; i < 50; i++) {
    const topic = blogTopics[i % blogTopics.length];
    const blogObj = {
      id: i + 2,
      title: `${topic.title} (Part ${Math.floor(i / blogTopics.length) + 1})`,
      slug: `${topic.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${i}`,
      content: `This article details complete updates regarding ${topic.title}. Indian real estate scales dynamically, and understanding these trends will significantly help you navigate property markets. Be sure to evaluate budget factors and local area specifications.`,
      category: topic.category,
      author_name: 'Manoj Soni',
      image_url: topic.img,
      views_count: 50 + (i * 4),
      created_at: new Date()
    };
    mockBlogsList.push(blogObj);
  }

  // Write to DB
  if (db.isMock()) {
    db.mockDb.users.push(...mockUsersList);
    db.mockDb.properties.push(...mockPropertiesList);
    db.mockDb.property_images.push(...mockImagesList);
    db.mockDb.reels.push(...mockReelsList);
    db.mockDb.services.push(...mockServicesList);
    db.mockDb.blogs.push(...mockBlogsList);
    
    // Seed mock banners
    if (!db.mockDb.homepage_banners) {
      db.mockDb.homepage_banners = [];
    }
    if (db.mockDb.homepage_banners.length === 0) {
      db.mockDb.homepage_banners.push({
        id: 1,
        image_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
        title: 'Find Your Dream Home',
        subtitle: 'Explore premium properties in top cities across India',
        link_url: '/search.html',
        is_active: true
      });
    }
    console.log('✅ Mock fallback database populated successfully!');
  } else {
    try {
      // 1. Seed users
      for (const u of mockUsersList) {
        await db.query(
          'INSERT INTO users (id, supabase_uid, name, email, phone, role, subscription_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [u.id, u.supabase_uid, u.name, u.email, u.phone, u.role, u.subscription_status]
        );
      }
      // 2. Seed properties
      for (const p of mockPropertiesList) {
        await db.query(
          `INSERT INTO properties 
          (id, user_id, title, description, category, listing_type, category_type, price, area_sqft, 
           bedrooms, bathrooms, facing, floor_number, parking_spaces, furnishing_status, 
           address, city, state, pincode, latitude, longitude, is_verified, approval_status) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
          [
            p.id, p.user_id, p.title, p.description, p.category, p.listing_type, p.category_type, p.price, p.area_sqft,
            p.bedrooms, p.bathrooms, p.facing, p.floor_number, p.parking_spaces, p.furnishing_status,
            p.address, p.city, p.state, p.pincode, p.latitude, p.longitude, p.is_verified
          ]
        );
      }
      // 3. Seed images
      for (const img of mockImagesList) {
        await db.query(
          'INSERT INTO property_images (id, property_id, image_url, is_cover) VALUES (?, ?, ?, ?)',
          [img.id, img.property_id, img.image_url, img.is_cover]
        );
      }
      // 4. Seed reels
      for (const r of mockReelsList) {
        await db.query(
          'INSERT INTO reels (id, user_id, video_url, caption, likes_count, views_count, approval_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [r.id, r.user_id, r.video_url, r.caption, r.likes_count, r.views_count, r.approval_status]
        );
      }
      // 5. Seed services
      for (const s of mockServicesList) {
        await db.query(
          'INSERT INTO services (id, name, category, contact_number, experience_years, ratings, reviews_count, description, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [s.id, s.name, s.category, s.contact_number, s.experience_years, s.ratings, s.reviews_count, s.description, s.image_url]
        );
      }
      // 6. Seed blogs
      for (const b of mockBlogsList) {
        await db.query(
          'INSERT INTO blogs (id, title, slug, content, category, author_name, image_url, views_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [b.id, b.title, b.slug, b.content, b.category, b.author_name, b.image_url, b.views_count]
        );
      }
      
      // 7. Seed initial homepage banner if empty
      const [bannerCount] = await db.query('SELECT COUNT(*) as count FROM homepage_banners');
      if (bannerCount[0].count === 0) {
        await db.query(
          'INSERT INTO homepage_banners (image_url, title, subtitle, link_url) VALUES (?, ?, ?, ?)',
          [
            'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
            'Find Your Dream Home',
            'Explore premium properties in top cities across India',
            '/search.html'
          ]
        );
        console.log('✅ Homepage banners table seeded successfully!');
      }

      console.log('✅ Physical MySQL database seeded successfully!');
    } catch (err) {
      console.error('❌ Database seeding error: ', err.message);
    }
  }
}

module.exports = {
  seedDatabaseData
};
