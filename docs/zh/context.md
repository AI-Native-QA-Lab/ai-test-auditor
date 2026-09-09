<div align="right"><a href="../context.md">English</a> · <strong>简体中文</strong></div>

# 项目上下文

## 目的与 v1.0 基线

AI Test Auditor 是用于识别无效 JavaScript 与 TypeScript 测试的确定性、纯源码静态分析器。v1.0 是当前稳定基线：显式门禁只阻断确定性的 `FAKE`，未标记测试绝不等于强测试。

## 当前能力地图

CLI 支持源码审计、变更文件选择、建议性策略、基线比较、建议性决策投影和严格的仅 `FAKE` 门禁。规则语义见[规则目录](./rules.md)，公开行为见[需求文档](./requirements.md)。

## 不可突破的分析边界

项目不 import、执行或评估被审计源码。`FAKE` 是确定性证据，`WEAK` 是不阻断的上下文提示，`UNASSESSED` 不等于 `STRONG`。FTR 和 Trust Score 仅用于排序，不是运行时质量或发布结论。

## 命令与契约入口

通过显式本地路径使用 `ata review`、`ata decision` 和 `ata gate`。有效静态审计/门禁结果使用 `0`、`1`、`2` 退出码；命令契约见根目录 [README](../../README_ZH.md) 与[架构设计](./architecture.md)。

## 文档地图

项目文档保持中英文： [迭代计划](./roadmap.md)、[开发指南](./development.md)、[项目上下文](./context.md) 与根目录 README。中文[历史文档](../history/product-evolution.md)保存已完成版本的决策与实施经验。

## 后续迭代入口

[迭代计划](./roadmap.md)是未来工作的唯一详细来源。v2.0 尚未交付；保留的[可选 AI 辅助设计](../superpowers/specs/2026-09-08-optional-ai-assist-design.md)在实施前仍需独立批准。

## 验证与维护

修改行为前阅读 `AGENTS.md`、受影响规则和测试。公开项目文档保持中英文同步，过程证据记录在中文历史实施经验中，交付前运行文档化的本地验证门禁。
