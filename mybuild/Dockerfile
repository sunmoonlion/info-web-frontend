# ============================================================================
# 重要说明：本地环境 vs Docker 构建环境
# ============================================================================

# 关键问题：如果本地环境和 Docker 环境不一致，会导致构建失败！
# 解决方案：
# 1. 使用精确的 Node.js 版本（node:20.18.0 而不是 node:20）
# 2. 使用 .nvmrc 锁定本地 Node.js 版本
# 3. 在 Docker 中生成 lock 文件（最佳实践）
# 4. 定期检查版本是否一致
#
# 因此，Dockerfile 必须：
# 1. 显式安装所有系统依赖（不能假设已存在）
# 2. 显式配置所有环境变量（不能依赖本地环境）
# 3. 使用精确的 Node.js 版本（确保与本地一致）
# 4. 确保所有构建步骤在 Docker 环境中可重复执行
# ============================================================================

# 使用精确的 Node.js 版本，确保本地和 Docker 环境一致
# 本地环境：v20.18.0（由 app/.nvmrc 文件指定）
# Docker 环境：node:20.18.0（与本地版本保持一致）
# 
# 使用方式：
# - 本地开发时：在项目目录运行 `nvm use` 切换到 Node.js 20.18.0
# - Docker 构建时：使用 FROM node:20.18.0，确保版本一致
# 
# 注意：使用 node:20 会拉取最新版本（如 20.19.6），可能导致不一致
FROM node:20.18.0 AS build

# ============================================================================
# 代理配置（可选，仅在国内网络环境需要）
# ============================================================================
# 如果在国外主机构建，通常不需要代理配置
# 如果需要代理，可以通过 --build-arg 传递：
#   docker build --build-arg HTTP_PROXY=http://proxy.example.com:8080 \
#                --build-arg HTTPS_PROXY=http://proxy.example.com:8080 \
#                -f mybuild/Dockerfile -t investment-app-ssr:1.0.0 .
# ============================================================================
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG http_proxy
ARG https_proxy
ARG NO_PROXY
ARG no_proxy

# 设置代理环境变量（仅在传递了代理参数时生效）
ENV HTTP_PROXY=${HTTP_PROXY} \
    HTTPS_PROXY=${HTTPS_PROXY} \
    http_proxy=${http_proxy} \
    https_proxy=${https_proxy} \
    NO_PROXY=${NO_PROXY} \
    no_proxy=${no_proxy}

# 安装 sharp 所需的系统依赖（libvips 等）
# node:20 基于 Debian，需要安装这些依赖以确保 sharp 能正常编译
# 注意：即使本地已有这些库，Docker 镜像中也需要显式安装
# 使用官方源（适合国外主机）
RUN apt-get update && \
    apt-get install -y --no-install-recommends --fix-missing \
    libvips-dev \
    libglib2.0-dev \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 安装 pnpm（使用 corepack，Node.js 20+ 内置支持）
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# 设置环境变量
# 注意：不强制从源码编译 sharp，使用预编译二进制更可靠
ENV NODE_ENV=development \
    APP_ENV=development \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000 \
    NUXT_TELEMETRY_DISABLED=1

# ============================================================================
# 构建上下文说明
# ============================================================================
# 构建上下文：项目根目录（investment-app-ssr/）
# Dockerfile 位置：mybuild/Dockerfile
# 构建命令：docker build -f mybuild/Dockerfile -t investment-app-ssr:1.0.0 .
#
# 重要说明：
# - Docker 的 COPY 指令只能访问构建上下文内的文件
# - 不能使用 ../ 访问构建上下文之外的文件
# - 因为构建上下文是项目根目录，所以可以直接使用 app/ 访问源代码
# ============================================================================

# 复制源代码（包括 package.json 和 pnpm-lock.yaml）
# 注意：构建上下文是项目根目录，所以直接使用 app/（不能使用 ../app/）
# COPY 路径必须相对于构建上下文，不能超出构建上下文范围
COPY app/ /frontend
WORKDIR /frontend
# 先安装依赖
# 如果 lock 文件与 package.json 不匹配，先更新 lock 文件
# 重要：在安装依赖时显式设置环境变量，确保 sharp 从源码编译
RUN rm -rf node_modules 2>/dev/null || true
# 先尝试使用 frozen-lockfile，如果失败则更新 lock 文件
# 使用预编译的 sharp 二进制文件（更可靠）
RUN pnpm install --frozen-lockfile || \
    pnpm install
# 构建应用
RUN pnpm build
EXPOSE 3000

FROM build AS run-dev
CMD ["pnpm", "dev"]

FROM build AS run-start
ENV NODE_ENV=production APP_ENV=production
ENTRYPOINT ["pnpm"]
CMD ["start"]

# 使用精确的 Node.js 版本，确保与 build 阶段一致
FROM node:20.18.0-alpine AS run-minimal

# ============================================================================
# 代理配置（可选，与 build 阶段相同）
# ============================================================================
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG http_proxy
ARG https_proxy
ARG NO_PROXY
ARG no_proxy

# 设置代理环境变量（用于 apk、npm/pnpm 等）
ENV HTTP_PROXY=${HTTP_PROXY} \
    HTTPS_PROXY=${HTTPS_PROXY} \
    http_proxy=${http_proxy} \
    https_proxy=${https_proxy} \
    NO_PROXY=${NO_PROXY} \
    no_proxy=${no_proxy}
# ============================================================================
# 重要说明：Alpine Linux 环境差异与 Sharp 依赖
# ============================================================================
# Alpine Linux 与 Debian（build 阶段）不同：
# - 使用 musl libc 而不是 glibc（可能导致原生模块兼容性问题）
# - 包管理器是 apk 而不是 apt
# - 包名不同（vips 而不是 libvips-dev）
# - 体积更小，适合生产环境
#
# Sharp 图像处理库依赖：
# - Build 阶段（Debian）：需要 libvips-dev（开发版本，包含头文件）用于编译
# - Run 阶段（Alpine）：只需要 vips（运行时版本，体积更小）
# - 注意：如果 Nuxt 的 .output 已包含所有运行时依赖（standalone 模式），
#   可能不需要额外安装 vips，但为了确保兼容性，建议保留
# ============================================================================
RUN apk add --no-cache \
    vips \
    && (npm install -g yarn@1.22.22 --force || yarn --version || true)
ENV NODE_ENV=production APP_ENV=production NITRO_HOST=0.0.0.0 NITRO_PORT=3000 NUXT_TELEMETRY_DISABLED=1
WORKDIR /frontend
# 只复制构建输出（.output 目录包含所有构建产物和运行时依赖）
# Nuxt 的生产构建已经包含了所有必要的运行时依赖
COPY --from=build /frontend/.output ./.output
# 直接使用 node 运行，不需要 pnpm
ENTRYPOINT [ "node" ]
CMD [ ".output/server/index.mjs" ]

