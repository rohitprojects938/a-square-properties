const { body, validationResult } = require('express-validator');

// Validation rules for Register
const registerRules = [
  body('name').trim().custom((value) => {
    if (!value || value.length < 2 || value.length > 60) {
      throw new Error('Name must be between 2 and 60 characters.');
    }
    if (/^\d+$/.test(value)) {
      throw new Error('Name cannot contain only numbers.');
    }
    if (/[<>]/.test(value)) {
      throw new Error('HTML tags are not allowed in name.');
    }
    return true;
  }),
  body('email').trim().custom((value) => {
    if (!value) {
      throw new Error('Please enter a valid email address.');
    }
    const val = value.toLowerCase();
    if (val.includes('..') || val.includes(' ') || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) {
      throw new Error('Please enter a valid email address.');
    }
    return true;
  }).normalizeEmail(),
  body('phone').trim().custom((value) => {
    if (!value) {
      throw new Error('Please enter a valid 10-digit Indian mobile number.');
    }
    if (!/^[6-9]\d{9}$/.test(value)) {
      throw new Error('Please enter a valid 10-digit Indian mobile number.');
    }
    return true;
  }),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.')
];

// Validation rules for Login
const loginRules = [
  body('email').trim().custom((value) => {
    if (!value) {
      throw new Error('Please enter a valid email address.');
    }
    const val = value.toLowerCase();
    if (val.includes('..') || val.includes(' ') || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) {
      throw new Error('Please enter a valid email address.');
    }
    return true;
  }).normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.')
];

// Validation rules for Profile Update (name and phone are required)
const updateProfileRules = [
  body('name').trim().custom((value) => {
    if (!value || value.length < 2 || value.length > 60) {
      throw new Error('Name must be between 2 and 60 characters.');
    }
    if (/^\d+$/.test(value)) {
      throw new Error('Name cannot contain only numbers.');
    }
    if (/[<>]/.test(value)) {
      throw new Error('HTML tags are not allowed in name.');
    }
    return true;
  }),
  body('phone').trim().custom((value) => {
    if (!value) {
      throw new Error('Please enter a valid 10-digit Indian mobile number.');
    }
    if (!/^[6-9]\d{9}$/.test(value)) {
      throw new Error('Please enter a valid 10-digit Indian mobile number.');
    }
    return true;
  })
];

// Validation rules for Admin User Edit
const adminUpdateUserRules = [
  body('name').trim().custom((value) => {
    if (!value || value.length < 2 || value.length > 60) {
      throw new Error('Name must be between 2 and 60 characters.');
    }
    if (/^\d+$/.test(value)) {
      throw new Error('Name cannot contain only numbers.');
    }
    if (/[<>]/.test(value)) {
      throw new Error('HTML tags are not allowed in name.');
    }
    return true;
  }),
  body('phone').optional({ checkFalsy: true }).trim().custom((value) => {
    if (!/^[6-9]\d{9}$/.test(value)) {
      throw new Error('Please enter a valid 10-digit Indian mobile number.');
    }
    return true;
  })
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

// Validation rules for Enquiries
const enquiryRules = [
  body('name').trim().custom((value) => {
    if (!value || value.length < 2 || value.length > 60) {
      throw new Error('Name must be between 2 and 60 characters.');
    }
    if (/^\d+$/.test(value)) {
      throw new Error('Name cannot contain only numbers.');
    }
    if (/[<>]/.test(value)) {
      throw new Error('HTML tags are not allowed in name.');
    }
    return true;
  }),
  body('email').trim().custom((value) => {
    if (!value) {
      throw new Error('Please enter a valid email address.');
    }
    const val = value.toLowerCase();
    if (val.includes('..') || val.includes(' ') || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) {
      throw new Error('Please enter a valid email address.');
    }
    return true;
  }).normalizeEmail(),
  body('phone').trim().custom((value) => {
    if (!value) {
      throw new Error('Please enter a valid 10-digit Indian mobile number.');
    }
    if (!/^[6-9]\d{9}$/.test(value)) {
      throw new Error('Please enter a valid 10-digit Indian mobile number.');
    }
    return true;
  })
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
  updateProfileRules,
  adminUpdateUserRules,
  propertyRules,
  enquiryRules,
  checkValidation
};
