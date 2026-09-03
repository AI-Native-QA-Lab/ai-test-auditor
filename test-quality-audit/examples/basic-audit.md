# Example — deterministic evidence and a review question

## Supplied source

```ts
test('creates an order', async () => {
  const response = await request(app).post('/orders').send(order);
  expect(response.status).toBe(200);
});
```

## Expected audit shape

- **Deterministic finding:** `API001`, `WEAK`, because the only recognized assertion checks response status.
- **Review question:** Which response fields or persisted effects define a successful order? This cannot be inferred from the source.
- **Boundary:** No execution, endpoint contract, or database evidence was supplied.
