export default {
  router: {
    extendRoutes(routes, resolve) {
      routes.push({
        name: 'KcpSendBox',
        path: '/',
        redirect: '/KcpSendBox'
      })
    }
  },

  // ✅ Express API 등록
  serverMiddleware: [
    { path: '/api', handler: '~/public/api/paymentApi.js' }
  ],

  // ✅ 모듈 등록
  modules: [
    '@nuxtjs/axios',
    'nuxt-socket-io'
  ],

  // ✅ 소켓 서버 설정
  io: {
    vuex: { actions: [], mutations: [] },
    sockets: [
      {
        name: 'main',
        url: 'http://localhost:3000', // 현재 사용 중인 Express 포트와 동일하게
        vuex: { actions: [], mutations: [] }, 
        default: true
      }
    ]
  }
}