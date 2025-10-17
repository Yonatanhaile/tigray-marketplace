const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const { User, Listing, Order } = require('../models');

describe('Orders Endpoints', () => {
  let sellerToken, buyerToken, sellerId, buyerId, listingId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);

    // Create seller
    const sellerRes = await request(app).post('/api/auth/register').send({
      name: 'Order Test Seller',
      email: `orderseller${Date.now()}@example.com`,
      phone: `+25191${Math.floor(1000000 + Math.random() * 9000000)}`,
      password: 'password123',
      roles: ['seller'],
    });
    sellerToken = sellerRes.body.token;
    sellerId = sellerRes.body.user.id;

    // Create buyer
    const buyerRes = await request(app).post('/api/auth/register').send({
      name: 'Order Test Buyer',
      email: `orderbuyer${Date.now()}@example.com`,
      phone: `+25191${Math.floor(1000000 + Math.random() * 9000000)}`,
      password: 'password123',
    });
    buyerToken = buyerRes.body.token;
    buyerId = buyerRes.body.user.id;

    // Create listing
    const listingRes = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: 'Order Test Product',
        description: 'Product for order testing',
        price: 5000,
        payment_methods: ['cash', 'm-birr'],
      });
    listingId = listingRes.body.listing._id;
  });

  afterAll(async () => {
    await Order.deleteMany({ $or: [{ buyerId }, { sellerId }] });
    await Listing.deleteMany({ sellerId });
    await User.deleteMany({ _id: { $in: [sellerId, buyerId] } });
    await mongoose.connection.close();
  });

  describe('POST /api/orders', () => {
    it('should create an order intent', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId,
          selected_payment_method: 'cash',
          meeting_info: {
            date: new Date().toISOString(),
            place: 'City Center',
          },
          buyer_note: 'Looking forward to purchase',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('order');
      expect(res.body.order.status).toBe('requested');
    });

    it('should not allow buyer to purchase own listing', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          listingId,
          selected_payment_method: 'cash',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('cannot purchase your own');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          listingId,
          selected_payment_method: 'cash',
        });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/orders/my-orders', () => {
    it('should get buyer orders', async () => {
      const res = await request(app)
        .get('/api/orders/my-orders?role=buyer')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('orders');
      expect(Array.isArray(res.body.orders)).toBe(true);
    });

    it('should get seller orders', async () => {
      const res = await request(app)
        .get('/api/orders/my-orders?role=seller')
        .set('Authorization', `Bearer ${sellerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('orders');
    });
  });

  describe('PATCH /api/orders/:id', () => {
    let orderId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          listingId,
          selected_payment_method: 'cash',
        });
      orderId = res.body.order._id;
    });

    it('should update order status as seller', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          status: 'seller_confirmed',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.order.status).toBe('seller_confirmed');
    });
  });
});

