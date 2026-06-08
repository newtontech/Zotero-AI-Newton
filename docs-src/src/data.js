const AppData = {
  en: {
    nav: {
      home: "Home",
      features: "Features",
      howItWorks: "How it Works",
      testimonials: "Stories",
      faq: "FAQ",
    },
    hero: {
      badge: "New: Zotero 7 Support",
      title: "Chat with your library,",
      titleHighlight: "like magic.",
      subtitle:
        "The local-first AI co-pilot for Zotero. Grounded chats on items, PDFs, or entire collections with zero data leaks.",
      ctaPrimary: "Download Beta",
      ctaSecondary: "View on GitHub",
    },
    features: [
      {
        icon: "MessageSquare",
        title: "AI Knowledge Workspace",
        desc: "Multi-turn chats that stay in sync with your Zotero selection. Ask questions, get answers.",
      },
      {
        icon: "FileText",
        title: "PDF Superpowers",
        desc: "Instant summaries and Q&A that automatically reference your attached PDFs.",
      },
      {
        icon: "FolderOpen",
        title: "Collection Intelligence",
        desc: "Reason across entire folders. Aggregate knowledge before calling the LLM.",
      },
      {
        icon: "Cpu",
        title: "Model Agnostic",
        desc: "Use OpenAI, DeepSeek, or your own local LLM (Ollama, LM Studio).",
      },
      {
        icon: "Zap",
        title: "Tone Mastery",
        desc: "Switch between Concise, Detailed, or Creative modes instantly.",
      },
      {
        icon: "Shield",
        title: "Privacy First",
        desc: "Your data stays local. We collect zero telemetry. You control the API keys.",
      },
    ],
    howItWorks: {
      title: "How it Works",
      steps: [
        { title: "Install", desc: "Download the XPI and install in Zotero 7." },
        {
          title: "Configure",
          desc: "Add your API key (OpenAI/DeepSeek) or local endpoint.",
        },
        { title: "Select", desc: "Click a paper or collection in Zotero." },
        { title: "Chat", desc: "Open the sidebar and start asking questions!" },
      ],
    },
    testimonials: [
      {
        name: "Demo User A",
        role: "Researcher",
        text: "Finally, an AI tool that respects my privacy and integrates directly into my workflow. No more copy-pasting into ChatGPT.",
      },
      {
        name: "Demo User B",
        role: "PhD Student",
        text: "Newton lets me chat with an entire Zotero collection as if it were one document—lit reviews are twice as fast now.",
      },
      {
        name: "Demo User C",
        role: "Academic",
        text: "The local-first design means I can analyze sensitive PDFs with zero data leaks while keeping answers grounded in my library.",
      },
    ],
    faq: [
      {
        q: "Where does my data go?",
        a: "Nowhere but your local machine and the API provider you choose (e.g., OpenAI). We do not see or store your data.",
      },
      {
        q: "Is it free?",
        a: "The extension is free and open source. You only pay for your own API usage (if using paid models).",
      },
      {
        q: "Does it work with Zotero 6?",
        a: "We are focusing on Zotero 7 for the best performance and UI integration.",
      },
    ],
  },
  zh: {
    nav: {
      home: "首页",
      features: "功能",
      howItWorks: "原理",
      testimonials: "案例",
      faq: "常见问题",
    },
    hero: {
      badge: "全新：支持 Zotero 7",
      title: "与文献对话，",
      titleHighlight: "就像魔法。",
      subtitle:
        "Zotero 的本地优先 AI 副驾。基于条目、PDF 或整个集合的有据问答，零数据泄露。",
      ctaPrimary: "下载 Beta 版",
      ctaSecondary: "GitHub 源码",
    },
    features: [
      {
        icon: "MessageSquare",
        title: "AI 知识工作区",
        desc: "多轮对话与 Zotero 选区保持同步。提问，即刻获知答案。",
      },
      {
        icon: "FileText",
        title: "PDF 超能力",
        desc: "自动引用附件 PDF 的即时摘要和问答。",
      },
      {
        icon: "FolderOpen",
        title: "集合智能",
        desc: "跨文件夹推理。在调用 LLM 之前聚合知识。",
      },
      {
        icon: "Cpu",
        title: "模型无关",
        desc: "支持 OpenAI、DeepSeek 或您的本地 LLM (Ollama, LM Studio)。",
      },
      {
        icon: "Zap",
        title: "语气大师",
        desc: "瞬间切换精简、详细或创意模式。",
      },
      {
        icon: "Shield",
        title: "隐私优先",
        desc: "数据仅留本地。我们零遥测。API Key 由您掌控。",
      },
    ],
    howItWorks: {
      title: "工作原理",
      steps: [
        { title: "安装", desc: "下载 XPI 并在 Zotero 7 中安装。" },
        {
          title: "配置",
          desc: "添加您的 API Key (OpenAI/DeepSeek) 或本地端点。",
        },
        { title: "选择", desc: "在 Zotero 中点击论文或集合。" },
        { title: "对话", desc: "打开侧边栏，开始提问！" },
      ],
    },
    testimonials: [
      {
        name: "示例用户 A",
        role: "研究人员",
        text: "终于有一个尊重隐私并直接融入我工作流的 AI 工具了，再也不用复制粘贴到 ChatGPT。",
      },
      {
        name: "示例用户 B",
        role: "博士生",
        text: "可以把整个 Zotero 集合当作一本书来对话，文献综述效率直接翻倍。",
      },
      {
        name: "示例用户 C",
        role: "学者",
        text: "本地优先的设计让我能分析敏感 PDF 而无需担心数据泄露，回答还会自动引用我的库。",
      },
    ],
    faq: [
      {
        q: "我的数据去哪了？",
        a: "除了您的本地机器和您选择的 API 提供商（如 OpenAI），哪里都不去。我们要么看不到，要么不存储您的数据。",
      },
      {
        q: "它是免费的吗？",
        a: "插件是免费开源的。您只需为您自己的 API 使用付费（如果使用付费模型）。",
      },
      {
        q: "支持 Zotero 6 吗？",
        a: "我们专注于 Zotero 7，以获得最佳性能和 UI 集成。",
      },
    ],
  },
};

export default AppData;
