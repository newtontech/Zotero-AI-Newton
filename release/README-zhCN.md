# Zotero AI Newton

Zotero AI Newton 在 Zotero 中提供类似“玻尔知识库”的本地智能工作区，可针对单篇文献、附件 PDF 或整个文件夹进行多轮对话，并支持自定义 LLM 提供商。

📣 宣传站点：https://newtontech.github.io/Zotero-AI-Newton-website

## 主要特性

- **本地知识工作区**：对话历史与当前选中条目同步。
- **PDF 感知**：提问和总结时参考已关联的 PDF。
- **文件夹推理**：在同一文件夹内比较或汇总多篇论文。
- **可插拔模型**：在首选项中配置 OpenAI、DeepSeek 等密钥与模型。
- **语气切换**：在精炼、详细或创意回复之间快速切换。

## 安装

### 快速安装（0.0.1-beta 预构建包）

1. 直接下载 XPI（无需本地编译）：
   - 仓库内路径（仅用于构建输出，不提交）：`release/zotero-ai-newton-0.0.1-beta.xpi`
   - Release 最新下载：<https://github.com/newtontech/Zotero-AI-Newton/releases/latest>
2. 在 Zotero 中打开 **工具 → 附加组件**，点击 **从文件安装附加组件…** 并选择下载的 XPI。
3. 自动更新会使用 `release/update-beta.json`，保持 Beta 渠道同步，无需重复构建。

### 从源码构建

1. 安装 Node.js LTS 与 Zotero 7。
2. 安装依赖：
   ```sh
   npm install
   ```
3. 构建 XPI 安装包：
   ```sh
   npm run build
   ```
   生成的扩展位于 `.scaffold/build`。
4. 打开 Zotero **工具 → 附加组件**，选择 **从文件安装附加组件…**，加载生成的 XPI。

## 配置

在 **编辑 → 首选项 → Zotero AI Newton** 中填写 API 密钥、默认模型、对话范围（条目/文件夹/自动）和回答语气。这些设置仅存储在本地，并供 AI 工作区使用。

## 使用

- 选中条目或文件夹，在条目侧栏打开 **AI 工作区** 查看当前上下文。
- 点击 **打开对话窗口**（或右键菜单入口）开始多轮对话，回答会引用所选记录及其 PDF。
- 切换选区后可刷新上下文快照。

## 开发

- 热重载：`npm run start`
- 代码检查：`npm run lint:check`
- 发布前构建：`npm run build`

欢迎贡献改进（上下文提取、提示优化、更多模型接入等）。
