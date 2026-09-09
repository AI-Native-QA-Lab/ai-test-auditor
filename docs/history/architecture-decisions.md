# 架构决策

## v1.0 的持久边界

AI Test Auditor 是确定性、仅源码的静态分析器。它读取文本和显式输入工件，不 import、执行或评估被审计测试源码，不读取凭据，也不调用网络服务。当前组件和契约见[架构设计](../zh/architecture.md)与[规则目录](../zh/rules.md)。

## 分类与结论

- `FAKE` 只表示确定性语法证据；它可以作为显式门禁输入。
- `WEAK` 表示上下文相关的提示；它永不阻断。
- `UNASSESSED` 表示静态分析没有给出结论，绝不等同于 `STRONG`。

静态 finding、classification、FTR、Trust Score 和既有退出码是稳定语义。运行时、mutation 或模型适配器即使在未来获批准，也不得改变它们。

## 输入、建议与门禁

外部语义或 mutation 证据必须通过显式、版本化输入提供，命令字段只作溯源，不会被执行。advisory policy、baseline 和 decision 提供选择、比较或建议上下文；它们不是 CI gate、豁免或发布决定。

`ata gate` 只接受严格的 `FAKE`-only policy 与静态快照：通过返回 `0`，发现 `FAKE` 返回 `1`，无效输入返回 `2`。通过不证明测试是强测试。
