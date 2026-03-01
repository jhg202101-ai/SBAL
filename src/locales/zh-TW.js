// 繁體中文翻譯
export default {
  // 導航列
  nav: {
    home: "首頁",
    docs: "技術文件",
    admin: "後台管理"
  },

  // 主橫幅
  hero: {
    title: "Stripe 計費抽象層",
    subtitle: "將 Stripe 訂閱整合變得更簡單、更快速。",
    viewGitHub: "查看 GitHub",
    readDocs: "閱讀文件"
  },

  // 特色
  features: {
    title: "為什麼選擇 SBAL？",
    efficiency: {
      title: "技能驅動的效率",
      desc: "我們的架構使用 Skill 固化模式，將開發速度提升 10 倍。使用經過驗證的模板快速交付。"
    },
    cost: {
      title: "成本優化",
      desc: "運行在 Cloudflare Workers 上，配合智能快取，基礎設施成本極低。將節省的費用回饋給您。"
    },
    production: {
      title: "生產級就緒",
      desc: "為擴展而生：內建速率限制、Webhook 驗簽、D1 持久化存儲。"
    }
  },

  // 定價
  pricing: {
    title: "簡單透明的價格",
    subtitle: "選擇適合您業務的方案。所有方案皆包含完整 API 存取。",
    getStarted: "立即開始",
    contactSales: "聯絡銷售",
    popular: "最受歡迎",
    base: {
      name: "基礎版",
      price: "$99",
      period: "/月",
      features: [
        "最多 1,000 個訂閱",
        "核心 API 存取",
        "社群支援"
      ]
    },
    growth: {
      name: "成長版",
      price: "$299",
      period: "/月",
      features: [
        "最多 5,000 個訂閱",
        "進階分析",
        "優先支援"
      ]
    },
    enterprise: {
      name: "企業版",
      price: "$999",
      period: "/月",
      features: [
        "無限訂閱",
        "自定義整合",
        "24/7 電話支援"
      ]
    }
  },

  // 頁尾
  footer: "© {{year}} SBAL by OpenClaw. 版權所有。",

  // 結帳彈窗
  modal: {
    title: "完成您的訂閱",
    emailLabel: "電子郵件地址",
    emailPlaceholder: "you@example.com",
    submit: "前往支付",
    cancel: "取消",
    processing: "處理中...",
    success: "✅ 點擊連結完成付款：",
    copy: "複製"
  },

  // 成功頁面
  success: {
    title: "訂閱已啟用！",
    welcome: "歡迎使用 SBAL，<strong>{{email}}</strong>！您的付款已成功。",
    apiKeyLabel: "您的 API 金鑰",
    apiKeyHint: "請妥善保管。使用方式：<code>Authorization: Bearer &lt;key&gt;</code>",
    readDocs: "閱讀文件",
    backHome: "返回首頁",
    needHelp: "需要幫助？請聯絡 support@sbal.example.com"
  },

  // 等待頁面
  pending: {
    title: "付款處理中",
    message: "您的付款正在處理中，確認後即可取得 API 金鑰。",
    closeHint: "您可以關閉此頁面，稍後再回來。",
    backToHome: "返回首頁"
  },
  finalizing: {
    title: "正在最終設定",
    message: "付款成功！我們正在為您生成安全的 API 金鑰，通常只需幾秒鐘。",
    waitHint: "請稍候或刷新頁面。",
    refresh: "刷新頁面"
  },

  // 語言切換
  language: "語言"
};
