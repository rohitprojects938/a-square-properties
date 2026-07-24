const db = require('../config/db');

// Get active banners
async function getBanners(req, res) {
  try {
    let rows;
    if (db.isMock()) {
      rows = db.mockDb.homepage_banners || [];
    } else {
      [rows] = await db.query('SELECT * FROM homepage_banners WHERE is_active = 1 ORDER BY id DESC');
    }
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Get banners error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve homepage banners.' });
  }
}

// Create new banner (Admin only)
async function createBanner(req, res) {
  const { imageUrl, title, subtitle, linkUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ success: false, error: 'Banner image URL is required.' });
  }

  try {
    if (db.isMock()) {
      if (!db.mockDb.homepage_banners) db.mockDb.homepage_banners = [];
      const newBanner = {
        id: db.mockDb.homepage_banners.length + 1,
        image_url: imageUrl,
        title: title || null,
        subtitle: subtitle || null,
        link_url: linkUrl || null,
        is_active: true
      };
      db.mockDb.homepage_banners.push(newBanner);
      res.status(201).json({ success: true, message: 'Banner created successfully!', data: newBanner });
    } else {
      const [result] = await db.query(
        'INSERT INTO homepage_banners (image_url, title, subtitle, link_url) VALUES (?, ?, ?, ?)',
        [imageUrl, title || null, subtitle || null, linkUrl || null]
      );
      res.status(201).json({
        success: true,
        message: 'Banner created successfully!',
        data: { id: result.insertId, image_url: imageUrl, title, subtitle, linkUrl }
      });
    }
  } catch (error) {
    console.error('Create banner error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to save homepage banner.' });
  }
}

// Update existing banner (Admin only)
async function updateBanner(req, res) {
  const { id } = req.params;
  const { imageUrl, title, subtitle, linkUrl, isActive } = req.body;

  try {
    if (db.isMock()) {
      const banners = db.mockDb.homepage_banners || [];
      const banner = banners.find(b => b.id == id);
      if (!banner) {
        return res.status(404).json({ success: false, error: 'Banner not found.' });
      }
      if (imageUrl !== undefined) banner.image_url = imageUrl;
      if (title !== undefined) banner.title = title;
      if (subtitle !== undefined) banner.subtitle = subtitle;
      if (linkUrl !== undefined) banner.link_url = linkUrl;
      if (isActive !== undefined) banner.is_active = !!isActive;
      return res.status(200).json({ success: true, message: 'Banner updated successfully!', data: banner });
    } else {
      const [rows] = await db.query('SELECT * FROM homepage_banners WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Banner not found.' });
      }
      const current = rows[0];
      const finalImg = imageUrl !== undefined ? imageUrl : current.image_url;
      const finalTitle = title !== undefined ? title : current.title;
      const finalSubtitle = subtitle !== undefined ? subtitle : current.subtitle;
      const finalLink = linkUrl !== undefined ? linkUrl : current.link_url;
      const finalActive = isActive !== undefined ? !!isActive : current.is_active;

      await db.query(
        'UPDATE homepage_banners SET image_url = ?, title = ?, subtitle = ?, link_url = ?, is_active = ? WHERE id = ?',
        [finalImg, finalTitle, finalSubtitle, finalLink, finalActive, id]
      );
      res.status(200).json({ success: true, message: 'Banner updated successfully!' });
    }
  } catch (error) {
    console.error('Update banner error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update banner.' });
  }
}

// Delete banner (Admin only)
async function deleteBanner(req, res) {
  const { id } = req.params;

  try {
    if (db.isMock()) {
      const banners = db.mockDb.homepage_banners || [];
      const idx = banners.findIndex(b => b.id == id);
      if (idx === -1) {
        return res.status(404).json({ success: false, error: 'Banner not found.' });
      }
      banners.splice(idx, 1);
      res.status(200).json({ success: true, message: 'Banner deleted successfully!' });
    } else {
      const [rows] = await db.query('SELECT * FROM homepage_banners WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Banner not found.' });
      }
      await db.query('DELETE FROM homepage_banners WHERE id = ?', [id]);
      res.status(200).json({ success: true, message: 'Banner deleted successfully!' });
    }
  } catch (error) {
    console.error('Delete banner error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete banner.' });
  }
}

module.exports = {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner
};
