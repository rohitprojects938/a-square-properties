const db = require('../config/db');

// Get all blogs
async function getBlogs(req, res) {
  const { category } = req.query;
  try {
    let sql = 'SELECT * FROM blogs';
    let params = [];

    if (category) {
      sql += ' WHERE category = ?';
      params.push(category);
    }

    sql += ' ORDER BY id DESC';
    const [rows] = await db.query(sql, params);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Get blogs error: ', error.message);
    res.status(500).json({ success: false, error: 'Server blogs lookup failure.' });
  }
}

// Get single blog details by slug
async function getBlogBySlug(req, res) {
  const { slug } = req.params;
  try {
    const [blogs] = await db.query('SELECT * FROM blogs WHERE slug = ?', [slug]);
    if (blogs.length === 0) {
      return res.status(404).json({ success: false, error: 'Blog post not found.' });
    }

    const blog = blogs[0];

    // Increment blog views
    await db.query('UPDATE blogs SET views_count = views_count + 1 WHERE id = ?', [blog.id]);

    // Get blog comments
    const [comments] = await db.query('SELECT * FROM blog_comments WHERE blog_id = ? ORDER BY id DESC', [blog.id]);

    // Get related articles
    const [related] = await db.query('SELECT * FROM blogs WHERE category = ? AND id != ? LIMIT 3', [blog.category, blog.id]);

    res.status(200).json({
      success: true,
      data: {
        ...blog,
        comments,
        related
      }
    });
  } catch (error) {
    console.error('Get blog by slug error: ', error.message);
    res.status(500).json({ success: false, error: 'Server blog retrieve failure.' });
  }
}

// Add comment to blog post
async function addBlogComment(req, res) {
  const { blogId, authorName, commentText } = req.body;
  if (!blogId || !authorName || !commentText) {
    return res.status(400).json({ success: false, error: 'All fields are required.' });
  }

  try {
    await db.query(
      'INSERT INTO blog_comments (blog_id, author_name, comment_text) VALUES (?, ?, ?)',
      [blogId, authorName, commentText]
    );

    res.status(201).json({ success: true, message: 'Comment submitted successfully!' });
  } catch (error) {
    console.error('Add blog comment error: ', error.message);
    res.status(500).json({ success: false, error: 'Server comment submission failure.' });
  }
}

module.exports = {
  getBlogs,
  getBlogBySlug,
  addBlogComment
};
