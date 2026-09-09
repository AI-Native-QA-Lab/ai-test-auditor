# HTML 报告与本地化设计

## 目标

为 `ata review` 增加可离线打开、单文件的交互 HTML 报告，使大型审计结果不必在终端或原始 JSON 中阅读。报告服务于本地审阅，不执行被审计源码，不读取网络、凭据或环境变量，也不改变现有审计语义和退出码。

## CLI 契约

`--format` 扩展为 `text`、`json`、`html`；默认仍为 `text`。新增：

```bash
ata review tests --format html > audit.html
ata review tests --format html --output audit.html
ata review tests --format html --locale zh-CN --output audit-zh.html
```

`--output <path>` 可用于任意格式；未指定时写标准输出。写入失败返回 `2`，不写入部分文件；审计得到的 `0`、`1`、`2` 语义保持不变。`--locale <locale>` 只接受 `en` 与 `zh-CN`，默认 `en`；未知值返回 `2`。

## 本地化边界

`text` 与 `html` 使用 `--locale` 本地化界面、汇总标签、分类说明、规则消息与修复建议。默认 `en` 保持当前人读输出的语言。

`json` 保持既有稳定 schema、字段名与英文消息，不受 `--locale` 影响；它面向基线、自动化和下游解析。规则 ID、classification、severity、文件路径、行号、FTR、Trust Score 和退出码在所有 locale 与格式中相同。

## HTML 报告

报告为完整独立的 HTML 文件，内嵌样式、脚本与审计数据，无 CDN、外部字体、图片、网络请求或构建步骤。视觉方向为深色“审阅工作台”：紧凑、可打印、可访问，优先显示证据而非营销型图表。

页面包含：

1. 报告标题、生成说明与 source-only 边界；
2. 汇总卡片：测试总数、FAKE、WEAK、UNASSESSED、FTR、Trust Score；
3. 固定的“不存在发现不等于 STRONG”提示；
4. 筛选控件：分类、规则 ID、多文件文本匹配、仅有发现的文件、重置；
5. 按文件分组的发现项，显示稳定规则 ID、classification、severity、行号、消息和 remediation；
6. 过滤后可见项计数和空状态。

报告不嵌入完整被审计源码、环境变量、凭据、模型输出、运行时结果或未使用的原始 JSON 字段。浏览器端筛选只隐藏或显示已生成发现项，不重新审计、不改变结果，也不改变 CLI 退出码。

## 可访问性与安全

所有审计提供的文本和路径都必须 HTML/JavaScript 转义，避免文件名或消息成为 HTML 注入。筛选控件使用可见标签、键盘可达焦点和语义化按钮/输入；分类和严重度不只依靠颜色区分。文件写入在审计成功渲染后以原子方式完成，避免部分报告被误用。

## 验证

新增聚焦 RED/GREEN 测试覆盖：默认英文、`zh-CN` text/html、本地化不改变 JSON、未知 locale、未知格式、`--output` 写入、写入失败为 `2`、HTML 转义、汇总、筛选器标记、无外部 URL、以及 HTML 中不出现完整测试源码。CLI 回归测试确认既有 text/json 命令、`review`、`decision` 和 `gate` 输出及退出语义不变。

完成前执行项目完整验证门禁；文档同步 README、中文 README、requirements、architecture、rules、Context、Skill、prompts、evals 与新的中文实施经验。未来计划仍以 Roadmap 为唯一详细来源。

## README 参数说明

中英文 README 的常用工作流必须新增“报告格式与语言”示例：默认 `text`/`en`、`--format json`、`--format html > audit.html`、`--output audit.html` 和 `--locale zh-CN`。说明 `--output` 适用于 text、json、html；`--locale` 仅影响 text/html，未输入时为 `en`；JSON 的字段和英文消息保持稳定。README 只展示最小命令和报告用途，筛选器、安全边界与完整契约链接到专门文档。

## 非目标

本次不新增规则、不运行测试或 mutation 命令、不调用模型或网络、不生成 PDF/远程托管报告、不修改 JSON schema、不在 HTML 中提供源码编辑或重新审计能力。
