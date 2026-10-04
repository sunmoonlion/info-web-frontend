// info 网页端各页的地址（PRD/apps/info.md 第五节）。页面与功能都从这里取，不自己拼。
function at(locale: string, ...parts: string[]) {
  return `/${[locale, ...parts].map(encodeURIComponent).join('/')}`
}

export const routes = {
  requests: (locale: string) => at(locale, 'requests'),
  request: (locale: string, id: string) => at(locale, 'requests', id),
  // 申请入库。可带代码；从别的应用来的 from、ref 原样带着
  newRequest: (
    locale: string,
    query: { code?: string; from?: string | null; ref?: string | null } = {},
  ) => {
    const search = new URLSearchParams()
    if (query.code) search.set('code', query.code)
    if (query.from) search.set('from', query.from)
    if (query.ref) search.set('ref', query.ref)
    const text = search.toString()
    return `${at(locale, 'requests', 'new')}${text ? `?${text}` : ''}`
  },
}
