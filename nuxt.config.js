// nuxt.config.js
export default {
  router: {
    extendRoutes(routes, resolve) {
      // 루트 경로('/')를 /KcpHtmlLiveEditor로 리다이렉트
      routes.push(
        {
          name: 'KcpSendBox',
          path: '/',
          redirect: '/KcpSendBox'
        }
      )
    }
  },

  // 1) Express REST API를 serverMiddleware로 붙이기
  serverMiddleware: [
    { path: '/api', handler: '~/public/api/server.js' }
  ],

  // 2) Axios 모듈 등록
  modules: [
    '@nuxtjs/axios'
  ]
}