const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const prodPersistentDir = '/home/u726900424/domains/houserenter.in/persistent_uploads';
const baseUploads = fs.existsSync('/home/u726900424/domains/houserenter.in')
  ? prodPersistentDir
  : path.join(__dirname, '..', 'public', 'uploads');

// Safe numeric conversion helpers — never allow NaN into SQL queries
function safeFloat(val, defaultVal = null) {
  if (val === null || val === undefined || val === '') return defaultVal;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? defaultVal : parsed;
}

function safeInt(val, defaultVal = 0) {
  if (val === null || val === undefined || val === '') return defaultVal;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultVal : parsed;
}

// Post a new property (Multi-Step Form upload)
async function createProperty(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  try {
    const {
      title, description, category, listing_type, category_type, price, area_sqft,
      bedrooms, bathrooms, facing, floor_number, parking_spaces, furnishing_status,
      address, city, state, pincode, latitude, longitude, contact_phone
    } = req.body;

    if (!contact_phone || !/^[6-9]\d{9}$/.test(contact_phone)) {
      return res.status(400).json({ success: false, error: 'A valid 10-digit Indian contact mobile number is required.' });
    }

    // Validate required numeric fields before SQL insert
    const parsedPrice = safeFloat(price, null);
    const parsedArea = safeInt(area_sqft, null);
    if (parsedPrice === null) {
      return res.status(400).json({ success: false, error: 'Invalid or missing value for field: price' });
    }
    if (parsedArea === null) {
      return res.status(400).json({ success: false, error: 'Invalid or missing value for field: area_sqft' });
    }

    // 2. Insert property details
    const [result] = await db.query(
      `INSERT INTO properties 
      (user_id, title, description, category, listing_type, category_type, price, area_sqft, 
       bedrooms, bathrooms, facing, floor_number, parking_spaces, furnishing_status, 
       address, city, state, pincode, latitude, longitude, contact_phone, approval_status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
      [
        req.user.id, title, description, category, listing_type, category_type || 'new',
        parsedPrice, parsedArea, safeInt(bedrooms, 0), safeInt(bathrooms, 0),
        facing || null, safeInt(floor_number, 0), safeInt(parking_spaces, 0), furnishing_status || 'unfurnished',
        address, city, state, pincode,
        safeFloat(latitude, null),
        safeFloat(longitude, null),
        contact_phone
      ]
    );

    const propertyId = result.insertId;

    // 3. Process Uploaded Images with sharp image compression
    const { processImage, processVideo } = require('../middlewares/uploadMiddleware');
    let imagePaths = [];
    let videoPaths = [];

    if (req.files) {
      // Handle property images
      if (req.files.images) {
        for (let i = 0; i < req.files.images.length; i++) {
          const file = req.files.images[i];
          const savedPath = await processImage(file.buffer, 'properties', `property-${propertyId}`);
          imagePaths.push(savedPath);

          // Insert path to database
          await db.query(
            'INSERT INTO property_images (property_id, image_url, is_cover, sort_order) VALUES (?, ?, ?, ?)',
            [propertyId, savedPath, i === 0, i] // First image is cover, sort_order is i
          );
        }
      }

      // Handle property video
      if (req.files.video) {
        const file = req.files.video[0];
        const savedVideoPath = await processVideo(file.buffer, file.originalname, 'properties');
        videoPaths.push(savedVideoPath);

        await db.query(
          'INSERT INTO property_videos (property_id, video_url) VALUES (?, ?)',
          [propertyId, savedVideoPath]
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Property listed successfully!',
      propertyId,
      images: imagePaths,
      videos: videoPaths
    });
  } catch (error) {
    console.error('Create property error:', error.message);
    console.error('Stack:', error.stack);
    console.error('Request body keys:', req.body ? Object.keys(req.body) : 'NO BODY');
    console.error('Request files keys:', req.files ? Object.keys(req.files) : 'NO FILES');
    res.status(500).json({ success: false, error: 'Server property posting failure.', detail: error.message });
  }
}

// Update an existing property listing
async function updateProperty(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  const { id } = req.params;

  try {
    // 1. Check if property exists and verify authorization (owner or admin)
    const [rows] = await db.query('SELECT user_id FROM properties WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Property not found.' });
    }
    const property = rows[0];
    if (property.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'You are not authorized to edit this listing.' });
    }

    const {
      title, description, category, listing_type, category_type, price, area_sqft,
      bedrooms, bathrooms, facing, floor_number, parking_spaces, furnishing_status,
      address, city, state, pincode, latitude, longitude, status,
      kept_images, image_order, contact_phone
    } = req.body;

    if (!contact_phone || !/^[6-9]\d{9}$/.test(contact_phone)) {
      return res.status(400).json({ success: false, error: 'A valid 10-digit Indian contact mobile number is required.' });
    }

    // Validate required numeric fields before SQL update
    const parsedPrice = safeFloat(price, null);
    const parsedArea = safeInt(area_sqft, null);
    if (parsedPrice === null) {
      return res.status(400).json({ success: false, error: 'Invalid or missing value for field: price' });
    }
    if (parsedArea === null) {
      return res.status(400).json({ success: false, error: 'Invalid or missing value for field: area_sqft' });
    }

    // 2. Update text fields in properties table
    await db.query(
      `UPDATE properties SET 
        title = ?, description = ?, category = ?, listing_type = ?, category_type = ?, 
        price = ?, area_sqft = ?, bedrooms = ?, bathrooms = ?, facing = ?, 
        floor_number = ?, parking_spaces = ?, furnishing_status = ?, address = ?, 
        city = ?, state = ?, pincode = ?, 
        latitude = ?, longitude = ?, status = ?, contact_phone = ? 
      WHERE id = ?`,
      [
        title, description, category, listing_type, category_type || 'new',
        parsedPrice, parsedArea, safeInt(bedrooms, 0), safeInt(bathrooms, 0),
        facing || null, safeInt(floor_number, 0), safeInt(parking_spaces, 0), furnishing_status || 'unfurnished',
        address, city, state, pincode,
        safeFloat(latitude, null),
        safeFloat(longitude, null),
        status || 'active',
        contact_phone,
        id
      ]
    );

    const { processImage, processVideo } = require('../middlewares/uploadMiddleware');
    const fs = require('fs');
    const path = require('path');

    // 3. Process image deletions
    let keptImagesList = [];
    if (kept_images) {
      try {
        keptImagesList = typeof kept_images === 'string' ? JSON.parse(kept_images) : kept_images;
      } catch (e) {
        keptImagesList = [];
      }
    }

    // Get all current images from database
    const [currentDbImages] = await db.query('SELECT id, image_url FROM property_images WHERE property_id = ?', [id]);
    
    // Delete any image NOT in the kept list
    for (const dbImg of currentDbImages) {
      if (!keptImagesList.includes(dbImg.image_url)) {
        // Delete database record
        await db.query('DELETE FROM property_images WHERE id = ?', [dbImg.id]);
        // Delete physical file
        if (dbImg.image_url && dbImg.image_url.startsWith('/uploads/')) {
          const relativePath = dbImg.image_url.replace(/^\/uploads\//, '');
          const fullPath = path.join(baseUploads, relativePath);
          fs.unlink(fullPath, (err) => {
            if (err && err.code !== 'ENOENT') {
              console.error('Failed to delete physical image during edit:', fullPath, err.message);
            }
          });
        }
      }
    }

    // 4. Process new image uploads
    let newImagePaths = [];
    if (req.files && req.files.images) {
      for (let i = 0; i < req.files.images.length; i++) {
        const file = req.files.images[i];
        const savedPath = await processImage(file.buffer, 'properties', `property-${id}`);
        newImagePaths.push(savedPath);
      }
    }

    // 5. Build final sorted image list
    let orderedList = [];
    if (image_order) {
      try {
        orderedList = typeof image_order === 'string' ? JSON.parse(image_order) : image_order;
      } catch (e) {
        orderedList = [];
      }
    }

    // Replace placeholders like "new-0", "new-1" with actual new image paths
    const finalImagesList = orderedList.map(item => {
      if (typeof item === 'string' && item.startsWith('new-')) {
        const index = parseInt(item.split('-')[1]);
        return newImagePaths[index] || null;
      }
      return item;
    }).filter(item => item !== null);

    // If orderedList was not provided or empty, fallback to keeping all remaining + new images
    if (finalImagesList.length === 0) {
      const [remainingDbImages] = await db.query('SELECT image_url FROM property_images WHERE property_id = ?', [id]);
      remainingDbImages.forEach(img => finalImagesList.push(img.image_url));
      newImagePaths.forEach(path => finalImagesList.push(path));
    }

    // Remove any duplicates just in case
    const uniqueImagesList = [...new Set(finalImagesList)];

    // 6. Update database records for property_images with new sort_order and is_cover flags
    for (let i = 0; i < uniqueImagesList.length; i++) {
      const imgUrl = uniqueImagesList[i];
      const isCover = (i === 0);

      // Check if it already exists in db
      const [existImg] = await db.query('SELECT id FROM property_images WHERE property_id = ? AND image_url = ?', [id, imgUrl]);
      if (existImg.length > 0) {
        // Update sorting and cover status
        await db.query('UPDATE property_images SET sort_order = ?, is_cover = ? WHERE id = ?', [i, isCover, existImg[0].id]);
      } else {
        // Insert new image
        await db.query('INSERT INTO property_images (property_id, image_url, is_cover, sort_order) VALUES (?, ?, ?, ?)', [id, imgUrl, isCover, i]);
      }
    }

    // 7. Handle video update if new video is uploaded
    if (req.files && req.files.video) {
      const file = req.files.video[0];
      
      // Fetch existing video to delete physical file
      const [currentVideos] = await db.query('SELECT id, video_url FROM property_videos WHERE property_id = ?', [id]);
      for (const v of currentVideos) {
        await db.query('DELETE FROM property_videos WHERE id = ?', [v.id]);
        if (v.video_url && v.video_url.startsWith('/uploads/')) {
          const relativePath = v.video_url.replace(/^\/uploads\//, '');
          const fullPath = path.join(baseUploads, relativePath);
          fs.unlink(fullPath, (err) => {
            if (err && err.code !== 'ENOENT') {
              console.error('Failed to delete physical video:', fullPath, err.message);
            }
          });
        }
      }

      // Process and save new video
      const savedVideoPath = await processVideo(file.buffer, file.originalname, 'properties');
      await db.query('INSERT INTO property_videos (property_id, video_url) VALUES (?, ?)', [id, savedVideoPath]);
    }

    res.status(200).json({
      success: true,
      message: 'Property updated successfully!'
    });
  } catch (error) {
    console.error('Update property error: ', error.message);
    res.status(500).json({ success: false, error: 'Server property update failure.' });
  }
}

// Search and List Properties (paginated, cache-safe)
async function getProperties(req, res) {
  // Prevent browser/CDN caching so admin changes are always live
  res.set('Cache-Control', 'no-store');

  let {
    city, search, category, listing_type, furnishing_status,
    minPrice, maxPrice, bedrooms, bathrooms, minArea, maxArea,
    lat, lng, radius, sort,
    is_featured,
    page, limit,
    admin   // internal: skip hidden/approval filter for admin panel
  } = req.query;

  // Pagination defaults
  const pageNum  = Math.max(1, parseInt(page)  || 1);
  const limitNum = Math.min(100, parseInt(limit) || 12);
  const offset   = (pageNum - 1) * limitNum;

  try {
    let whereClauses = [];
    let params = [];

    // Public: only approved + non-hidden
    if (!admin) {
      whereClauses.push("p.approval_status = 'approved'");
      whereClauses.push('(p.is_hidden IS NULL OR p.is_hidden = 0)');
    }

    // Featured filter
    if (is_featured === '1' || is_featured === 'true') {
      whereClauses.push('p.is_featured = 1');
    }

    if (city)   { whereClauses.push('(p.city LIKE ? OR p.pincode = ?)'); params.push(`%${city}%`, city); }
    if (search) { whereClauses.push('(p.title LIKE ? OR p.description LIKE ? OR p.address LIKE ? OR p.city LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
    if (category && category !== 'all') { whereClauses.push('p.category = ?'); params.push(category); }
    if (listing_type)    { whereClauses.push('p.listing_type = ?');    params.push(listing_type); }
    if (furnishing_status){ whereClauses.push('p.furnishing_status = ?'); params.push(furnishing_status); }
    if (minPrice) { whereClauses.push('p.price >= ?'); params.push(parseFloat(minPrice)); }
    if (maxPrice) { whereClauses.push('p.price <= ?'); params.push(parseFloat(maxPrice)); }
    if (bedrooms  && bedrooms  !== 'any') { whereClauses.push('p.bedrooms >= ?');  params.push(parseInt(bedrooms)); }
    if (bathrooms && bathrooms !== 'any') { whereClauses.push('p.bathrooms >= ?'); params.push(parseInt(bathrooms)); }
    if (minArea) { whereClauses.push('p.area_sqft >= ?'); params.push(parseInt(minArea)); }
    if (maxArea) { whereClauses.push('p.area_sqft <= ?'); params.push(parseInt(maxArea)); }

    const whereStr = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    let baseSql = `
      SELECT p.*,
             (SELECT image_url FROM property_images WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,
             u.name as owner_name, u.phone as owner_phone
      FROM properties p
      JOIN users u ON p.user_id = u.id
      ${whereStr}
    `;

    // Sort
    let orderClause = 'ORDER BY id DESC';
    if (lat && lng) {
      orderClause = 'ORDER BY distance ASC'; // default sorting for location-based recommendations
    }
    if (sort === 'price_low')  orderClause = 'ORDER BY price ASC';
    else if (sort === 'price_high') orderClause = 'ORDER BY price DESC';
    else if (sort === 'featured')   orderClause = 'ORDER BY is_featured DESC, id DESC';
    else if (sort === 'nearest' && lat && lng) orderClause = 'ORDER BY distance ASC';

    let countRows = [{ total: 0 }];
    let results = [];

    // GPS Haversine radius search with expanding fallback thresholds
    if (lat && lng && radius) {
      const pLat = parseFloat(lat), pLng = parseFloat(lng);
      const initialRadius = parseFloat(radius);
      const baseRadii = [3, 5, 10, 20, 50];
      
      const uniqueRadii = [initialRadius];
      baseRadii.forEach(r => {
        if (r > initialRadius && !uniqueRadii.includes(r)) {
          uniqueRadii.push(r);
        }
      });
      uniqueRadii.push(null); // unlimited distance fallback

      console.log(`🔍 Nearby search fallback sequence: ${uniqueRadii.join(' -> ')}`);

      for (let i = 0; i < uniqueRadii.length; i++) {
        const currentRad = uniqueRadii[i];
        let currentBaseSql = baseSql;
        let currentParams = [...params];

        if (currentRad !== null) {
          currentBaseSql = `SELECT *, (6371 * acos(cos(radians(${pLat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${pLng})) + sin(radians(${pLat})) * sin(radians(latitude)))) AS distance FROM (${baseSql}) as gps_filtered HAVING distance <= ?`;
          currentParams.push(currentRad);
        } else {
          currentBaseSql = `SELECT *, (6371 * acos(cos(radians(${pLat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${pLng})) + sin(radians(${pLat})) * sin(radians(latitude)))) AS distance FROM (${baseSql}) as gps_filtered`;
        }

        const currentCountSql = `SELECT COUNT(*) as total FROM (${currentBaseSql} ${orderClause}) as count_q`;
        const [cRows] = await db.query(currentCountSql, currentParams);
        const countTotal = cRows[0] ? (cRows[0].total || 0) : 0;

        if (countTotal > 0 || currentRad === null) {
          countRows = cRows;
          const currentPaginatedSql = `${currentBaseSql} ${orderClause} LIMIT ? OFFSET ?`;
          const [resRows] = await db.query(currentPaginatedSql, [...currentParams, limitNum, offset]);
          results = resRows;
          break;
        }
      }
    } else {
      // Standard search: compute distance column without filtering radius if lat/lng is active
      let countBaseSql = baseSql;
      let countParams = [...params];

      if (lat && lng) {
        const pLat = parseFloat(lat), pLng = parseFloat(lng);
        countBaseSql = `SELECT *, (6371 * acos(cos(radians(${pLat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${pLng})) + sin(radians(${pLat})) * sin(radians(latitude)))) AS distance FROM (${baseSql}) as gps_filtered`;
      }

      const countSql = `SELECT COUNT(*) as total FROM (${countBaseSql} ${orderClause}) as count_q`;
      const [cRows] = await db.query(countSql, countParams);
      countRows = cRows;

      const paginatedSql = `${countBaseSql} ${orderClause} LIMIT ? OFFSET ?`;
      const [resRows] = await db.query(paginatedSql, [...countParams, limitNum, offset]);
      results = resRows;
    }

    const total = countRows[0] ? (countRows[0].total || 0) : 0;
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      data: results,
      pagination: { total, page: pageNum, limit: limitNum, totalPages, hasMore: pageNum < totalPages }
    });
  } catch (error) {
    console.error('Get properties error: ', error.message);

    // Fallback: if nearby/GPS query failed, retry standard query without location parameters
    if (lat || lng || radius || sort === 'nearest') {
      console.log('🔄 Nearby search failed. Retrying fallback query without GPS coordinates...');
      try {
        req.query.lat = undefined;
        req.query.lng = undefined;
        req.query.radius = undefined;
        if (req.query.sort === 'nearest') {
          req.query.sort = 'newest';
        }
        return await getProperties(req, res);
      } catch (fallbackError) {
        console.error('⚠️ Fallback query retry failed:', fallbackError.message);
      }
    }

    res.status(500).json({ success: false, error: 'Server property search failure.' });
  }
}

// Get single property details
async function getPropertyById(req, res) {
  const { id } = req.params;

  try {
    const [properties] = await db.query(
      `SELECT p.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone, u.profile_picture as owner_pic, u.role as owner_role 
       FROM properties p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.id = ?`,
      [id]
    );

    if (properties.length === 0) {
      return res.status(404).json({ success: false, error: 'Property not found.' });
    }

    const property = properties[0];

    // Increment views counter
    await db.query('INSERT INTO property_views (user_id, property_id) VALUES (?, ?)', [req.user ? req.user.id : null, id]);

    // Fetch images and videos
    const [images] = await db.query('SELECT * FROM property_images WHERE property_id = ? ORDER BY sort_order ASC, id ASC', [id]);
    const [videos] = await db.query('SELECT * FROM property_videos WHERE property_id = ?', [id]);
    const [reviews] = await db.query('SELECT r.*, u.name as user_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.property_id = ? ORDER BY r.id DESC', [id]);

    // Fetch similar properties in same city/category
    const [similar] = await db.query(
      `SELECT p.*, (SELECT image_url FROM property_images WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image 
       FROM properties p 
       WHERE p.city = ? AND p.category = ? AND p.id != ? AND p.approval_status = 'approved' LIMIT 4`,
      [property.city, property.category, id]
    );

    res.status(200).json({
      success: true,
      data: {
        ...property,
        images,
        videos,
        reviews,
        similar
      }
    });
  } catch (error) {
    console.error('Get property by ID error: ', error.message);
    res.status(500).json({ success: false, error: 'Server property details failure.' });
  }
}

// Toggle Save Property
async function toggleSaveProperty(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated.' });
  }

  const { id } = req.params;

  try {
    const [existing] = await db.query('SELECT * FROM saved_properties WHERE user_id = ? AND property_id = ?', [req.user.id, id]);

    if (existing.length > 0) {
      await db.query('DELETE FROM saved_properties WHERE user_id = ? AND property_id = ?', [req.user.id, id]);
      return res.status(200).json({ success: true, saved: false, message: 'Property removed from saved.' });
    } else {
      await db.query('INSERT INTO saved_properties (user_id, property_id) VALUES (?, ?)', [req.user.id, id]);
      return res.status(200).json({ success: true, saved: true, message: 'Property saved successfully!' });
    }
  } catch (error) {
    console.error('Toggle save property error: ', error.message);
    res.status(500).json({ success: false, error: 'Server error saving property.' });
  }
}

// Schedule Property Visit
async function scheduleVisit(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  const { propertyId, visitDate } = req.body;
  if (!propertyId || !visitDate) {
    return res.status(400).json({ success: false, error: 'Property ID and Date are required.' });
  }

  try {
    await db.query(
      'INSERT INTO visits (user_id, property_id, visit_date, status) VALUES (?, ?, ?, ?)',
      [req.user.id, propertyId, visitDate, 'scheduled']
    );

    // Send notification to property owner
    const [props] = await db.query('SELECT user_id, title FROM properties WHERE id = ?', [propertyId]);
    if (props.length > 0) {
      const ownerId = props[0].user_id;
      const propTitle = props[0].title;
      await db.query(
        'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
        [ownerId, 'New Visit Scheduled', `${req.user.name} has scheduled a visit for "${propTitle}" on ${visitDate}`]
      );
    }

    res.status(200).json({ success: true, message: 'Visit scheduled successfully!' });
  } catch (error) {
    console.error('Schedule visit error: ', error.message);
    res.status(500).json({ success: false, error: 'Server scheduling failure.' });
  }
}

// Contact Owner Enquiry
async function submitEnquiry(req, res) {
  const { propertyId, name, phone, email, message } = req.body;

  try {
    const [result] = await db.query(
      'INSERT INTO enquiries (user_id, property_id, name, phone, email, message) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user ? req.user.id : null, propertyId, name, phone, email, message]
    );

    // Notify owner
    const [props] = await db.query('SELECT user_id, title FROM properties WHERE id = ?', [propertyId]);
    if (props.length > 0) {
      const ownerId = props[0].user_id;
      await db.query(
        'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
        [ownerId, 'New Property Inquiry', `${name} is interested in "${props[0].title}". Message: ${message}. Contact: ${phone}`]
      );
    }

    res.status(200).json({ success: true, message: 'Inquiry submitted successfully!' });
  } catch (error) {
    console.error('Submit inquiry error: ', error.message);
    res.status(500).json({ success: false, error: 'Server inquiry logging failure.' });
  }
}

// Add Review
async function addReview(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated.' });
  }

  const { propertyId, rating, reviewText } = req.body;
  if (!propertyId || !rating || !reviewText) {
    return res.status(400).json({ success: false, error: 'All fields are required.' });
  }

  try {
    await db.query(
      'INSERT INTO reviews (user_id, property_id, rating, review_text) VALUES (?, ?, ?, ?)',
      [req.user.id, propertyId, parseInt(rating), reviewText]
    );

    res.status(200).json({ success: true, message: 'Review posted successfully!' });
  } catch (error) {
    console.error('Add review error: ', error.message);
    res.status(500).json({ success: false, error: 'Server review submission failure.' });
  }
}

// GET REELS FEED
async function getReels(req, res) {
  try {
    const [reels] = await db.query(
      `SELECT r.*, u.name as creator_name, u.profile_picture as creator_pic 
       FROM reels r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.approval_status = 'approved' 
       ORDER BY r.id DESC`
    );

    // Get engagement details if user is logged in
    for (let reel of reels) {
      try {
        const [likes] = await db.query('SELECT COUNT(*) as count FROM reel_likes WHERE reel_id = ?', [reel.id]);
        reel.likes_count = (Array.isArray(likes) && likes[0]) ? (likes[0].count ?? 0) : (reel.likes_count || 0);
      } catch (e) {
        reel.likes_count = reel.likes_count || 0;
      }

      try {
        const [comments] = await db.query(
          `SELECT rc.id, rc.reel_id, rc.user_id, rc.comment_text, rc.created_at, u.name as user_name, u.profile_picture as user_pic 
           FROM reel_comments rc 
           JOIN users u ON rc.user_id = u.id 
           WHERE rc.reel_id = ? ORDER BY rc.id ASC`,
          [reel.id]
        );
        reel.comments = Array.isArray(comments) ? comments : [];
      } catch (e) {
        reel.comments = [];
      }

      try {
        if (req.user) {
          const [userLike] = await db.query('SELECT id FROM reel_likes WHERE reel_id = ? AND user_id = ?', [reel.id, req.user.id]);
          reel.is_liked = Array.isArray(userLike) && userLike.length > 0;
        } else {
          reel.is_liked = false;
        }
      } catch (e) {
        reel.is_liked = false;
      }
    }

    res.status(200).json({ success: true, data: reels });
  } catch (error) {
    console.error('Get reels error: ', error.message);
    res.status(500).json({ success: false, error: 'Server reels fetch failure.' });
  }
}

// UPLOAD REEL
async function uploadReel(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  try {
    if (!req.files || !req.files.video) {
      return res.status(400).json({ success: false, error: 'Video file is required for reels.' });
    }

    const file = req.files.video[0];
    const path = require('path');
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (fileExt !== '.mp4') {
      return res.status(400).json({ success: false, error: 'Only portrait MP4 videos are supported for reels.' });
    }

    const { processVideo } = require('../middlewares/uploadMiddleware');
    const savedPath = await processVideo(file.buffer, file.originalname, 'reels');

    const caption = req.body.caption || '';

    // Reels require admin approval, but defaults to 'approved' for demo
    await db.query(
      'INSERT INTO reels (user_id, video_url, caption, approval_status) VALUES (?, ?, ?, ?)',
      [req.user.id, savedPath, caption, 'approved']
    );

    res.status(201).json({ success: true, message: 'Reel uploaded successfully!' });
  } catch (error) {
    console.error('Upload reel error: ', error.message);
    res.status(500).json({ success: false, error: 'Server reel upload failure.' });
  }
}

// TOGGLE REEL LIKE
async function toggleReelLike(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  const { id } = req.params;

  try {
    const [existing] = await db.query('SELECT * FROM reel_likes WHERE user_id = ? AND reel_id = ?', [req.user.id, id]);
    let liked = false;

    if (existing.length > 0) {
      await db.query('DELETE FROM reel_likes WHERE user_id = ? AND reel_id = ?', [req.user.id, id]);
      liked = false;
    } else {
      await db.query('INSERT INTO reel_likes (user_id, reel_id) VALUES (?, ?)', [req.user.id, id]);
      liked = true;
    }

    // Sync likes count
    const [likesCountRows] = await db.query('SELECT COUNT(*) as count FROM reel_likes WHERE reel_id = ?', [id]);
    const finalCount = likesCountRows[0].count;
    await db.query('UPDATE reels SET likes_count = ? WHERE id = ?', [finalCount, id]);

    return res.status(200).json({ success: true, liked, likesCount: finalCount });
  } catch (error) {
    console.error('Reel like error: ', error.message);
    res.status(500).json({ success: false, error: 'Server interaction logging failure.' });
  }
}

// ADD REEL COMMENT
async function addReelComment(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  const { id } = req.params;
  const { commentText } = req.body;

  if (!commentText) {
    return res.status(400).json({ success: false, error: 'Comment text is required.' });
  }

  try {
    await db.query(
      'INSERT INTO reel_comments (user_id, reel_id, comment_text) VALUES (?, ?, ?)',
      [req.user.id, id, commentText]
    );

    res.status(201).json({ success: true, message: 'Comment added successfully!' });
  } catch (error) {
    console.error('Reel comment error: ', error.message);
    res.status(500).json({ success: false, error: 'Server comment logging failure.' });
  }
}

// Delete a property listing (owner or admin only)
async function deleteProperty(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }
  const { id } = req.params;
  try {
    // Only allow owner or admin to delete
    const [rows] = await db.query('SELECT user_id FROM properties WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Property not found.' });
    }
    const property = rows[0];
    if (property.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'You can only delete your own listings.' });
    }

    // Fetch all related images to delete physical files
    const [images] = await db.query('SELECT image_url FROM property_images WHERE property_id = ?', [id]);
    const fs = require('fs');
    const path = require('path');
    for (const img of images) {
      if (img.image_url && img.image_url.startsWith('/uploads/')) {
        const relativePath = img.image_url.replace(/^\/uploads\//, '');
        const fullPath = path.join(baseUploads, relativePath);
        fs.unlink(fullPath, (err) => {
          if (err && err.code !== 'ENOENT') {
            console.error('Failed to delete physical image file:', fullPath, err.message);
          }
        });
      }
    }

    // Fetch and delete related physical video files
    const [videos] = await db.query('SELECT video_url FROM property_videos WHERE property_id = ?', [id]);
    for (const v of videos) {
      if (v.video_url && v.video_url.startsWith('/uploads/')) {
        const relativePath = v.video_url.replace(/^\/uploads\//, '');
        const fullPath = path.join(baseUploads, relativePath);
        fs.unlink(fullPath, (err) => {
          if (err && err.code !== 'ENOENT') {
            console.error('Failed to delete physical video file:', fullPath, err.message);
          }
        });
      }
    }

    // Delete related database tables first
    await db.query('DELETE FROM property_images WHERE property_id = ?', [id]);
    await db.query('DELETE FROM property_videos WHERE property_id = ?', [id]);
    await db.query('DELETE FROM saved_properties WHERE property_id = ?', [id]);
    await db.query('DELETE FROM property_views WHERE property_id = ?', [id]);
    await db.query('DELETE FROM properties WHERE id = ?', [id]);

    res.status(200).json({ success: true, message: 'Property deleted successfully.' });
  } catch (error) {
    console.error('Delete property error:', error.message);
    res.status(500).json({ success: false, error: 'Server error while deleting property.' });
  }
}


// Delete a reel (owner or admin only)
async function deleteReel(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }
  const { id } = req.params;
  try {
    let rows;
    if (db.isMock()) {
      rows = (db.mockDb.reels || []).filter(r => r.id == id);
    } else {
      [rows] = await db.query('SELECT user_id, video_url FROM reels WHERE id = ?', [id]);
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Reel not found.' });
    }
    const reel = rows[0];
    if (reel.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'You can only delete your own reels.' });
    }

    // Delete physical video file
    if (reel.video_url && reel.video_url.startsWith('/uploads/')) {
      const fs = require('fs');
      const path = require('path');
      const relativePath = reel.video_url.replace(/^\/uploads\//, '');
      const fullPath = path.join(baseUploads, relativePath);
      fs.unlink(fullPath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Failed to delete physical video file for reel:', fullPath, err.message);
        }
      });
    }

    if (db.isMock()) {
      db.mockDb.reels = (db.mockDb.reels || []).filter(r => r.id != id);
    } else {
      await db.query('DELETE FROM reels WHERE id = ?', [id]);
    }
    res.status(200).json({ success: true, message: 'Reel deleted successfully.' });
  } catch (error) {
    console.error('Delete reel error:', error.message);
    res.status(500).json({ success: false, error: 'Server error while deleting reel.' });
  }
}

// Update reel details (owner or admin only)
async function updateReel(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }
  const { id } = req.params;
  const { caption } = req.body;
  try {
    let rows;
    if (db.isMock()) {
      rows = (db.mockDb.reels || []).filter(r => r.id == id);
    } else {
      [rows] = await db.query('SELECT user_id FROM reels WHERE id = ?', [id]);
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Reel not found.' });
    }
    const reel = rows[0];
    if (reel.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'You are not authorized to edit this reel.' });
    }

    if (db.isMock()) {
      const match = (db.mockDb.reels || []).find(r => r.id == id);
      if (match) match.caption = caption || '';
    } else {
      await db.query('UPDATE reels SET caption = ? WHERE id = ?', [caption || '', id]);
    }
    res.status(200).json({ success: true, message: 'Reel updated successfully.' });
  } catch (error) {
    console.error('Update reel error:', error.message);
    res.status(500).json({ success: false, error: 'Server error while updating reel.' });
  }
}

// Update property status (owner or admin only)
async function updatePropertyStatus(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }
  const { id } = req.params;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ success: false, error: 'Status is required.' });
  }
  try {
    let rows;
    if (db.isMock()) {
      rows = db.mockDb.properties.filter(p => p.id == id);
    } else {
      [rows] = await db.query('SELECT user_id FROM properties WHERE id = ?', [id]);
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Property not found.' });
    }
    const property = rows[0];
    if (property.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'You are not authorized to update this listing.' });
    }

    if (db.isMock()) {
      const match = db.mockDb.properties.find(p => p.id == id);
      if (match) match.status = status;
    } else {
      await db.query('UPDATE properties SET status = ? WHERE id = ?', [status, id]);
    }
    res.status(200).json({ success: true, message: 'Property status updated successfully.' });
  } catch (error) {
    console.error('Update property status error:', error.message);
    res.status(500).json({ success: false, error: 'Server error while updating property status.' });
  }
}

module.exports = {
  createProperty,
  updateProperty,
  deleteProperty,
  getProperties,
  getPropertyById,
  toggleSaveProperty,
  scheduleVisit,
  submitEnquiry,
  addReview,
  getReels,
  uploadReel,
  toggleReelLike,
  addReelComment,
  deleteReel,
  updateReel,
  updatePropertyStatus
};
