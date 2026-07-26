const db = require('../config/db');

// Get active banners (public)
async function getBanners(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM homepage_banners WHERE is_active = 1 ORDER BY sort_order ASC, id DESC');
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Get banners error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve homepage banners.' });
  }
}

// Get all banners (Admin only)
async function getAllBannersForAdmin(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM homepage_banners ORDER BY sort_order ASC, id DESC');
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Get admin banners error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve all homepage banners.' });
  }
}

// Create new banner (Admin only)
async function createBanner(req, res) {
  let { imageUrl, title, subtitle, linkUrl, sortOrder, isActive } = req.body;
  
  // If file uploaded, process it
  if (req.file) {
    try {
      const { processImage } = require('../middlewares/uploadMiddleware');
      imageUrl = await processImage(req.file.buffer, 'banners', 'banner');
    } catch (uploadErr) {
      console.error('Banner upload processing error:', uploadErr.message);
      return res.status(500).json({ success: false, error: 'Failed to process banner image file.' });
    }
  }

  if (!imageUrl) {
    return res.status(400).json({ success: false, error: 'Banner image is required.' });
  }

  const finalOrder = sortOrder !== undefined ? parseInt(sortOrder) : 0;
  const finalActive = isActive !== undefined ? (isActive === 'true' || isActive === true || isActive === '1') : true;

  try {
    const [result] = await db.query(
      'INSERT INTO homepage_banners (image_url, title, subtitle, link_url, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [imageUrl, title || null, subtitle || null, linkUrl || null, finalOrder, finalActive]
    );
    res.status(201).json({
      success: true,
      message: 'Banner created successfully!',
      data: { id: result.insertId, image_url: imageUrl, title, subtitle, linkUrl, sort_order: finalOrder, is_active: finalActive }
    });
  } catch (error) {
    console.error('Create banner error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to save homepage banner.' });
  }
}

// Update existing banner (Admin only)
async function updateBanner(req, res) {
  const { id } = req.params;
  let { imageUrl, title, subtitle, linkUrl, isActive, sortOrder } = req.body;

  // If file uploaded, process it
  if (req.file) {
    try {
      const { processImage } = require('../middlewares/uploadMiddleware');
      imageUrl = await processImage(req.file.buffer, 'banners', 'banner');
    } catch (uploadErr) {
      console.error('Banner upload processing error:', uploadErr.message);
      return res.status(500).json({ success: false, error: 'Failed to process banner image file.' });
    }
  }

  try {
    const [rows] = await db.query('SELECT * FROM homepage_banners WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Banner not found.' });
    }
    const current = rows[0];
    const finalImg = imageUrl !== undefined ? imageUrl : current.image_url;
    const finalTitle = title !== undefined ? title : current.title;
    const finalSubtitle = subtitle !== undefined ? subtitle : current.subtitle;
    const finalLink = linkUrl !== undefined ? linkUrl : current.link_url;
    const finalActive = isActive !== undefined ? (isActive === 'true' || isActive === true || isActive === '1') : current.is_active;
    const finalOrder = sortOrder !== undefined ? parseInt(sortOrder) : current.sort_order;

    // If updating to a new image, delete old physical file if it starts with '/uploads/'
    if (req.file && current.image_url && current.image_url.startsWith('/uploads/') && current.image_url !== finalImg) {
      const fs = require('fs');
      const path = require('path');
      const prodPublicHtml = '/home/u726900424/domains/houserenter.in/public_html';
      const basePublic = fs.existsSync(prodPublicHtml) ? prodPublicHtml : path.join(__dirname, '..', 'public');
      const fullPath = path.join(basePublic, current.image_url);
      fs.unlink(fullPath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Failed to delete old physical banner file during replace:', fullPath, err.message);
        }
      });
    }

    await db.query(
      'UPDATE homepage_banners SET image_url = ?, title = ?, subtitle = ?, link_url = ?, is_active = ?, sort_order = ? WHERE id = ?',
      [finalImg, finalTitle, finalSubtitle, finalLink, finalActive, finalOrder, id]
    );
    res.status(200).json({ success: true, message: 'Banner updated successfully!' });
  } catch (error) {
    console.error('Update banner error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update banner.' });
  }
}

// Delete banner (Admin only)
async function deleteBanner(req, res) {
  const { id } = req.params;

  try {
    const [rows] = await db.query('SELECT * FROM homepage_banners WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Banner not found.' });
    }
    
    const current = rows[0];
    // Clean up physical file
    if (current.image_url && current.image_url.startsWith('/uploads/')) {
      const fs = require('fs');
      const path = require('path');
      const prodPublicHtml = '/home/u726900424/domains/houserenter.in/public_html';
      const basePublic = fs.existsSync(prodPublicHtml) ? prodPublicHtml : path.join(__dirname, '..', 'public');
      const fullPath = path.join(basePublic, current.image_url);
      fs.unlink(fullPath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Failed to delete physical banner file:', fullPath, err.message);
        }
      });
    }

    await db.query('DELETE FROM homepage_banners WHERE id = ?', [id]);
    res.status(200).json({ success: true, message: 'Banner deleted successfully!' });
  } catch (error) {
    console.error('Delete banner error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete banner.' });
  }
}

module.exports = {
  getBanners,
  getAllBannersForAdmin,
  createBanner,
  updateBanner,
  deleteBanner
};
