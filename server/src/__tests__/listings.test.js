const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const { User, Listing } = require('../models');

describe('Listings Endpoints', () => {
  let sellerToken, buyerToken, sellerId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);

    // Create seller
    const sellerRes = await request(app).post('/api/auth/register').send({
      name: 'Test Seller',
      email: `seller${Date.now()}@example.com`,
      phone: `+25191${Math.floor(1000000 + Math.random() * 9000000)}`,
      password: 'password123',
      roles: ['seller'],
    });
    sellerToken = sellerRes.body.token;
    sellerId = sellerRes.body.user.id;

    // Create buyer
    const buyerRes = await request(app).post('/api/auth/register').send({
      name: 'Test Buyer',
      email: `buyer${Date.now()}@example.com`,
      phone: `+25191${Math.floor(1000000 + Math.random() * 9000000)}`,
      password: 'password123',
    });
    buyerToken = buyerRes.body.token;
  });

  afterAll(async () => {
    await Listing.deleteMany({ sellerId });
    await User.deleteMany({ _id: sellerId });
    await mongoose.connection.close();
  });

  describe('POST /api/listings', () => {
    it('should create a listing as seller', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Test Product',
          description: 'This is a test product description',
          price: 1000,
          currency: 'ETB',
          condition: 'new',
          payment_methods: ['cash', 'm-birr'],
          payment_instructions: 'Contact for payment details',
          images: [],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('listing');
      expect(res.body.listing.title).toBe('Test Product');
    });

    it('should not create listing without authentication', async () => {
      const res = await request(app)
        .post('/api/listings')
        .send({
          title: 'Test Product',
          description: 'Description',
          price: 1000,
          payment_methods: ['cash'],
        });

      expect(res.statusCode).toBe(401);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Test Product',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', true);
    });
  });

  describe('GET /api/listings', () => {
    it('should get all listings', async () => {
      const res = await request(app).get('/api/listings');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('listings');
      expect(Array.isArray(res.body.listings)).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app).get('/api/listings?page=1&limit=5');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/listings/:id', () => {
    let listingId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          title: 'Specific Test Product',
          description: 'Description',
          price: 2000,
          payment_methods: ['cash'],
        });
      listingId = res.body.listing._id;
    });

    it('should get listing by ID', async () => {
      const res = await request(app).get(`/api/listings/${listingId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('listing');
      expect(res.body.listing.title).toBe('Specific Test Product');
    });

    it('should return 404 for non-existent listing', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/listings/${fakeId}`);

      expect(res.statusCode).toBe(404);
    });
  });
});

