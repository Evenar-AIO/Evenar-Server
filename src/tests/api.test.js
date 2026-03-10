const request = require('supertest');
const { app } = require('../../index');

describe('Evenar API', () => {
  test('GET /health should return ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('GET /events should return list', async () => {
    const res = await request(app).get('/events');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
