// 预览的配置：这个应用是谁、用哪几个端口、预览里别的应用在哪。
export const previewConfig = {
  app: 'info',
  port: 3110,
  nextPort: 3111,
  apps: {
    info: 'http://localhost:3110',
    knowledge: 'http://localhost:3120',
    investment: 'http://localhost:3100',
  },
  // info 会带人去 knowledge（看数据集）
  targets: ['knowledge'],
  // investment、knowledge 会把人带到申请页。预览里 investment 登记了回跳地址
  sources: {
    investment: { return_url: 'http://localhost:3100/zh-CN/workbench?ref={ref}' },
    knowledge: { return_url: 'http://localhost:3120/zh-CN/catalog' },
  },
  // 刚打开预览时用哪个情景
  defaultScenario: 'full',
}
