import axios from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';
import { getCSRFToken } from '@/server/utils/csrf';
import { useRouter } from 'vue-router';

// 获取运行时配置
function getBaseURL(): string {
  try {
    const config = useRuntimeConfig();
    return config.public.backendApiUrl || 'http://47.100.19.119/';
  } catch {
    return 'http://47.100.19.119/';
  }
}

// 创建 Axios 实例
const instance = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  withCredentials: true, // 确保 Cookie 被发送
});

// 请求拦截器：移除 Token header，使用 Cookie
instance.interceptors.request.use(
  (config) => {
    const csrfToken = getCSRFToken();

    // 不再添加 Authorization header，使用 Cookie 认证
    // if (authStore.token) {
    //   config.headers['Authorization'] = `Bearer ${authStore.token}`;
    // }

    // 保留 CSRF token（如果需要）
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }

    // 确保 Cookie 被发送
    config.withCredentials = true;

    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：处理 401 错误（未授权）
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const router = useRouter();
    const authStore = useAuthStore();

    if (response && response.status === 401 && !config.__isRetryRequest) {
      config.__isRetryRequest = true;

      // 401 错误：Cookie 无效或过期，清除用户信息并跳转到登录页
      authStore.clearUserInfo();
      router.push({ path: '/login' });
    }

    return Promise.reject(error);
  }
);

// 将 axios 实例提供给 Nuxt 应用
export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.provide('axios', instance);
});
