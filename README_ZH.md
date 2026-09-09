<div align="right"><a href="./README.md">English</a> · <strong>简体中文</strong></div>

# AI Test Auditor

## 许可证

本项目采用 [PolyForm Noncommercial License 1.0.0](LICENSE)。商业用途不属于该许可证
允许的用途；使用、复制或分发前请阅读[官方完整条款](https://polyformproject.org/licenses/noncommercial/1.0.0)。

> 不要信任 AI 生成的测试。验证它们。

**AI Test Auditor** 是一个本地优先的 CLI，用于发现 JavaScript / TypeScript 测试中可由静态规则确定识别的无效测试信号。它审计测试**源码**，不会运行被审计的测试。

核心问题是：**如果生产行为出错，这条测试真的会失败吗？**

## 能做什么

- 扫描 `.test.ts`、`.spec.ts`、`.test.tsx`、`.spec.tsx`、`.test.js`、`.spec.js` 和 `.e2e.ts`。
- 用 TypeScript AST 提取直接定义的 Jest、Vitest、Playwright `test` / `it` 回调。
- 输出带源码位置和修复建议的高置信度、确定性 `FAKE` 与 `WEAK` 发现项。
- 通过 `ata review` 提供文本或 JSON 输出。
- 内置独立的中英文 `test-quality-audit` Skill 与有证据边界的 Prompt。
- 通过 `--mutation-report` 读取可选、版本化的变异证据，但不运行 mutation 工具。
- 通过 `--changed-since <ref>` 选择相对于本地提交发生变更的当前支持测试文件。
- 通过可选的版本化 `--policy <path>` 文件提供建议性的展示与选择计数。

## 工具不做什么

它**不会**执行测试、检查运行时行为、调用 LLM、运行 Mutation Testing、计算覆盖率、校验 import / fixture，也不会将未命中的测试标为 `STRONG`。未命中的测试统一是 `UNASSESSED`。

## v0.4 变异证据

传入由你自己的 mutation 工作流产出的报告：

```bash
node dist/cli.js review ./tests --mutation-report ./mutation-report.json --format json
```

```json
{
  "version": "1",
  "engine": "stryker",
  "command": "npx stryker run",
  "threshold": {
    "minimumScore": 80,
    "source": "stryker.conf.json: thresholds.high"
  },
  "result": {
    "totalMutants": 10,
    "killed": 8,
    "survived": 2,
    "score": 80
  }
}
```

记录的命令与阈值来源是必需的溯源信息，不是待执行的指令：AI Test Auditor 绝不会执行该命令。低于 `minimumScore` 的结果仍是有效的建议性证据；它绝不改变静态分类、FTR、Trust Score 或进程退出码。

## 快速开始

需要 Node.js 20 或更高版本。

```bash
npm install
npm run build
node dist/cli.js review ./tests
```

```bash
node dist/cli.js review tests/checkout.e2e.ts --type e2e
node dist/cli.js review benchmarks --format json
node dist/cli.js review . --changed-since HEAD~1
```

## v0.6.0 建议性策略

传入显式的本地 JSON 策略，为不变的纯源码审计附加建议性说明：

```bash
node dist/cli.js review ./tests --policy ./audit-policy.json --format json
```

```json
{
  "version": "1",
  "id": "local-review-policy",
  "mode": "advisory",
  "disabledRuleIds": ["UT002"]
}
```

`disabledRuleIds` 可省略，且只能包含唯一的非空规则 ID。策略仅为 advisory：它报告禁用和活跃发现项计数，但不移除发现项，也不改变静态分类、汇总、FTR、Trust Score 或退出码。无效策略输入返回退出码 `2`。它不是默认 CI 门禁，也不作发布决定。

安装后的包可通过 `ata review [path]` 运行；源码 checkout 使用 `node dist/cli.js review [path]`。两者默认审计当前目录，且绝不会 import 或执行目标源码。`--changed-since` 的 ref 是本地提交；它只选择当前支持的测试文件，不会推断生产代码与测试之间的关联。

## v0.7.0 基线对比

传入本地 version `1` 基线，按稳定身份标记本次发现项：

```bash
node dist/cli.js review ./tests --baseline ./finding-baseline.json --format json
```

```json
{
  "version": "1",
  "id": "main",
  "findings": [
    {
      "ruleId": "UT002",
      "filePath": "tests/example.test.ts",
      "line": 12,
      "classification": "FAKE",
      "severity": "CRITICAL"
    }
  ]
}
```

身份由规则 ID、相对输入根目录的 POSIX 路径、行号、分类和严重性组成。基线只报告历史和新增发现项计数。历史项不代表已接受、安全、豁免或已解决；它不改变静态分类、发现项、FTR、Trust Score、策略计数或退出语义。无效基线输入返回退出码 `2`。

## v0.8.0 CI 无关的建议性决策

`ata decision ./decision-envelope.json` 将严格的本地 version `1` 静态审计信封转换为简洁的 JSON 建议性决策。有效决策返回 `0`；无效或不支持的信封返回 `2`。它拒绝未知字段和 `semantic`/`mutation` 附件。策略和基线 ID 仅作上下文；该决策不是 CI 门禁、通过/失败结果、豁免或发布决定。

## v0.9.0 GitHub Actions 参考工作流

`.github/workflows/audit-reference.yml` 是显式 opt-in 的 GitHub Actions 参考工作流。`pull_request` 使用 PR base SHA；手动 `workflow_dispatch` 必须提供 `base-ref`。它运行 `--changed-since`，将静态审计与建议性决策写入 Job Summary，并保留审计退出码。它仅使用 `contents: read`，不创建 PR 评论、不使用凭据，也不执行被审计源码。

## v1.0.0 显式 opt-in 策略门禁

`ata gate ./gate-policy.json ./audit-envelope.json` 使用严格静态快照与显式本地策略。唯一有效策略为 `mode: "gate"` 且 `blockOn: ["FAKE"]`；`FAKE` 以退出码 `1` 阻断，`WEAK 不阻断`。通过返回 `0`，无效策略或快照返回 `2`。它不执行被审计源码，通过也不证明测试是 `STRONG`。

### 退出码

| 代码 | 含义                                                               |
| ---- | ------------------------------------------------------------------ |
| `0`  | 未输出确定性的 `FAKE` 发现项；这不表示测试已经很强。               |
| `1`  | 至少输出一条确定性的 `FAKE` 发现项。                               |
| `2`  | 命令、无效策略输入、输入路径或选中的源码无效（包括 `PARSER001`）。 |

## 规则与边界

v0.5 包含 UT001、UT002、UT003、UT004、UT008、UT011、API001、API002、E2E001、E2E002、E2E003、E2E004。规则优先保证可解释、可追溯的源码证据，而非追求规则数量。完整说明见[规则目录](./docs/zh/rules.md)。

FTR 和 Trust Score 只是透明的排序启发式指标，不是运行时质量、变异分数或发布结论。

## 文档

- [需求文档](./docs/zh/requirements.md)
- [架构设计](./docs/zh/architecture.md)
- [规则目录](./docs/zh/rules.md)
- [迭代计划](./docs/zh/roadmap.md)
- [开发指南](./docs/zh/development.md)
- [实施过程记录](./docs/process/implementation-record_zh.md)
- [贡献指南](./CONTRIBUTING_ZH.md)

## 开发验证

```bash
npm test
npm run lint
npm run typecheck
npm run format:check
npm run build
```

项目约定见 [AGENTS.md](./AGENTS.md)。
