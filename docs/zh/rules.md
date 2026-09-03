<div align="right"><a href="../rules.md">English</a> · <strong>简体中文</strong></div>

# 规则目录

## 如何理解发现项

v0.1 所有发现项均是局部、语法级、高置信度的模式证据。信息说明观察到的模式，不证明整个测试或应用必然有缺陷；修复建议应作为人工审查的起点。

| ID     | 分类 | 严重性   | 确定性触发条件                                                            | 不证明                                       |
| ------ | ---- | -------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| UT001  | FAKE | CRITICAL | Unit/Jest/Vitest 回调没有 `expect(...)`。                                 | 没有断言的测试在其他机制下永远无价值。       |
| UT002  | FAKE | CRITICAL | `expect` 比较相同基本字面量。                                             | 每个常量断言在完整套件中都无帮助。           |
| UT003  | FAKE | CRITICAL | actual 与 expected 的 TypeScript AST 结构文本完全相同，且保留字面量内容。 | 写法不同但语义等价的表达式就是安全的。       |
| UT008  | FAKE | CRITICAL | `catch` 为空，或只向 `console` 日志。                                     | 任何有额外操作的 catch 都正确处理了错误。    |
| UT011  | FAKE | CRITICAL | 断言两侧调用相同 callee，且参数结构完全相同。                             | 每个双调用比较在所有上下文中都无效。         |
| API001 | WEAK | WARNING  | 所有识别到的断言只检查 `response.status` / `statusCode`。                 | 状态码断言对该接口一定不充分。               |
| E2E001 | FAKE | CRITICAL | Playwright 回调没有识别到 `expect`。                                      | 仅动作的 journey 不能用于准备或探索。        |
| E2E002 | WEAK | WARNING  | 所有 Playwright 断言都使用 `toHaveURL`。                                  | 只检查 URL 永远不能作为充分的 journey 结果。 |
| E2E004 | WEAK | WARNING  | `page.waitForTimeout` 使用数值字面量。                                    | 每个固定等待都可避免。                       |

## 误报控制

- 规则仅处理提取出的直接回调，不读取执行结果。
- `API001` 和 `E2E002` 要求有限断言是所有已识别断言的唯一目标。
- `E2E004` 只命中数值字面量；变量不命中。
- 未命中的测试刻意保持为 `UNASSESSED`。

## 新增规则

先写最小失败测试，确认它因缺少的行为而失败，再添加最小 AST 谓词。规则必须有稳定 namespace ID、信息/建议中的证据边界、正向与代表性反向测试；同次改动更新本目录与英文版本。
