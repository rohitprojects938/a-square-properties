const { body, validationResult } = require('express-validator');

// Validation rules for Register
const registerRules = [
  body('name').notEmpty().withMessage('Name is required.').trim(),
  body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('phone').notEmpty().withMessage('Phone number is required.').trim(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.')
];

// Validation rules for Login
const loginRules = [
  body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.')
];

// Validation rules for Property Posting
const propertyRules = [
  body('title').notEmpty().withMessage('Property title is required.').trim(),
  body('description').notEmpty().withMessage('Property description is required.').trim(),
  body('category').isIn(['independent_house', 'apartment', 'villa', 'pg', 'commercial', 'plot', 'farmhouse'])
    .withMessage('Valid property category is required.'),
  body('listing_type').isIn(['sale', 'rent', 'lease']).withMessage('Valid listing type is required.'),
  body('price').isNumeric().withMessage('Price must be a number.'),
  body('area_sqft').isInt({ min: 1 }).withMessage('Area must be a positive integer.'),
  body('address').notEmpty().withMessage('Address is required.').trim(),
  body('city').notEmpty().withMessage('City is required.').trim(),
  body('state').notEmpty().withMessage('State is required.').trim(),
  body('pincode').notEmpty().withMessage('Pincode is required.').trim()
];

// Middleware to check validation results
function checkValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => err.msg)
    });
  }
  next();
}

module.exports = {
  registerRules,
  loginRules,
  propertyRules,
  checkValidation
};
