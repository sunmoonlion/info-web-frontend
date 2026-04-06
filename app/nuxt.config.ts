// import zhCN from 'element-plus/dist/locale/zh-cn.mjs'
// import en from 'element-plus/dist/locale/en.mjs'

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  runtimeConfig: {
    // 私有配置（仅在服务器端可用）
    backendApiUrl: process.env.BACKEND_API_URL || 'http://47.100.19.119',
    authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3030',
    // 公共配置（客户端和服务器端都可用）
    public: {
      // 后端 API 地址
      backendApiUrl: process.env.BACKEND_API_URL || 'http://47.100.19.119',
      // 认证服务 URL（用于 Cookie 认证）
      authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3030',
      // Backend URL（用于 SSR 中间件，指向 investment-web-backend）
      // 开发环境：http://localhost:8000（FastAPI 默认端口）
      // 生产环境：http://investment-web-backend:8000（K8s 服务名称）
      backendUrl: process.env.VUE_APP_BACKEND_URL || process.env.INVESTMENT_BACKEND_URL || 'http://localhost:8000',
      // API 版本号（可选，默认为 v1）
      apiVersion: process.env.VUE_APP_API_VERSION || 'v1',
      // Session Cookie 名称（必须与 auth-app-backend 一致）
      sessionCookieName: process.env.SESSION_COOKIE_NAME || 'sunmoonai_session',
    }
  },
  devtools: { enabled: true },
  modules: [
    '@nuxt/content', 
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@unocss/nuxt',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
    '@nuxt/icon',
    '@nuxt/eslint',
    '@element-plus/nuxt',
  ],
  icon: {
    serverBundle: {
      collections: ['uil', 'mdi']
    },
    customCollections: [
      {
        prefix: 'my-icon',
        dir: './assets/icons/svg',
      },
    ],
  },
  pwa: {   
    manifest: {
      name: 'Vite App',
      short_name: 'Vite App',
      theme_color: '#ffffff',
      icons: [
        {
          src: '/192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    },
    registerType: 'autoUpdate',
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.*']
    },
    devOptions: {
      enabled: false,
      suppressWarnings: true,
      navigateFallbackAllowlist: [/^\/$/],
      type: 'module'
    }
  },
  css: [
    '@unocss/reset/tailwind.css',
    
  ],
  elementPlus: { /** Options */ }
})
