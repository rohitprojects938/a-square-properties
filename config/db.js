const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'house_renter',
  port: parseInt(process.env.DB_PORT || '3306')
};

let pool = null;
let isMock = false;

// Mock database storage for seamless fallback
const mockDb = {
  users: [
    { id: 1, supabase_uid: 'mock-admin-uid', name: 'Manoj Soni', email: 'manoj@houserenter.in', phone: '+919919014220', password_hash: '$2a$10$Vo4e4rCVfkkpsm1z58Ta.u9RhFcjnEOuL/qi3KIJrslm.4svnl5aW', role: 'admin', subscription_status: 'active', profile_photo: null, provider: 'email' }
  ],
  otps: [],
  properties: [
    {
      id: 1, user_id: 1,
      title: '3 BHK Premium Flat in Munshi Pulia, Lucknow',
      description: 'Spacious 3 BHK apartment in the heart of Munshi Pulia. East-facing, fully furnished with modular kitchen, 2 covered parking, near CRPF Chowk and City Mall. Society with gym and swimming pool.',
      category: 'apartment', listing_type: 'sale', category_type: 'new',
      price: 7500000, area_sqft: 1450, bedrooms: 3, bathrooms: 2,
      facing: 'East', floor_number: 4, parking_spaces: 2, furnishing_status: 'fully',
      address: 'Near CRPF Chowk, Munshi Pulia', city: 'Lucknow', state: 'Uttar Pradesh',
      pincode: '226012', latitude: 26.8927, longitude: 81.0002,
      is_verified: true, approval_status: 'approved', created_at: new Date()
    },
    {
      id: 2, user_id: 1,
      title: '2 BHK Ready-to-Move Flat in Indra Nagar, Lucknow',
      description: 'Beautiful 2 BHK flat on 5th floor with open balcony overlooking greenery. Near Sahara Ganj Mall & Vibhuti Khand. Semi-furnished with wardrobes, ACs and modular kitchen.',
      category: 'apartment', listing_type: 'rent', category_type: 'resale',
      price: 18000, area_sqft: 1100, bedrooms: 2, bathrooms: 2,
      facing: 'North', floor_number: 5, parking_spaces: 1, furnishing_status: 'semi',
      address: 'Sector C, Indra Nagar', city: 'Lucknow', state: 'Uttar Pradesh',
      pincode: '226016', latitude: 26.8652, longitude: 80.9919,
      is_verified: true, approval_status: 'approved', created_at: new Date()
    },
    {
      id: 3, user_id: 1,
      title: '4 BHK Luxury Villa in Gomti Nagar, Lucknow',
      description: 'Extravagant 4 BHK villa in premium Gomti Nagar Extension. Double-height ceiling, home theatre, private garden and terrace. Gated community with 24/7 security.',
      category: 'villa', listing_type: 'sale', category_type: 'new',
      price: 18500000, area_sqft: 3200, bedrooms: 4, bathrooms: 4,
      facing: 'South', floor_number: 0, parking_spaces: 3, furnishing_status: 'fully',
      address: 'Gomti Nagar Extension, Near Vrindavan Colony', city: 'Lucknow', state: 'Uttar Pradesh',
      pincode: '226010', latitude: 26.8429, longitude: 81.0187,
      is_verified: true, approval_status: 'approved', created_at: new Date()
    },
    {
      id: 4, user_id: 1,
      title: '1 BHK Studio Apartment near Munshi Pulia Metro',
      description: 'Compact and premium 1 BHK studio ideal for bachelors or couples. Walking distance from Munshi Pulia Metro Station. Fully furnished with AC, geyser, and fridge.',
      category: 'apartment', listing_type: 'rent', category_type: 'new',
      price: 10500, area_sqft: 550, bedrooms: 1, bathrooms: 1,
      facing: 'West', floor_number: 3, parking_spaces: 1, furnishing_status: 'fully',
      address: '200m from Munshi Pulia Metro, Near Kalyanpur', city: 'Lucknow', state: 'Uttar Pradesh',
      pincode: '226022', latitude: 26.8910, longitude: 80.9785,
      is_verified: true, approval_status: 'approved', created_at: new Date()
    },
    {
      id: 5, user_id: 1,
      title: 'Commercial Office Space in Hazratganj, Lucknow',
      description: 'Prime commercial office space on ground floor in the prestigious Hazratganj area. High footfall, great visibility. Ideal for retail, clinic, or office use.',
      category: 'commercial', listing_type: 'lease', category_type: 'new',
      price: 65000, area_sqft: 1800, bedrooms: 0, bathrooms: 2,
      facing: 'East', floor_number: 0, parking_spaces: 2, furnishing_status: 'unfurnished',
      address: 'Hazratganj Main Road, Near GPO', city: 'Lucknow', state: 'Uttar Pradesh',
      pincode: '226001', latitude: 26.8467, longitude: 80.9462,
      is_verified: true, approval_status: 'approved', created_at: new Date()
    },
    {
      id: 6, user_id: 1,
      title: '3 BHK Builder Floor in Indra Nagar',
      description: 'Spacious builder floor with private terrace access. Fully furnished with premium Italian tiles, U-shaped modular kitchen, 2 ACs and 2 geysers. Near Vinay Khand market.',
      category: 'apartment', listing_type: 'sale', category_type: 'resale',
      price: 6800000, area_sqft: 1600, bedrooms: 3, bathrooms: 3,
      facing: 'East', floor_number: 2, parking_spaces: 2, furnishing_status: 'fully',
      address: 'Vinay Khand, Indra Nagar', city: 'Lucknow', state: 'Uttar Pradesh',
      pincode: '226016', latitude: 26.8674, longitude: 80.9932,
      is_verified: true, approval_status: 'approved', created_at: new Date()
    },
    {
      id: 7, user_id: 1,
      title: '2 BHK Premium Apartment in Vibhuti Khand, Gomti Nagar',
      description: 'Modern 2 BHK with exceptional city views. Ready to move in. Society has swimming pool, clubhouse, badminton court. Near Wave Mall and Sahara Hospital.',
      category: 'apartment', listing_type: 'sale', category_type: 'new',
      price: 5900000, area_sqft: 1050, bedrooms: 2, bathrooms: 2,
      facing: 'North', floor_number: 8, parking_spaces: 1, furnishing_status: 'semi',
      address: 'Vibhuti Khand, Gomti Nagar', city: 'Lucknow', state: 'Uttar Pradesh',
      pincode: '226010', latitude: 26.8467, longitude: 81.0028,
      is_verified: true, approval_status: 'approved', created_at: new Date()
    },
    {
      id: 8, user_id: 1,
      title: 'Plot for Sale in Aashiyana, Lucknow',
      description: '200 sq yard corner plot in the Aashiyana residential colony. Approved layout. Society roads, water supply, drainage, and electricity connections provided.',
      category: 'plot', listing_type: 'sale', category_type: 'new',
      price: 3200000, area_sqft: 1800, bedrooms: 0, bathrooms: 0,
      facing: 'East', floor_number: 0, parking_spaces: 0, furnishing_status: 'unfurnished',
      address: 'Aashiyana Colony, Near Peermohani Chowk', city: 'Lucknow', state: 'Uttar Pradesh',
      pincode: '226012', latitude: 26.8756, longitude: 80.9610,
      is_verified: true, approval_status: 'approved', created_at: new Date()
    }
  ],
  property_images: [
    { id: 1, property_id: 1, image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80', is_cover: true },
    { id: 2, property_id: 2, image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80', is_cover: true },
    { id: 3, property_id: 3, image_url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=600&q=80', is_cover: true },
    { id: 4, property_id: 4, image_url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80', is_cover: true },
    { id: 5, property_id: 5, image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80', is_cover: true },
    { id: 6, property_id: 6, image_url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80', is_cover: true },
    { id: 7, property_id: 7, image_url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=600&q=80', is_cover: true },
    { id: 8, property_id: 8, image_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80', is_cover: true }
  ],
  property_videos: [],
  reels: [
    { id: 1, user_id: 1, video_url: 'https://www.w3schools.com/html/mov_bbb.mp4', thumbnail_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80', caption: '🏡 Premium 3BHK in Munshi Pulia! Book a visit today with Manoj Soni. #Lucknow #RealEstate #houserenterProperties', likes_count: 84, views_count: 1240, approval_status: 'approved', created_at: new Date() },
    { id: 2, user_id: 1, video_url: 'https://www.w3schools.com/html/movie.mp4', thumbnail_url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=400&q=80', caption: '🌟 Luxury Villa Tour - Gomti Nagar Extension, Lucknow! DM us for site visit. #GomtiNagar #Villa #Luxury', likes_count: 142, views_count: 2840, approval_status: 'approved', created_at: new Date() },
    { id: 3, user_id: 1, video_url: 'https://www.w3schools.com/html/mov_bbb.mp4', thumbnail_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80', caption: '✨ 2BHK Ready Home in Indra Nagar - Only ₹18,000/month! #IndiraNagar #FlatsForRent #Lucknow', likes_count: 62, views_count: 980, approval_status: 'approved', created_at: new Date() }
  ],
  reel_likes: [],
  reel_comments: [],
  services: [
    { id: 1, name: 'Raj Paint Services', category: 'painter', contact_number: '+919876543210', mobile_number: '+919876543210', whatsapp_number: '+919876543210', experience: '8 Years', starting_price: 15000, description: 'Premium wall painting, texture finish, and waterproofing services.', image_url: '/uploads/services/paint.webp', image_urls: JSON.stringify(['/uploads/services/paint.webp']), working_hours: '9 AM - 6 PM', available_days: 'Mon - Sat', website: 'https://rajpaint.in', status: 'approved', provider_name: 'Raj Kumar', created_at: new Date() },
    { id: 2, name: 'Suresh Wireman', category: 'electrician', contact_number: '+919876543211', mobile_number: '+919876543211', whatsapp_number: '+919876543211', experience: '5 Years', starting_price: 350, description: 'Residential wiring, switchboard installation, and electric repairs.', image_url: '/uploads/services/electric.webp', image_urls: JSON.stringify(['/uploads/services/electric.webp']), working_hours: '8 AM - 8 PM', available_days: 'All Days', website: '', status: 'approved', provider_name: 'Suresh Soni', created_at: new Date() }
  ],
  service_ratings: [
    { id: 1, user_id: 1, service_id: 1, rating: 5, review: 'Excellent painting service! High quality texture paint.', created_at: new Date() },
    { id: 2, user_id: 1, service_id: 2, rating: 4, review: 'Very professional wireman. Fixed short circuit issues instantly.', created_at: new Date() }
  ],
  blogs: [
    { id: 1, title: 'Real Estate Trends in India (2026)', slug: 'real-estate-trends-2026', content: 'Real estate in India is scaling higher. With digital processes and smart home requirements, buyers are shifting towards luxury yet affordable properties.', category: 'Market Trends', author_name: 'Manoj Soni', image_url: '/uploads/blogs/trends.webp', views_count: 104, created_at: new Date() }
  ],
  blog_comments: [],
  payments: [],
  subscriptions: [],
  notifications: [],
  saved_properties: [],
  property_views: [],
  visits: [],
  enquiries: [],
  customer_reviews: [
    { id: 1, name: 'Rahul Sharma', city: 'Lucknow', rating: 5, review_text: 'Found a rental house within two days. Very smooth experience.', status: 'approved', created_at: new Date('2026-07-28T12:00:00.000Z'), profile_photo: null },
    { id: 2, name: 'Priya Verma', city: 'Kanpur', rating: 5, review_text: 'The website is easy to use and the owner contacted me quickly.', status: 'approved', created_at: new Date('2026-07-28T13:00:00.000Z'), profile_photo: null },
    { id: 3, name: 'Aman Singh', city: 'Delhi', rating: 4, review_text: 'Good listings and fast response. Highly recommended.', status: 'approved', created_at: new Date('2026-07-28T14:00:00.000Z'), profile_photo: null },
    { id: 4, name: 'Neha Gupta', city: 'Noida', rating: 5, review_text: 'Very clean interface and genuine property listings.', status: 'approved', created_at: new Date('2026-07-28T15:00:00.000Z'), profile_photo: null }
  ]
};

async function initPool() {
  if (pool) return;
  const isProduction = process.env.NODE_ENV === 'production';
  const explicitMock = process.env.DB_MOCK === 'true';

  try {
    console.log('🔍 DEBUG DB ENV VARIABLES:');
    console.log('  DB_HOST:', process.env.DB_HOST);
    console.log('  DB_USER:', process.env.DB_USER);
    console.log('  DB_NAME:', process.env.DB_NAME);
    console.log('  DB_PORT:', process.env.DB_PORT);
    console.log('  NODE_ENV:', process.env.NODE_ENV);
    console.log('  Password length:', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0);
    console.log('🔍 EXACT dbConfig object passed to mysql.createPool():', JSON.stringify({
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      port: dbConfig.port,
      password: dbConfig.password ? 'REDACTED (Length: ' + dbConfig.password.length + ')' : 'EMPTY'
    }));
    pool = mysql.createPool(dbConfig);
    // Test connection
    const conn = await pool.getConnection();
    console.log('✅ Connected to MySQL Database: ' + dbConfig.database);
    conn.release();
  } catch (error) {
    if (explicitMock) {
      console.warn('⚠️ MySQL connection failed. Error: ', error.message);
      console.warn('⚡ Initializing in-memory MOCK database for House Rental application fallback.');
      isMock = true;
    } else {
      console.error('❌ CRITICAL MySQL connection failed: ', error.message);
      throw new Error(`CRITICAL MySQL connection failed: ${error.message}`);
    }
  }
}

// Custom mock executor mapping simple SQL statements to mock structures
async function executeMock(sql, params = []) {
  const normalizedSql = sql.replace(/\s+/g, ' ').trim().toLowerCase();
  console.log('⚡ Mock SQL:', sql, 'Params:', params);

  // 1. SELECT USERS
  if (normalizedSql.includes('from users') && normalizedSql.startsWith('select')) {
    if (normalizedSql.includes('email = ?')) {
      const email = params[0];
      const match = mockDb.users.find(u => u.email === email);
      return [match ? [match] : []];
    }
    if (normalizedSql.includes('phone = ?')) {
      const phone = params[0];
      const match = mockDb.users.find(u => u.phone === phone);
      return [match ? [match] : []];
    }
    if (normalizedSql.includes('google_id = ?')) {
      const googleId = params[0];
      const match = mockDb.users.find(u => u.google_id === googleId);
      return [match ? [match] : []];
    }
    if (normalizedSql.includes('supabase_uid = ?')) {
      const uid = params[0];
      const match = mockDb.users.find(u => u.supabase_uid === uid);
      return [match ? [match] : []];
    }
    if (normalizedSql.includes('id = ?')) {
      const id = parseInt(params[0]);
      const match = mockDb.users.find(u => u.id === id);
      return [match ? [match] : []];
    }
    return [mockDb.users];
  }

  // 1b. OTP OPERATIONS
  if (normalizedSql.includes('from otps') && normalizedSql.startsWith('select')) {
    if (normalizedSql.includes('phone_or_email = ?')) {
      const phoneOrEmail = params[0];
      const matches = mockDb.otps.filter(o => o.phone_or_email === phoneOrEmail && o.expires_at > new Date());
      return [matches];
    }
    return [mockDb.otps];
  }

  if (normalizedSql.startsWith('insert into otps')) {
    const otp = {
      id: mockDb.otps.length + 1,
      phone_or_email: params[0],
      otp_code: params[1],
      expires_at: params[2],
      created_at: new Date(),
      attempts: params[3] !== undefined ? params[3] : 0
    };
    mockDb.otps = mockDb.otps.filter(o => o.phone_or_email !== params[0]);
    mockDb.otps.push(otp);
    return [{ insertId: otp.id }];
  }

  if (normalizedSql.startsWith('update otps')) {
    if (normalizedSql.includes('attempts = attempts + 1')) {
      const idVal = parseInt(params[0]);
      const match = mockDb.otps.find(o => o.id === idVal);
      if (match) {
        match.attempts = (match.attempts || 0) + 1;
      }
      return [{ affectedRows: match ? 1 : 0 }];
    }
  }

  if (normalizedSql.startsWith('delete from otps')) {
    const phoneOrEmail = params[0];
    const initialLen = mockDb.otps.length;
    mockDb.otps = mockDb.otps.filter(o => o.phone_or_email !== phoneOrEmail);
    const affected = initialLen - mockDb.otps.length;
    return [{ affectedRows: affected }];
  }

  // 2. INSERT USER
  if (normalizedSql.startsWith('insert into users')) {
    const matchCols = sql.match(/insert\s+into\s+users\s*\(([^)]+)\)/i);
    const newUser = {
      id: mockDb.users.length + 1,
      supabase_uid: null,
      name: '',
      email: '',
      phone: null,
      password_hash: null,
      role: 'user',
      profile_picture: null,
      profile_photo: null,
      provider: 'email',
      google_id: null,
      subscription_status: 'inactive',
      created_at: new Date()
    };
    if (matchCols && params.length > 0) {
      const cols = matchCols[1].split(',').map(c => c.trim().toLowerCase());
      cols.forEach((col, idx) => {
        if (col === 'supabase_uid') newUser.supabase_uid = params[idx];
        else if (col === 'name') newUser.name = params[idx];
        else if (col === 'email') newUser.email = params[idx];
        else if (col === 'phone') newUser.phone = params[idx];
        else if (col === 'password_hash') newUser.password_hash = params[idx];
        else if (col === 'role') newUser.role = params[idx];
        else if (col === 'profile_picture') {
          newUser.profile_picture = params[idx];
          if (!newUser.profile_photo) newUser.profile_photo = params[idx];
        }
        else if (col === 'profile_photo') {
          newUser.profile_photo = params[idx];
          if (!newUser.profile_picture) newUser.profile_picture = params[idx];
        }
        else if (col === 'provider') newUser.provider = params[idx];
        else if (col === 'google_id') newUser.google_id = params[idx];
        else if (col === 'subscription_status') newUser.subscription_status = params[idx];
      });
    } else {
      newUser.name = params[0] || 'Unknown';
      newUser.email = params[1] || '';
      newUser.phone = params[2] || null;
      newUser.password_hash = params[3] || null;
      newUser.role = params[4] || 'user';
    }
    mockDb.users.push(newUser);
    return [{ insertId: newUser.id }];
  }

  // 2b. UPDATE USER
  if (normalizedSql.startsWith('update users')) {
    const uidMatch = normalizedSql.match(/where\s+id\s*=\s*\?/i);
    const supUidMatch = normalizedSql.match(/where\s+supabase_uid\s*=\s*\?/i);
    let matchUser;
    if (uidMatch) {
      const idVal = parseInt(params[params.length - 1]);
      matchUser = mockDb.users.find(u => u.id === idVal);
    } else if (supUidMatch) {
      const supUidVal = params[params.length - 1];
      matchUser = mockDb.users.find(u => u.supabase_uid === supUidVal);
    }
    if (matchUser && params.length > 0) {
      const setPart = sql.match(/set\s+([\s\S]+?)\s+where/i);
      if (setPart) {
        const sets = setPart[1].split(',').map(s => s.split('=')[0].trim().toLowerCase());
        sets.forEach((col, idx) => {
          if (col === 'role') matchUser.role = params[idx];
          else if (col === 'name') matchUser.name = params[idx];
          else if (col === 'phone') matchUser.phone = params[idx];
          else if (col === 'profile_picture') {
            matchUser.profile_picture = params[idx];
            matchUser.profile_photo = params[idx];
          }
          else if (col === 'profile_photo') {
            matchUser.profile_photo = params[idx];
            matchUser.profile_picture = params[idx];
          }
          else if (col === 'provider') matchUser.provider = params[idx];
          else if (col === 'subscription_status') matchUser.subscription_status = params[idx];
          else if (col === 'google_id') matchUser.google_id = params[idx];
        });
      }
    }
    return [{ affectedRows: matchUser ? 1 : 0 }];
  }

  // 3. SELECT PROPERTIES (supports pagination, is_hidden, is_featured, approval_status)
  if (normalizedSql.startsWith('select p.*') || normalizedSql.startsWith('select * from properties') || 
      normalizedSql.includes('from properties p') || normalizedSql.includes('count_q') || normalizedSql.includes('gps_filtered') || normalizedSql.includes('count(*) as total from (')) {
    
    // If this is the COUNT wrapper query, extract inner query handling
    const isCountQuery = normalizedSql.includes('count(*) as total from (') || normalizedSql.includes('count_q');

    // Build enriched property list
    let list = mockDb.properties.map(p => {
      const views = mockDb.property_views.filter(v => v.property_id === p.id).length;
      const cover = mockDb.property_images.find(img => img.property_id === p.id && img.is_cover);
      const owner = mockDb.users.find(u => u.id === p.user_id);
      return { 
        ...p, 
        views_count: views,
        cover_image: cover ? cover.image_url : null,
        owner_name: owner ? owner.name : 'Unknown',
        owner_phone: owner ? owner.phone : '',
        is_hidden: p.is_hidden || 0,
        is_featured: p.is_featured || 0
      };
    });

    let paramIdx = 0;

    // approval_status filter (public only approved)
    if (normalizedSql.includes("approval_status = 'approved'")) {
      list = list.filter(p => p.approval_status === 'approved');
    }

    // is_hidden filter (public: exclude hidden)
    if (normalizedSql.includes('is_hidden') && normalizedSql.includes('is_hidden = 0')) {
      list = list.filter(p => !p.is_hidden || p.is_hidden === 0);
    }

    // is_featured filter
    if (normalizedSql.includes('p.is_featured = 1') || normalizedSql.includes('is_featured = 1')) {
      list = list.filter(p => p.is_featured === 1);
    }

    // user_id filter
    if (normalizedSql.includes('user_id = ?') || normalizedSql.includes('p.user_id = ?')) {
      const userIdVal = parseInt(params[paramIdx]);
      list = list.filter(p => p.user_id === userIdVal);
      paramIdx++;
    }
    
    // City / pincode
    if (normalizedSql.includes('city like ?')) {
      const cityVal = params[paramIdx].replace(/%/g, '').toLowerCase();
      const pincodeVal = params[paramIdx + 1];
      list = list.filter(p => p.city.toLowerCase().includes(cityVal) || p.pincode === pincodeVal);
      paramIdx += 2;
    }
    
    // Search text (title, description, address, city)
    if (normalizedSql.includes('title like ?')) {
      const sVal = params[paramIdx].replace(/%/g, '').toLowerCase();
      list = list.filter(p => 
        p.title.toLowerCase().includes(sVal) || 
        (p.description||'').toLowerCase().includes(sVal) || 
        (p.address||'').toLowerCase().includes(sVal) ||
        (p.city||'').toLowerCase().includes(sVal)
      );
      paramIdx += 4; // title, description, address, city = 4 params
    }

    // Category
    if (normalizedSql.includes('p.category = ?') || normalizedSql.includes('category = ?')) {
      list = list.filter(p => p.category === params[paramIdx]);
      paramIdx++;
    }

    // Listing type
    if (normalizedSql.includes('p.listing_type = ?') || normalizedSql.includes('listing_type = ?')) {
      list = list.filter(p => p.listing_type === params[paramIdx]);
      paramIdx++;
    }

    // Furnishing
    if (normalizedSql.includes('p.furnishing_status = ?') || normalizedSql.includes('furnishing_status = ?')) {
      list = list.filter(p => p.furnishing_status === params[paramIdx]);
      paramIdx++;
    }

    // Price range
    if (normalizedSql.includes('p.price >= ?') || normalizedSql.includes('price >= ?')) {
      list = list.filter(p => p.price >= parseFloat(params[paramIdx]));
      paramIdx++;
    }
    if (normalizedSql.includes('p.price <= ?') || normalizedSql.includes('price <= ?')) {
      list = list.filter(p => p.price <= parseFloat(params[paramIdx]));
      paramIdx++;
    }

    // Bedrooms
    if (normalizedSql.includes('p.bedrooms >= ?') || normalizedSql.includes('bedrooms >= ?')) {
      list = list.filter(p => p.bedrooms >= parseInt(params[paramIdx]));
      paramIdx++;
    }

    // Bathrooms
    if (normalizedSql.includes('p.bathrooms >= ?') || normalizedSql.includes('bathrooms >= ?')) {
      list = list.filter(p => p.bathrooms >= parseInt(params[paramIdx]));
      paramIdx++;
    }

    // Area
    if (normalizedSql.includes('p.area_sqft >= ?') || normalizedSql.includes('area_sqft >= ?')) {
      list = list.filter(p => p.area_sqft >= parseInt(params[paramIdx]));
      paramIdx++;
    }
    if (normalizedSql.includes('p.area_sqft <= ?') || normalizedSql.includes('area_sqft <= ?')) {
      list = list.filter(p => p.area_sqft <= parseInt(params[paramIdx]));
      paramIdx++;
    }

    // GPS Haversine
    const latRegex = /radians\(([0-9.-]+)\)/g;
    const latMatch = latRegex.exec(sql);
    const lngMatch = latRegex.exec(sql);
    if (latMatch && lngMatch) {
      const latVal = parseFloat(latMatch[1]);
      const lngVal = parseFloat(lngMatch[1]);
      list = list.map(p => {
        const dLat = (parseFloat(p.latitude||0) - latVal) * Math.PI / 180;
        const dLon = (parseFloat(p.longitude||0) - lngVal) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(latVal*Math.PI/180) * Math.cos(parseFloat(p.latitude||0)*Math.PI/180) * Math.sin(dLon/2)**2;
        return { ...p, distance: 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) };
      });
      if (normalizedSql.includes('distance <=')) {
        const radiusVal = parseFloat(params[paramIdx]);
        paramIdx++;
        list = list.filter(p => p.distance <= radiusVal);
      }
    }

    // Sort
    if (normalizedSql.includes('order by price asc')) {
      list.sort((a,b) => a.price - b.price);
    } else if (normalizedSql.includes('order by price desc')) {
      list.sort((a,b) => b.price - a.price);
    } else if (normalizedSql.includes('order by distance asc')) {
      list.sort((a,b) => (a.distance||0) - (b.distance||0));
    } else if (normalizedSql.includes('is_featured desc')) {
      list.sort((a,b) => (b.is_featured||0) - (a.is_featured||0) || b.id - a.id);
    } else {
      list.sort((a,b) => b.id - a.id);
    }

    // If COUNT query, return total before pagination
    if (isCountQuery) {
      return [[{ total: list.length }]];
    }

    // Single item by id
    if (/\b(?:p\.)?id\s*=\s*\?/i.test(normalizedSql) && !normalizedSql.includes('limit ?')) {
      const matchId = parseInt(params[params.length - 1]);
      const match = list.find(p => p.id === matchId);
      return [match ? [match] : []];
    }

    // Pagination: LIMIT ? OFFSET ?
    if (normalizedSql.includes('limit ? offset ?') || normalizedSql.includes('limit ?')) {
      const limitVal  = parseInt(params[params.length - 2]) || parseInt(params[params.length - 1]) || 12;
      const offsetVal = normalizedSql.includes('limit ? offset ?') ? (parseInt(params[params.length - 1]) || 0) : 0;
      return [list.slice(offsetVal, offsetVal + limitVal)];
    }

    return [list];
  }

  // 4. INSERT PROPERTY
  if (normalizedSql.startsWith('insert into properties')) {
    const newProp = {
      id: mockDb.properties.length + 1,
      user_id: params[0],
      title: params[1],
      description: params[2],
      category: params[3],
      listing_type: params[4],
      category_type: params[5],
      price: parseFloat(params[6]),
      area_sqft: parseInt(params[7]),
      bedrooms: parseInt(params[8]),
      bathrooms: parseInt(params[9]),
      facing: params[10],
      floor_number: parseInt(params[11]),
      parking_spaces: parseInt(params[12]),
      furnishing_status: params[13],
      address: params[14],
      city: params[15],
      state: params[16],
      pincode: params[17],
      latitude: params[18] ? parseFloat(params[18]) : null,
      longitude: params[19] ? parseFloat(params[19]) : null,
      is_verified: false,
      approval_status: 'approved',
      is_hidden: 0,
      is_featured: 0,
      created_at: new Date()
    };
    mockDb.properties.push(newProp);
    return [{ insertId: newProp.id }];
  }

  // 4a. UPDATE PROPERTIES (admin controls: approval, hidden, featured)
  if (normalizedSql.startsWith('update properties')) {
    const idMatch = normalizedSql.match(/where\s+id\s*=\s*\?/);
    if (idMatch) {
      const pid = parseInt(params[params.length - 1]);
      const prop = mockDb.properties.find(p => p.id === pid);
      if (prop) {
        const setPart = sql.match(/set\s+([\s\S]+?)\s+where/i);
        if (setPart) {
          const sets = setPart[1].split(',').map(s => s.split('=')[0].trim().toLowerCase());
          sets.forEach((col, idx) => {
            if (col === 'approval_status') prop.approval_status = params[idx];
            else if (col === 'is_hidden')  prop.is_hidden  = parseInt(params[idx]);
            else if (col === 'is_featured') prop.is_featured = parseInt(params[idx]);
            else if (col === 'title')      prop.title = params[idx];
            else if (col === 'price')      prop.price = parseFloat(params[idx]);
          });
        }
      }
      return [{ affectedRows: prop ? 1 : 0 }];
    }
  }

  // DELETE USER & ASSOCIATED PROPERTIES
  if (normalizedSql.startsWith('delete from users')) {
    const uid = parseInt(params[0]);
    const before = mockDb.users.length;
    mockDb.users = mockDb.users.filter(u => u.id !== uid);
    return [{ affectedRows: before - mockDb.users.length }];
  }
  if (normalizedSql.startsWith('delete from properties where user_id')) {
    const uid = parseInt(params[0]);
    const before = mockDb.properties.length;
    mockDb.properties = mockDb.properties.filter(p => p.user_id !== uid);
    return [{ affectedRows: before - mockDb.properties.length }];
  }

  // 4b. DELETE PROPERTY and related tables
  if (normalizedSql.startsWith('delete from properties')) {
    const pid = parseInt(params[0]);
    const before = mockDb.properties.length;
    mockDb.properties = mockDb.properties.filter(p => p.id !== pid);
    return [{ affectedRows: before - mockDb.properties.length }];
  }
  if (normalizedSql.startsWith('delete from property_images')) {
    const pid = parseInt(params[0]);
    const before = mockDb.property_images.length;
    mockDb.property_images = mockDb.property_images.filter(img => img.property_id !== pid);
    return [{ affectedRows: before - mockDb.property_images.length }];
  }
  if (normalizedSql.startsWith('delete from saved_properties')) {
    if (normalizedSql.includes('user_id = ?') && normalizedSql.includes('property_id = ?')) {
      const uid = parseInt(params[0], 10);
      const pid = parseInt(params[1], 10);
      const before = mockDb.saved_properties.length;
      mockDb.saved_properties = mockDb.saved_properties.filter(s => !(s.user_id === uid && s.property_id === pid));
      return [{ affectedRows: before - mockDb.saved_properties.length }];
    }
    const pid = parseInt(params[0], 10);
    const before = mockDb.saved_properties.length;
    mockDb.saved_properties = mockDb.saved_properties.filter(s => s.property_id !== pid);
    return [{ affectedRows: before - mockDb.saved_properties.length }];
  }
  if (normalizedSql.startsWith('delete from property_views')) {
    const pid = parseInt(params[0]);
    const before = mockDb.property_views.length;
    mockDb.property_views = mockDb.property_views.filter(v => v.property_id !== pid);
    return [{ affectedRows: before - mockDb.property_views.length }];
  }

  // 4c. SELECT user_id from properties WHERE id (for delete ownership check)
  if (normalizedSql.startsWith('select user_id from properties where id')) {
    const pid = parseInt(params[0]);
    const match = mockDb.properties.find(p => p.id === pid);
    return [match ? [{ user_id: match.user_id }] : []];
  }

  // 4d. Admin SELECT: id, title, price, city... FROM properties p JOIN users
  if (normalizedSql.includes('from properties p') && normalizedSql.includes('join users u') && normalizedSql.includes('order by p.id desc limit')) {
    const lim = parseInt(params[0]) || 20;
    const off = parseInt(params[1]) || 0;
    const list = mockDb.properties.slice().reverse().slice(off, off + lim).map(p => {
      const u = mockDb.users.find(u => u.id === p.user_id) || {};
      return { ...p, owner_name: u.name || '', owner_email: u.email || '' };
    });
    return [list];
  }

  // 4e. COUNT(*) from properties (for admin pagination)
  if (normalizedSql.startsWith('select count(*) as total from properties')) {
    return [[{ total: mockDb.properties.length }]];
  }

  // 5. INSERT PROPERTY IMAGE
  if (normalizedSql.startsWith('insert into property_images')) {
    const newImg = {
      id: mockDb.property_images.length + 1,
      property_id: params[0],
      image_url: params[1],
      is_cover: params[2] || false
    };
    mockDb.property_images.push(newImg);
    return [{ insertId: newImg.id }];
  }

  // 6. SELECT IMAGES
  if (normalizedSql.startsWith('select * from property_images')) {
    if (normalizedSql.includes('property_id = ?')) {
      const pid = parseInt(params[0]);
      return [mockDb.property_images.filter(img => img.property_id === pid)];
    }
    return [mockDb.property_images];
  }

  // 4b. REELS (moved up before users so JOIN queries don't get mis-captured)
  if (normalizedSql.includes('from reels') || normalizedSql.includes('from reel_likes') || normalizedSql.includes('from reel_comments') || (normalizedSql.includes('reel_likes') && !normalizedSql.includes('users')) || (normalizedSql.includes('reel_comments') && !normalizedSql.includes('users')) || (normalizedSql.includes('reels') && !normalizedSql.includes('from properties'))) {
    // COUNT reel_likes
    if (normalizedSql.includes('count(*)') && normalizedSql.includes('reel_likes')) {
      const reelId = parseInt(params[0]);
      const cnt = mockDb.reel_likes.filter(l => l.reel_id === reelId).length;
      return [[{ count: cnt }]];
    }
    // SELECT reel_comments (with or without JOIN)
    if (normalizedSql.includes('reel_comments') && normalizedSql.startsWith('select')) {
      const reelId = parseInt(params[0]);
      const comments = mockDb.reel_comments.filter(c => c.reel_id === reelId).map(c => {
        const u = mockDb.users.find(u => u.id === c.user_id);
        return { ...c, user_name: u ? u.name : 'User', user_pic: u ? u.profile_picture : null };
      });
      return [comments];
    }
    // SELECT reel_likes (check if user liked)
    if (normalizedSql.includes('reel_likes') && normalizedSql.startsWith('select')) {
      const reelId = parseInt(params[0]);
      const userId = params[1] ? parseInt(params[1]) : null;
      if (userId) {
        return [mockDb.reel_likes.filter(l => l.reel_id === reelId && l.user_id === userId)];
      }
      return [mockDb.reel_likes.filter(l => l.reel_id === reelId)];
    }
    // SELECT reels with JOIN users
    if (normalizedSql.startsWith('select') && (normalizedSql.includes('from reels') || normalizedSql.includes('reels r'))) {
      let reelsList = mockDb.reels;
      
      // Filter by user_id if present
      if (normalizedSql.includes('user_id = ?') || normalizedSql.includes('r.user_id = ?')) {
        const uid = parseInt(params[0], 10);
        reelsList = reelsList.filter(r => r.user_id === uid);
      }
      
      reelsList = reelsList
        .filter(r => r.approval_status === 'approved')
        .map(r => {
          const creator = mockDb.users.find(u => u.id === r.user_id);
          return {
            ...r,
            creator_name: creator ? creator.name : 'Manoj Soni',
            creator_pic: creator ? creator.profile_picture : null
          };
        })
        .sort((a, b) => b.id - a.id);
      return [reelsList];
    }
    if (normalizedSql.startsWith('insert') && normalizedSql.includes('reels')) {
      const newReel = {
        id: mockDb.reels.length + 1,
        user_id: params[0],
        video_url: params[1],
        caption: params[2],
        likes_count: 0,
        views_count: 0,
        approval_status: 'approved',
        created_at: new Date()
      };
      mockDb.reels.push(newReel);
      return [{ insertId: newReel.id }];
    }
  }

  // 8. SERVICES (Consolidated in the main services block below)

  // 9. BLOGS
  if (normalizedSql.includes('blogs')) {
    if (normalizedSql.includes('slug = ?')) {
      const slug = params[0];
      const match = mockDb.blogs.find(b => b.slug === slug);
      return [match ? [match] : []];
    }
    return [mockDb.blogs];
  }

  // 10. PAYMENTS / SUBSCRIPTIONS
  if (normalizedSql.startsWith('insert into payments')) {
    const pay = { id: mockDb.payments.length + 1, user_id: params[0], razorpay_order_id: params[1], amount: params[2], status: 'pending' };
    mockDb.payments.push(pay);
    return [{ insertId: pay.id }];
  }
  if (normalizedSql.startsWith('update payments')) {
    const pay = mockDb.payments.find(p => p.razorpay_order_id === params[1]);
    if (pay) {
      pay.status = params[0];
      pay.razorpay_payment_id = params[2] || 'pay_mock123';
    }
    return [{ affectedRows: 1 }];
  }
  if (normalizedSql.startsWith('insert into subscriptions')) {
    const sub = { id: mockDb.subscriptions.length + 1, user_id: params[0], end_date: params[1] };
    mockDb.subscriptions.push(sub);
    // update user
    const usr = mockDb.users.find(u => u.id === params[0]);
    if (usr) usr.subscription_status = 'active';
    return [{ insertId: sub.id }];
  }

  // 11. SAVED PROPERTIES
  if (normalizedSql.includes('saved_properties')) {
    if (normalizedSql.startsWith('insert')) {
      const newSave = { id: mockDb.saved_properties.length + 1, user_id: params[0], property_id: params[1] };
      mockDb.saved_properties.push(newSave);
      return [{ insertId: newSave.id }];
    }
    if (normalizedSql.startsWith('delete')) {
      if (normalizedSql.includes('user_id = ?') && normalizedSql.includes('property_id = ?')) {
        const uid = parseInt(params[0], 10);
        const pid = parseInt(params[1], 10);
        const prevLen = mockDb.saved_properties.length;
        mockDb.saved_properties = mockDb.saved_properties.filter(s => !(s.user_id === uid && s.property_id === pid));
        return [{ affectedRows: prevLen - mockDb.saved_properties.length }];
      } else if (normalizedSql.includes('property_id = ?')) {
        const pid = parseInt(params[0], 10);
        const prevLen = mockDb.saved_properties.length;
        mockDb.saved_properties = mockDb.saved_properties.filter(s => s.property_id !== pid);
        return [{ affectedRows: prevLen - mockDb.saved_properties.length }];
      }
    }
    if (normalizedSql.startsWith('select')) {
      if (normalizedSql.includes('user_id = ?') && normalizedSql.includes('property_id = ?')) {
        const uid = parseInt(params[0], 10);
        const pid = parseInt(params[1], 10);
        const matches = mockDb.saved_properties.filter(s => s.user_id === uid && s.property_id === pid);
        return [matches];
      }
      const uid = parseInt(params[0], 10);
      const savedIds = mockDb.saved_properties.filter(s => s.user_id === uid).map(s => s.property_id);
      const properties = mockDb.properties.filter(p => savedIds.includes(p.id));
      return [properties];
    }
  }

  // 12. ADMIN STATS & COUNT COUNTERS
  if (normalizedSql.includes('count(*)') || normalizedSql.includes('count(1)')) {
    if (normalizedSql.includes('from users')) {
      if (normalizedSql.includes("subscription_status = 'active'")) {
        return [[{ c: mockDb.users.filter(u => u.subscription_status === 'active').length, count: mockDb.users.filter(u => u.subscription_status === 'active').length }]];
      }
      if (normalizedSql.includes("provider = 'google'")) {
        return [[{ c: mockDb.users.filter(u => u.provider === 'google').length, count: mockDb.users.filter(u => u.provider === 'google').length }]];
      }
      if (normalizedSql.includes('date(created_at) = curdate()')) {
        return [[{ c: 0, count: 0 }]];
      }
      return [[{ c: mockDb.users.length, count: mockDb.users.length }]];
    }
    if (normalizedSql.includes('from properties')) {
      if (normalizedSql.includes("approval_status = 'pending'")) {
        return [[{ c: mockDb.properties.filter(p => p.approval_status === 'pending').length, count: mockDb.properties.filter(p => p.approval_status === 'pending').length }]];
      }
      if (normalizedSql.includes("approval_status = 'approved'")) {
        return [[{ c: mockDb.properties.filter(p => p.approval_status === 'approved').length, count: mockDb.properties.filter(p => p.approval_status === 'approved').length }]];
      }
      if (normalizedSql.includes("approval_status = 'rejected'")) {
        return [[{ c: mockDb.properties.filter(p => p.approval_status === 'rejected').length, count: mockDb.properties.filter(p => p.approval_status === 'rejected').length }]];
      }
      if (normalizedSql.includes('is_featured = 1')) {
        return [[{ c: mockDb.properties.filter(p => p.is_featured === 1).length, count: mockDb.properties.filter(p => p.is_featured === 1).length }]];
      }
      if (normalizedSql.includes('is_hidden = 1')) {
        return [[{ c: mockDb.properties.filter(p => p.is_hidden === 1).length, count: mockDb.properties.filter(p => p.is_hidden === 1).length }]];
      }
      if (normalizedSql.includes('date(created_at) = curdate()')) {
        return [[{ c: 0, count: 0 }]];
      }
      return [[{ c: mockDb.properties.length, count: mockDb.properties.length }]];
    }
    if (normalizedSql.includes('from subscriptions')) {
      return [[{ c: mockDb.subscriptions.length, count: mockDb.subscriptions.length }]];
    }
    if (normalizedSql.includes('from reels')) {
      return [[{ c: mockDb.reels.length, count: mockDb.reels.length }]];
    }
    if (normalizedSql.includes('from blogs')) {
      return [[{ c: mockDb.blogs.length, count: mockDb.blogs.length }]];
    }
  }

  // REVENUE SUMS
  if (normalizedSql.includes('sum(amount)')) {
    const successPayments = mockDb.payments.filter(p => p.status === 'success');
    const totalRev = successPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    return [[{ s: totalRev, sum: totalRev }]];
  }

  // 13. USERS MANAGEMENT (paginated & filtered)
  if (normalizedSql.includes('select u.id') && normalizedSql.includes('from users u')) {
    const searchVal = params[0] ? params[0].replace(/%/g, '').toLowerCase() : '';
    let filteredUsers = mockDb.users;
    if (searchVal) {
      filteredUsers = filteredUsers.filter(u => 
        (u.name || '').toLowerCase().includes(searchVal) || 
        (u.email || '').toLowerCase().includes(searchVal) || 
        (u.phone || '').toLowerCase().includes(searchVal)
      );
    }
    const limitVal = params[params.length - 2] || 20;
    const offsetVal = params[params.length - 1] || 0;
    const list = filteredUsers.slice(offsetVal, offsetVal + limitVal).map(u => {
      return {
        ...u,
        properties_count: mockDb.properties.filter(p => p.user_id === u.id).length
      };
    });
    return [list];
  }
  if (normalizedSql.startsWith('select count(*) as total from users u')) {
    const searchVal = params[0] ? params[0].replace(/%/g, '').toLowerCase() : '';
    let filteredUsers = mockDb.users;
    if (searchVal) {
      filteredUsers = filteredUsers.filter(u => 
        (u.name || '').toLowerCase().includes(searchVal) || 
        (u.email || '').toLowerCase().includes(searchVal) || 
        (u.phone || '').toLowerCase().includes(searchVal)
      );
    }
    return [[{ total: filteredUsers.length }]];
  }

  // 14. ADMIN CRUD ACTIONS MOCKS

  // A. BLOGS CRUD
  if (normalizedSql.includes('blogs') || normalizedSql.includes('from blogs')) {
    if (normalizedSql.startsWith('select')) {
      const pageLimit = parseInt(params[0]) || 20;
      const pageOffset = parseInt(params[1]) || 0;
      const list = mockDb.blogs.slice().reverse().slice(pageOffset, pageOffset + pageLimit);
      return [list];
    }
    if (normalizedSql.startsWith('insert')) {
      const matchCols = sql.match(/insert\s+into\s+blogs\s*\(([^)]+)\)/i);
      const newBlog = {
        id: mockDb.blogs.length + 1,
        title: '',
        slug: '',
        content: '',
        excerpt: '',
        image_url: '',
        featured_image: '',
        status: 'draft',
        author_name: 'Admin',
        author: 'Admin',
        created_at: new Date()
      };
      if (matchCols && params.length > 0) {
        const cols = matchCols[1].split(',').map(c => c.trim().toLowerCase());
        cols.forEach((col, idx) => {
          if (col === 'title') newBlog.title = params[idx];
          else if (col === 'slug') newBlog.slug = params[idx];
          else if (col === 'content') newBlog.content = params[idx];
          else if (col === 'excerpt') newBlog.excerpt = params[idx];
          else if (col === 'featured_image' || col === 'image_url') {
            newBlog.featured_image = params[idx];
            newBlog.image_url = params[idx];
          }
          else if (col === 'status') newBlog.status = params[idx];
          else if (col === 'author') {
            newBlog.author = params[idx];
            newBlog.author_name = params[idx];
          }
        });
      } else {
        newBlog.title = params[0];
        newBlog.content = params[1];
        newBlog.excerpt = params[2] || '';
        newBlog.featured_image = params[3] || '';
        newBlog.image_url = params[3] || '';
        newBlog.status = params[4] || 'draft';
        newBlog.author = params[5] || 'Admin';
        newBlog.author_name = params[5] || 'Admin';
      }
      if (!newBlog.slug && newBlog.title) {
        newBlog.slug = newBlog.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
      }
      mockDb.blogs.push(newBlog);
      return [{ insertId: newBlog.id }];
    }
    if (normalizedSql.startsWith('update')) {
      const bid = parseInt(params[params.length - 1]);
      const blog = mockDb.blogs.find(b => b.id === bid);
      if (blog) {
        blog.title = params[0];
        blog.content = params[1];
        blog.excerpt = params[2];
        blog.featured_image = params[3];
        blog.image_url = params[3];
        blog.status = params[4];
      }
      return [{ affectedRows: blog ? 1 : 0 }];
    }
    if (normalizedSql.startsWith('delete')) {
      const bid = parseInt(params[0]);
      const prevLen = mockDb.blogs.length;
      mockDb.blogs = mockDb.blogs.filter(b => b.id !== bid);
      return [{ affectedRows: prevLen - mockDb.blogs.length }];
    }
  }

  // B. SERVICES CRUD
  if (normalizedSql.includes('home_services') || normalizedSql.includes('from home_services') || (normalizedSql.includes('services') && !normalizedSql.includes('reels'))) {
    if (normalizedSql.startsWith('select')) {
      let list = mockDb.services;

      // Check if filtering by specific ID
      if (normalizedSql.includes('id = ?') || normalizedSql.includes('hs.id = ?')) {
        const targetId = parseInt(params[0]);
        list = list.filter(s => s.id === targetId);
      }

      // Check if public getServices (filtered by status = 'approved')
      if (normalizedSql.includes("status = 'approved'")) {
        list = list.filter(s => s.status === 'approved');
        
        // Parse parameters for public getServices:
        // 1. category = ? (first param if present)
        // 2. search (next 4 params if present)
        let paramIdx = 0;
        if (normalizedSql.includes("category = ?")) {
          const cat = params[paramIdx++];
          if (cat && cat !== 'all') {
            list = list.filter(s => s.category === cat);
          }
        }
        if (normalizedSql.includes("name like ? or description like ?")) {
          const sVal = (params[paramIdx] || '').replace(/%/g, '').toLowerCase();
          list = list.filter(s => 
            (s.name||'').toLowerCase().includes(sVal) ||
            (s.description||'').toLowerCase().includes(sVal) ||
            (s.provider_name||'').toLowerCase().includes(sVal) ||
            (s.city||'').toLowerCase().includes(sVal)
          );
        }
      } else {
        // Admin getServices query (no status = 'approved' literal)
        let paramIdx = 0;
        if (normalizedSql.includes("hs.name like ?")) {
          const sVal = (params[paramIdx] || '').replace(/%/g, '').toLowerCase();
          list = list.filter(s => 
            (s.name||'').toLowerCase().includes(sVal) ||
            (s.provider_name||'').toLowerCase().includes(sVal) ||
            (s.mobile_number||'').toLowerCase().includes(sVal) ||
            (s.city||'').toLowerCase().includes(sVal) ||
            (s.description||'').toLowerCase().includes(sVal)
          );
          paramIdx += 5;
        }
        if (normalizedSql.includes("hs.status = ?")) {
          const statusVal = params[paramIdx++];
          if (statusVal) {
            list = list.filter(s => s.status === statusVal);
          }
        }
        if (normalizedSql.includes("hs.category = ?")) {
          const catVal = params[paramIdx++];
          if (catVal) {
            list = list.filter(s => s.category === catVal);
          }
        }
      }

      // Compute calculated ratings fields on each item
      const serviceRatings = mockDb.service_ratings || [];
      list = list.map(s => {
        const ratingsForSvc = serviceRatings.filter(sr => sr.service_id === s.id);
        const avgRating = ratingsForSvc.length > 0 ? (ratingsForSvc.reduce((sum, r) => sum + r.rating, 0) / ratingsForSvc.length) : 0;
        const totalReviews = ratingsForSvc.filter(sr => sr.review && sr.review.trim() !== '').length;
        return {
          ...s,
          avg_rating: avgRating,
          total_ratings: ratingsForSvc.length,
          total_reviews: totalReviews,
          ratings: parseFloat(avgRating.toFixed(1)),
          reviews_count: totalReviews
        };
      });

      // Check for COUNT query
      if (normalizedSql.startsWith('select count(') || normalizedSql.startsWith('select count(*)')) {
        return [[{ total: list.length }]];
      }

      // Sorting
      list = [...list];
      list.sort((a, b) => {
        // Priority 1: Highest Average Rating
        const ratingDiff = (b.avg_rating || 0) - (a.avg_rating || 0);
        if (Math.abs(ratingDiff) > 0.001) return ratingDiff;
        // Priority 2: Highest Number of Ratings
        const countDiff = (b.total_ratings || 0) - (a.total_ratings || 0);
        if (countDiff !== 0) return countDiff;
        // Priority 3: Sort Order / Recency
        const sortDiff = (b.sort_order || 0) - (a.sort_order || 0);
        if (sortDiff !== 0) return sortDiff;
        return b.id - a.id;
      });

      // Pagination: LIMIT ? OFFSET ?
      if (normalizedSql.includes('limit ?')) {
        const limitVal  = parseInt(params[params.length - 2]) || parseInt(params[params.length - 1]) || 20;
        const offsetVal = normalizedSql.includes('limit ? offset ?') ? (parseInt(params[params.length - 1]) || 0) : 0;
        return [list.slice(offsetVal, offsetVal + limitVal)];
      }

      return [list];
    }
    if (normalizedSql.startsWith('insert')) {
      // Parse columns from the SQL string dynamically to be extremely robust
      const colsMatch = sql.match(/\(([^)]+)\)\s*values/i);
      if (colsMatch) {
        const cols = colsMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
        const newSvc = { 
          id: mockDb.services.length + 1, 
          status: 'approved',
          sort_order: 0,
          created_at: new Date() 
        };
        cols.forEach((col, idx) => {
          newSvc[col] = params[idx];
        });
        if (!newSvc.image_urls && newSvc.image_url) {
          newSvc.image_urls = JSON.stringify([newSvc.image_url]);
        }
        mockDb.services.push(newSvc);
        return [{ insertId: newSvc.id }];
      }
    }
    if (normalizedSql.startsWith('update')) {
      const colsMatch = sql.match(/set\s+([^where]+)/i);
      const idMatch = sql.match(/where\s+id\s*=\s*\?/i) || sql.match(/where\s+hs.id\s*=\s*\?/i);
      if (colsMatch && idMatch) {
        const sets = colsMatch[1].split(',').map(s => s.trim().split('=')[0].trim().replace(/`/g, ''));
        const sid = parseInt(params[params.length - 1]);
        const svc = mockDb.services.find(s => s.id === sid);
        if (svc) {
          sets.forEach((col, idx) => {
            svc[col] = params[idx];
          });
          if (!svc.image_urls && svc.image_url) {
            svc.image_urls = JSON.stringify([svc.image_url]);
          }
        }
        return [{ affectedRows: svc ? 1 : 0 }];
      }
    }
    if (normalizedSql.startsWith('delete')) {
      const sid = parseInt(params[0]);
      const prevLen = mockDb.services.length;
      mockDb.services = mockDb.services.filter(s => s.id !== sid);
      return [{ affectedRows: prevLen - mockDb.services.length }];
    }
  }

  // B2. SERVICE RATINGS CRUD
  if (normalizedSql.includes('service_ratings') || normalizedSql.includes('from service_ratings')) {
    if (normalizedSql.startsWith('select')) {
      let list = mockDb.service_ratings || [];
      if (normalizedSql.includes('user_id = ?') && normalizedSql.includes('service_id = ?')) {
        let uid, sid;
        if (normalizedSql.indexOf('user_id') < normalizedSql.indexOf('service_id')) {
          uid = parseInt(params[0]);
          sid = parseInt(params[1]);
        } else {
          sid = parseInt(params[0]);
          uid = parseInt(params[1]);
        }
        list = list.filter(r => r.user_id === uid && r.service_id === sid);
      } else if (normalizedSql.includes('service_id = ?')) {
        const sid = parseInt(params[0]);
        list = list.filter(r => r.service_id === sid);
      }
      list = list.map(r => {
        const u = mockDb.users.find(user => user.id === r.user_id);
        return {
          ...r,
          user_name: u ? u.name : 'Verified Customer'
        };
      });
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return [list];
    }
    if (normalizedSql.startsWith('insert')) {
      const userId = parseInt(params[0]);
      const serviceId = parseInt(params[1]);
      const rating = parseInt(params[2]);
      const review = params[3] || null;

      let existing = (mockDb.service_ratings || []).find(r => r.user_id === userId && r.service_id === serviceId);
      if (existing) {
        existing.rating = rating;
        existing.review = review;
        existing.updated_at = new Date();
        return [{ affectedRows: 1, insertId: existing.id }];
      } else {
        const newRating = {
          id: (mockDb.service_ratings || []).length + 1,
          user_id: userId,
          service_id: serviceId,
          rating: rating,
          review: review,
          created_at: new Date(),
          updated_at: new Date()
        };
        mockDb.service_ratings.push(newRating);
        return [{ affectedRows: 1, insertId: newRating.id }];
      }
    }
    if (normalizedSql.startsWith('delete')) {
      if (normalizedSql.includes('service_id = ?')) {
        const sid = parseInt(params[0]);
        const prevLen = mockDb.service_ratings.length;
        mockDb.service_ratings = mockDb.service_ratings.filter(r => r.service_id !== sid);
        return [{ affectedRows: prevLen - mockDb.service_ratings.length }];
      } else {
        const rid = parseInt(params[0]);
        const prevLen = mockDb.service_ratings.length;
        mockDb.service_ratings = mockDb.service_ratings.filter(r => r.id !== rid);
        return [{ affectedRows: prevLen - mockDb.service_ratings.length }];
      }
    }
  }

  // C. SUBSCRIPTION PLANS CRUD
  if (normalizedSql.includes('subscription_plans') || normalizedSql.includes('from subscription_plans')) {
    if (!mockDb.subscription_plans) {
      mockDb.subscription_plans = [
        { id: 1, name: 'Free Plan', price: 0, duration_days: 30, property_limit: 2, featured_limit: 0, description: 'Basic tier', is_active: 1 },
        { id: 2, name: 'Premium Gold', price: 999, duration_days: 90, property_limit: 10, featured_limit: 3, description: 'Professional seller tier', is_active: 1 },
        { id: 3, name: 'Platinum Unlimited', price: 2999, duration_days: 365, property_limit: 999, featured_limit: 20, description: 'Enterprise agency tier', is_active: 1 }
      ];
    }
    if (normalizedSql.startsWith('select')) {
      return [mockDb.subscription_plans];
    }
    if (normalizedSql.startsWith('insert')) {
      const newPlan = {
        id: mockDb.subscription_plans.length + 1,
        name: params[0],
        price: parseFloat(params[1]),
        duration_days: parseInt(params[2]),
        property_limit: parseInt(params[3]),
        featured_limit: parseInt(params[4]),
        description: params[5] || '',
        is_active: params[6] || 1
      };
      mockDb.subscription_plans.push(newPlan);
      return [{ insertId: newPlan.id }];
    }
    if (normalizedSql.startsWith('update')) {
      const pid = parseInt(params[params.length - 1]);
      const plan = mockDb.subscription_plans.find(p => p.id === pid);
      if (plan) {
        plan.name = params[0];
        plan.price = parseFloat(params[1]);
        plan.duration_days = parseInt(params[2]);
        plan.property_limit = parseInt(params[3]);
        plan.featured_limit = parseInt(params[4]);
        plan.description = params[5];
        plan.is_active = params[6];
      }
      return [{ affectedRows: plan ? 1 : 0 }];
    }
    if (normalizedSql.startsWith('delete')) {
      const pid = parseInt(params[0]);
      const prevLen = mockDb.subscription_plans.length;
      mockDb.subscription_plans = mockDb.subscription_plans.filter(p => p.id !== pid);
      return [{ affectedRows: prevLen - mockDb.subscription_plans.length }];
    }
  }

  // D. SITE SETTINGS
  if (normalizedSql.includes('site_settings') || normalizedSql.includes('from site_settings')) {
    if (!mockDb.site_settings) {
      mockDb.site_settings = [
        { id: 1, site_name: 'House Rental', contact_email: 'crimesamachar1@gmail.com', contact_phone: '+919919014220', address: 'Lucknow, UP, India', maintenance_mode: 0 }
      ];
    }
    if (normalizedSql.startsWith('select')) {
      return [mockDb.site_settings];
    }
    if (normalizedSql.startsWith('insert')) {
      const newSet = {
        id: 1,
        site_name: params[0],
        contact_email: params[1],
        contact_phone: params[2],
        address: params[3],
        maintenance_mode: params[4] || 0
      };
      mockDb.site_settings = [newSet];
      return [{ insertId: 1 }];
    }
    if (normalizedSql.startsWith('update')) {
      if (mockDb.site_settings.length > 0) {
        mockDb.site_settings[0].site_name = params[0];
        mockDb.site_settings[0].contact_email = params[1];
        mockDb.site_settings[0].contact_phone = params[2];
        mockDb.site_settings[0].address = params[3];
        mockDb.site_settings[0].maintenance_mode = params[4];
      }
      return [{ affectedRows: 1 }];
    }
  }

  // E. PAYMENTS LIST ALL
  if (normalizedSql.includes('from payments p') && normalizedSql.includes('join users u')) {
    const list = mockDb.payments.slice().reverse().map(p => {
      const u = mockDb.users.find(u => u.id === p.user_id) || {};
      return {
        ...p,
        user_name: u.name || 'Unknown',
        user_email: u.email || 'unknown@houserenter.in'
      };
    });
    return [list];
  }

  // F. NOTIFICATIONS Broadcaster
  if (normalizedSql.startsWith('insert into notifications')) {
    const newNotif = {
      id: mockDb.notifications.length + 1,
      user_id: params[0],
      title: params[1],
      message: params[2],
      is_read: 0,
      created_at: new Date()
    };
    mockDb.notifications.push(newNotif);
    return [{ insertId: newNotif.id }];
  }

  // G. CUSTOMER REVIEWS
  if (normalizedSql.includes('customer_reviews')) {
    if (normalizedSql.startsWith('select')) {
      let list = mockDb.customer_reviews || [];
      if (normalizedSql.includes("status = 'approved'") || normalizedSql.includes('status = ?')) {
        list = list.filter(r => r.status === 'approved');
      }
      
      // Sorting: Highest Rating, then Most Recent
      list = [...list];
      list.sort((a, b) => {
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return b.id - a.id;
      });

      if (normalizedSql.startsWith('select count(') || normalizedSql.startsWith('select count(*)')) {
        return [[{ total: list.length }]];
      }

      return [list];
    }
    if (normalizedSql.startsWith('insert')) {
      const colsMatch = sql.match(/\(([^)]+)\)\s*values/i);
      if (colsMatch) {
        const cols = colsMatch[1].split(',').map(c => c.trim().replace(/`/g, ''));
        const newRev = { 
          id: (mockDb.customer_reviews || []).length + 1, 
          status: 'approved',
          created_at: new Date() 
        };
        cols.forEach((col, idx) => {
          newRev[col] = params[idx];
        });
        mockDb.customer_reviews = mockDb.customer_reviews || [];
        mockDb.customer_reviews.push(newRev);
        return [{ insertId: newRev.id }];
      }
    }
    if (normalizedSql.startsWith('update')) {
      const idMatch = normalizedSql.match(/id\s*=\s*\?/);
      if (idMatch) {
        const idVal = params[params.length - 1];
        const match = (mockDb.customer_reviews || []).find(r => r.id === parseInt(idVal));
        if (match) {
          if (normalizedSql.includes('status = ?')) {
            match.status = params[0];
          }
          if (normalizedSql.includes('reply_text = ?')) {
            match.reply_text = params[0];
          }
        }
      }
      return [{ affectedRows: 1 }];
    }
    if (normalizedSql.startsWith('delete')) {
      const idVal = params[0];
      mockDb.customer_reviews = (mockDb.customer_reviews || []).filter(r => r.id !== parseInt(idVal));
      return [{ affectedRows: 1 }];
    }
  }

  // Default empty return
  return [[]];
}

// Database query proxy
const query = async (sql, params = []) => {
  if (!pool) {
    await initPool();
  }

  if (isMock) {
    return executeMock(sql, params);
  }

  try {
    return await pool.query(sql, params);
  } catch (error) {
    console.error('❌ Database Query Error: ', error.message);
    throw error;
  }
};

module.exports = {
  query,
  initPool,
  isMock: () => isMock,
  mockDb
};
