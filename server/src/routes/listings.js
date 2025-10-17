const express = require('express');
const router = express.Router();
const {
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
} = require('../controllers/listingController');
const { authenticateJWT, optionalAuth } = require('../middleware/auth');
const {
  createListingValidation,
  mongoIdValidation,
  paginationValidation,
} = require('../middleware/validation');

// Public routes (with optional auth for views tracking)
router.get('/', optionalAuth, paginationValidation, getListings);
router.get('/:id', optionalAuth, mongoIdValidation, getListingById);

// Protected routes
router.post('/', authenticateJWT, createListingValidation, createListing);
router.patch('/:id', authenticateJWT, mongoIdValidation, updateListing);
router.delete('/:id', authenticateJWT, mongoIdValidation, deleteListing);

module.exports = router;

