# 示例 — 确定性证据与审查问题

## 给定源码

```ts
test('creates an order', async () => {
  const response = await request(app).post('/orders').send(order);
  expect(response.status).toBe(200);
});
```

## 预期审计形状

- **确定性发现项：** `API001`，`WEAK`，因为唯一已识别断言只检查 response status。
- **审查问题：** 哪些响应字段或持久化效果才定义订单创建成功？源码无法推断。
- **边界：** 未提供执行、接口契约或数据库证据。
