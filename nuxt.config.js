// nuxt.config.js
import bodyParser from 'body-parser'

export default {
  router: {
    extendRoutes(routes, resolve) {
      // 루트 경로('/')를 /KcpHtmlLiveEditor로 리다이렉트
      routes.push(
        {
          name: 'Home',
          path: '/',
          redirect: '/Home'
        },
        {
          name: 'KcpHtmlLiveEditorPC',
          path: '/pc',
          redirect: '/KcpHtmlLiveEditorPC'
        },
        {
          name: 'KcpHtmlLiveEditorMobile',
          path: '/mobile',
          redirect: '/KcpHtmlLiveEditorMobile'
        }
      )
    }
  },

  // 1) Express REST API를 serverMiddleware로 붙이기
  serverMiddleware: [
    { path: '/api', handler: '~/api/index.js' },
    // { path: '/KcpHtmlLiveEditorMobile', handler: '~/server-middleware/render-kcp.js' }
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