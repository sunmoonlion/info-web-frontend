import type { AuthState } from '~/types/auth/authapi';

// 用户信息接口（改造后，不再使用 Token）
interface UserInfo {
  userName: string | null;
  userId: string | null;
  email?: string | null;
  full_name?: string | null;
  is_active?: boolean;
  is_superuser?: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): UserInfo => ({
    userName: null,
    userId: null,
    email: null,
    full_name: null,
    is_active: false,
    is_superuser: false,
  }),

  getters: {
    loggedIn: (state) => state.userId !== null && state.userId !== '',
    isAdmin: (state) => state.is_superuser === true && state.is_active === true,
  },

  actions: {
    // 设置用户信息（改造后，不再存储 Token）
    setUserInfo(data: Partial<UserInfo>) {
      if (data.userName !== undefined) this.userName = data.userName;
      if (data.userId !== undefined) this.userId = data.userId;
      if (data.email !== undefined) this.email = data.email;
      if (data.full_name !== undefined) this.full_name = data.full_name;
      if (data.is_active !== undefined) this.is_active = data.is_active;
      if (data.is_superuser !== undefined) this.is_superuser = data.is_superuser;
    },

    // 清除用户信息（改造后，不再清除 Token）
    clearUserInfo() {
      this.userName = null;
      this.userId = null;
      this.email = null;
      this.full_name = null;
      this.is_active = false;
      this.is_superuser = false;
    },

    // 兼容旧接口（保留，但不再使用 Token）
    setTokens(data: AuthState) {
      // 只保存用户信息，不保存 Token
      this.setUserInfo({
        userName: data.userName,
        userId: data.userId,
      });
    },

    clearTokens() {
      this.clearUserInfo();
    },
  }
});
