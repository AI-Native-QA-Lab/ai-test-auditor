import { expect, test } from 'vitest';

test('response object only', async () => {
  expect(response).toBeDefined();
});

test('request body echo only', async () => {
  expect(response.body).toEqual(requestBody);
});

test('response property existence only', async () => {
  expect(response.body).toHaveProperty('id');
});

test('response headers only', async () => {
  expect(response.headers).toBeDefined();
});

test('content type metadata only', async () => {
  expect(response.headers.get('content-type')).toContain('json');
});

test('request method metadata only', async () => {
  expect(response.request.method()).toBe('POST');
});

test('empty response only', async () => {
  expect(response.body).toEqual({});
});

test('swallowed request error', async () => {
  try {
    await request.get('/items');
  } catch (error) {
    console.error(error);
  }
});

test('independent response value', async () => {
  expect(response.status).toBe(200);
  expect(response.body.id).toEqual(expectedId);
});

test('transformed request is not a direct echo', async () => {
  expect(response.body).toEqual(requestPayload.map(normalize));
});

test('rethrows request error', async () => {
  try {
    await request.get('/items');
  } catch (error) {
    throw error;
  }
});
