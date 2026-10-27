<div align="right"><a href="./README.md">English</a> · <strong>简体中文</strong></div>

# AI Test Auditor

[![CI](https://github.com/naodeng/ai-test-auditor/actions/workflows/ci.yml/badge.svg)](https://github.com/naodeng/ai-test-auditor/actions/workflows/ci.yml)

> 不运行测试，静态审查 JavaScript 与 TypeScript 测试源码。

AI Test Auditor 是本地优先的纯源码审计工具，使用范围明确的规则检查测试是否可能无效。它读取受支持的测试源码，并给出供人工复核的证据。

## 为什么使用 AI Test Auditor？

测试看起来完整，却未必验证了可观察行为。AI Test Auditor 帮助审查者在依赖测试前发现可能造成虚假信心的源码模式。

## 核心能力与明确限制

- 支持 Jest、Vitest、Playwright，以及 Node `node:test` 的 `test` / `it` 回调。
- 输出带源码位置和修复建议的 `FAKE` 发现项与 `WEAK` 提示。
- 支持变更文件审查、可选 mutation evidence、建议性策略、基线比较、决策投影、HTML 报告和显式 opt-in 策略门禁。
- 不运行测试、不调用 LLM、不计算覆盖率，也不推断生产代码与测试的对应关系。未命中的测试是 `UNASSESSED`，不是 `STRONG`。

`FAKE` 是确定性的源码证据；`WEAK` 是上下文提示。FTR 和 Trust Score 用于安排复核优先级，不衡量运行时质量。

## 快速开始

需要 Node.js 20+。

```bash
npm install
npm run build
node dist/cli.js review ./tests --format json
```

JSON 报告会列出提取到的测试和发现项。退出码 `1` 表示至少输出一个 `FAKE`。安装后的 CLI 也提供 `ata review <path>` 命令。

## 常用工作流

```bash
# 审查相对本地 ref 发生变化的受支持测试文件。
node dist/cli.js review . --changed-since HEAD~1 --format json

# 添加可选证据或建议性上下文。
node dist/cli.js review ./tests --mutation-report ./mutation-report.json
node dist/cli.js review ./tests --policy ./audit-policy.json
node dist/cli.js review ./tests --baseline ./finding-baseline.json

# 生成本地 HTML 报告。
node dist/cli.js review ./tests --format html --locale zh-CN --output audit-zh.html

# 生成建议性决策，或运行显式启用的 FAKE-only 门禁。
node dist/cli.js decision ./decision-envelope.json
node dist/cli.js gate ./gate-policy.json ./audit-envelope.json

# 检查版本化源码 fixture。
npm run benchmark
```

`--policy` 是 advisory 策略，只供参考，不改变发现项或分类；它不是默认 CI 门禁。无效策略输入返回 `2`。审计配置细节见[需求文档](./docs/zh/requirements.md)。`--locale` 会本地化文本和 HTML；JSON 保持稳定 schema，消息仍为英文。

v1.2 规则目录包含 10 条 Unit、10 条 API 和 10 条 E2E 规则。`ata benchmark` 检查源码 fixture 一致性，不衡量代码覆盖率或运行时质量。

`ata decision` 只提供建议：有效决策返回 `0`，且它不是 CI 门禁。使用 `ata gate` 运行显式 opt-in 策略门禁；它只接受 `mode: "gate"` 和 `blockOn: ["FAKE"]`。WEAK 不阻断，门禁通过也不证明测试很强。GitHub Actions 参考工作流使用 `base-ref`、`--changed-since` 和 `contents: read`，不创建 PR 评论。

## 输出与退出码

| 代码 | 含义                                                         |
| ---- | ------------------------------------------------------------ |
| `0`  | 未输出确定性的 `FAKE`；不证明测试很强。                      |
| `1`  | 至少输出一个确定性的 `FAKE`。                                |
| `2`  | 命令、路径、无效策略输入或选中的源码无效，包括 `PARSER001`。 |

## 项目边界

审计器绝不 import 或执行被审计源码。它不证明测试强度、运行时质量、覆盖率、变异得分或发布就绪性。将发现项用于发布决定前，请先阅读[规则目录](./docs/zh/rules.md)。

## 文档导航

- [规则目录](./docs/zh/rules.md) · [需求](./docs/zh/requirements.md) · [架构](./docs/zh/architecture.md)
- [项目上下文](./docs/zh/context.md) · [迭代路线图](./docs/zh/roadmap.md) · [开发指南](./docs/zh/development.md)
- [贡献指南](./CONTRIBUTING_ZH.md) · [English](./CONTRIBUTING.md)
- [中文实施记录](./docs/history/implementation-notes.md)

## 下一步

v1.2.1 是当前稳定发布版本。当前版本之后的路线图项目尚未交付，详见[迭代路线图](./docs/zh/roadmap.md)。

## 参与贡献

请阅读[贡献指南](./CONTRIBUTING_ZH.md)。提交变更前运行：

```bash
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
```

项目规则见 [AGENTS.md](./AGENTS.md)，完整工作流程见[开发指南](./docs/zh/development.md)。

## 许可证

本项目采用 [PolyForm Noncommercial License 1.0.0](LICENSE)，不允许商业用途。请阅读[官方条款](https://polyformproject.org/licenses/noncommercial/1.0.0)。
