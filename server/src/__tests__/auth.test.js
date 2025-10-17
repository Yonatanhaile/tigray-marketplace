const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const { User } = require('../models');

describe('Auth Endpoints', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /test.*@example.com/ } });
    await mongoose.connection.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: `test${Date.now()}@example.com`,
          phone: `+25191${Math.floor(1000000 + Math.random() * 9000000)}`,
          password: 'password123',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('name', 'Test User');
    });

    it('should not register with duplicate email', async () => {
      const email = `test${Date.now()}@example.com`;
      
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User 1',
          email,
          phone: '+251911234567',
          password: 'password123',
        });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User 2',
          email,
          phone: '+251911234568',
          password: 'password123',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', true);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', true);
    });
  });

  describe('POST /api/auth/login', () => {
    const testUser = {
      name: 'Login Test User',
      email: `logintest${Date.now()}@example.com`,
      phone: '+251911234569',
      password: 'password123',
    };

    beforeAll(async () => {
      await request(app).post('/api/auth/register').send(testUser);
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(testUser.email);
    });

    it('should not login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error', true);
    });

    it('should not login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error', true);
    });
  });

  describe('GET /api/auth/profile', () => {
    let token;

    beforeAll(async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Profile Test User',
        email: `profiletest${Date.now()}@example.com`,
        phone: '+251911234570',
        password: 'password123',
      });
      token = res.body.token;
    });

    it('should get user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('name', 'Profile Test User');
    });

    it('should not get profile without token', async () => {
      const res = await request(app).get('/api/auth/profile');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error', true);
    });
  });
});

