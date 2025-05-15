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
    { path: '/api', handler: '~/public/api/server.js' },
  ],

  // 2) Axios 모듈 등록
  modules: [
    '@nuxtjs/axios'
  ],

  // 3) Axios 전역 설정
  axios: {
    // 기본 호출 경로: /api/* → serverMiddleware가 처리
    baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api',
    timeout: 10000,
    headers: {
      common: {
        Accept: 'application/json'
      }
    }
  },

  // 4) 환경변수 설정 (dotenv 모듈 사용 시)
  publicRuntimeConfig: {
    axios: {
      browserBaseURL: process.env.BROWSER_API_BASE || '/api'
    }
  },
  privateRuntimeConfig: {
    axios: {
      baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api'
    }
  }
}