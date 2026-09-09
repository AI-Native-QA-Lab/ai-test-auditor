# GitHub README 优化设计

## 目标

将 v1.0 README 调整为标准 GitHub 项目入口，同时服务 CLI 使用者和开源贡献者。README 必须让新读者在首次阅读时理解项目边界、完成一次本地审计、找到进阶工作流与贡献入口；详细规则、架构和历史资料仍由专门文档承担。

## 信息架构

英文 `README.md` 与中文 `README_ZH.md` 保持同一节奏和链接范围：

1. 标题、语言切换、CI 状态与一句话定位；
2. Why / 为什么：无效测试会带来虚假信心，工具以确定性静态证据辅助审计；
3. What it does / does not do：支持范围、`FAKE`/`WEAK`/`UNASSESSED` 边界，以及不执行源码的限制；
4. Quick start：Node 20+、安装、构建、首次 `review`、输出含义；
5. Common workflows：changed-since、mutation evidence、advisory policy、baseline、decision 与 gate，每项只给最小命令和链接；
6. Results and exit codes：输出分类和 `0`/`1`/`2`，强调通过不等于 `STRONG`；
7. Documentation：规则、需求、架构、Roadmap、Context、开发和中文历史资料；
8. Contributing：开发验证命令与贡献指南；
9. License。

## 内容边界

README 只描述已实现的 v1.0 行为。v2.0 仅在一个简短的 Next 区块中标为未交付，并链接 Roadmap；不包含实施步骤、日期、模型供应商、阈值或兼容性承诺。

不在 README 复制完整规则表、JSON schema、历史版本流水、设计计划、原始测试输出或完整 GitHub Actions YAML。它们分别链接到规则目录、架构、History 和专门工作流文档。

## 标准 GitHub 元素

保留现有 CI badge；不增加没有可验证来源的下载量、覆盖率、发布、质量或兼容性徽章。提供明确的贡献链接和许可证链接。示例使用源码 checkout 的 `node dist/cli.js`，并说明安装后的 `ata` 等价命令，避免对尚未验证的发布安装方式作假设。

## 双语与验证

英文是主入口，中文结构和事实同步。命令、退出码、分类、边界、链接目标必须一致；中文历史资料只以中文标签链接。扩展文档契约测试以检查新的标题、快速开始、贡献入口、Next 状态和双语链接标记；运行聚焦 RED/GREEN 后执行完整验证门禁与链接检查。

## 非目标

本次不改变 CLI、规则、输出、退出码、Roadmap 内容、Context、AGENTS、Skill 或历史文档，不发布版本、不推送、不创建 PR。
