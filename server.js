const express      = require('express')
const session      = require('express-session')
const http         = require('http')
const { loadNuxt, build } = require('nuxt')
const socketIO     = require('socket.io')
const paymentApi   = require('./public/api/paymentApi') // Router만 내보내도록 바꿀 것

async function start() {
  const isDev = process.env.NODE_ENV !== 'production'
  const nuxt  = await loadNuxt(isDev ? 'dev' : 'start')
  if (isDev) await build(nuxt)

  // 1) 진짜 메인 앱 생성
  const app    = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // ① 세션 미들웨어 (앱 최상단)
  app.use(session({
    secret: 'kcpsendboxSessionKey',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600_000 }
  }))

  // 2) HTTP 서버 + Socket.IO
  const server = http.createServer(app)
  const io     = socketIO(server, { cors: { origin: '*' } })

  // 3) io를 앱에 주입
  app.set('io', io)  
  // → req.app.get('io') 로 꺼내 쓸 수 있습니다.

  // (선택) 미들웨어로 req.io에도 주입
  app.use((req, _, next) => {
    req.io = io
    next()
  })

  // 4) paymentApi 라우터 마운트
  app.use('/api', paymentApi)

  // 5) Nuxt 렌더러    
  app.use(nuxt.render)

  // 6) 서버 시작
  const PORT = process.env.PORT || 3000
  server.listen(PORT, () => {
    console.log(`🚀 Server ready on http://localhost:${PORT}`)
  })

  // 7) Socket.IO 연결 로직
  io.on('connection', socket => {
    console.log('🟢 Socket connected:', socket.id)
  })
}

start()