import { expect, test } from 'vitest';

test('creates an order', async () => {
  const response = await request(app).post('/orders').send(order);
  expect(response.status).toBe(201);
});
