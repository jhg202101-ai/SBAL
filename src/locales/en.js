// English translations
export default {
  // Navbar
  nav: {
    home: "Home",
    docs: "Documentation",
    admin: "Admin"
  },

  // Hero
  hero: {
    title: "Stripe Billing Abstraction Layer",
    subtitle: "The simplest way to integrate Stripe subscriptions into your SaaS.",
    viewGitHub: "View on GitHub",
    readDocs: "Read the Docs"
  },

  // Features
  features: {
    title: "Why SBAL?",
    efficiency: {
      title: "Skill-Driven Efficiency",
      desc: "Our architecture uses Skill patterns to reduce development time by 10x. Ship faster with proven templates."
    },
    cost: {
      title: "Cost-Effective",
      desc: "Running on Cloudflare Workers with smart caching means minimal infrastructure cost. Pass savings to you."
    },
    production: {
      title: "Production Ready",
      desc: "Built for scale: rate limiting, webhook verification, and D1 persistence out of the box."
    }
  },

  // Pricing
  pricing: {
    title: "Simple, Transparent Pricing",
    subtitle: "Choose the plan that fits your business. All plans include full API access.",
    getStarted: "Get Started",
    contactSales: "Contact Sales",
    popular: "Popular",
    base: {
      name: "Base",
      price: "$99",
      period: "/mo",
      features: [
        "Up to 1,000 subscriptions",
        "Core API access",
        "Community support"
      ]
    },
    growth: {
      name: "Growth",
      price: "$299",
      period: "/mo",
      features: [
        "Up to 5,000 subscriptions",
        "Advanced analytics",
        "Priority support"
      ]
    },
    enterprise: {
      name: "Enterprise",
      price: "$999",
      period: "/mo",
      features: [
        "Unlimited subscriptions",
        "Custom integrations",
        "24/7 phone support"
      ]
    }
  },

  // Footer
  footer: "© {{year}} SBAL by OpenClaw. All rights reserved.",

  // Checkout Modal
  modal: {
    title: "Complete your subscription",
    emailLabel: "Email Address",
    emailPlaceholder: "you@example.com",
    submit: "Continue to Payment",
    cancel: "Cancel",
    processing: "Processing...",
    success: "✅ Click the link to complete payment:",
    copy: "Copy"
  },

  // Success Page
  success: {
    title: "Subscription Activated!",
    welcome: "Welcome to SBAL, <strong>{{email}}</strong>! Your payment was successful.",
    apiKeyLabel: "Your API Key",
    apiKeyHint: "Keep this secret. Include it as: <code>Authorization: Bearer &lt;key&gt;</code>",
    readDocs: "Read Documentation",
    backHome: "Back to Home",
    needHelp: "Need help? Contact support@sbal.example.com"
  },

  // Pending Pages
  pending: {
    title: "Payment in Progress",
    message: "Your payment is being processed. API key will be available once payment is confirmed.",
    closeHint: "You can close this page and return later.",
    backToHome: "Back to Home"
  },
  finalizing: {
    title: "Finalizing Setup",
    message: "Your payment was successful! We're generating your secure API key. This usually takes a few seconds.",
    waitHint: "Please wait or refresh this page in a moment.",
    refresh: "Refresh"
  },

  // Language Switcher
  language: "Language"
};
