<template>
    <main>
    <div class="wrapper_main">
      <div class="main">
        <nav class="navbar navbar-expand-md navbar-light landing-navbar main_header no-drag" style="background-color:#ffffff;">
          <div class="container">
            <a class="index-sidebar-brand-main d-flex align-items-center justify-content-center" href="/">
              <div class="NHNKCP_logo">
              <img src="/img/NHNKCP_logo.svg" style="height: 20px;">
              </div>
              <div class="developers-main">developers</div>
            </a>
            <ul class="navbar-nav ms-auto">
              <li class="nav-item d-none d-md-inline-block">
                <a class="nav-link text-lg px-lg-3 header_a_1 click" href="https://developer.kcp.co.kr/page/document/standardPay" >연동하기</a>
              </li>
              <li class="nav-item d-none d-md-inline-block">
                <a class="nav-link text-lg px-lg-3 header_a_2 click" href="https://developer.kcp.co.kr/page/demo" >체험하기</a>
              </li>
              <li class="nav-item d-none d-md-inline-block">
                <a class="nav-link text-lg px-lg-3 header_a_3 click" href="https://developer.kcp.co.kr/page/form" >기술지원</a>
              </li>
              <li class="nav-item d-none d-md-inline-block">
                <a class="nav-link active text-lg px-lg-3 header_a_4 click" href="/KcpSendBox" >샌드박스</a>
              </li>
            </ul>
          </div>
        </nav>

  <div class="layout">
    <!-- PC 모드: 사이드바 표시 -->
    <nav class="sidebar" v-if="!isMobile">
      <ul>
        <li
          v-for="file in files"
          :key="file"
          :class="{ selected: selectedFile === file }"
          @click="handleFileClick(file)"
        >
          {{ file }}
        </li>
      </ul>
    </nav>

    <!-- 메인 컨테이너: 왼쪽 네비게이션, 에디터+터미널, 라이브 프리뷰 -->
    <div class="editor-container">
      <!-- 왼쪽: 코드 에디터 + 터미널 -->
      <div class="editor-pane" v-show="!isMobile">
        <div class="code-editor" ref="editorContainer"></div>
        <div class="terminal-pane">
          <div class="terminal-title">Output</div>
          <pre class="terminal-output">{{ formattedOutput }}</pre>
        </div>
      </div>

      <!-- 오른쪽: 라이브 프리뷰 영역 -->
      <div
        class="live-ui"
        ref="livePreview"
        contenteditable="true"
        :class="{ 'full-mobile': isMobile }"
      >
        <!-- 실제 HTML 콘텐츠만 바꿀 영역 분리 -->
        <div ref="previewContent"></div>
      </div>
    </div>
  </div>
  </div>
</div>
  </main>
</template>

<script>
import loader from '@monaco-editor/loader'
import beautify from 'js-beautify'
import './mainPage.css'

export default {
  name: 'KcpHtmlLiveEditor',

  data() {
    return {
      files: [
        'orderPage.html',
        'orderPage.js',
        'successPage.html',
        'failPage.html',
        'server.js'
      ],
      selectedFile: 'orderPage.html',
      htmlCode: '',
      jsCode: '',
      editorInstance: null,
      monacoGlobal: null,
      resizeTimeout: null,
      skipRender: false,
      windowWidth: 0,
      mobileBreakpoint: 768,
      eventPayload: null
    }
  },

  computed: {
    isMobile() {
      return this.windowWidth > 0 && this.windowWidth < this.mobileBreakpoint
    },
    formattedOutput() {
      if (this.eventPayload) {
        return this.eventPayload
      }
      const query = this.$route.query || {}
      return query.action
        ? JSON.stringify(query, null, 2)
        : '...waiting for response'
    }
  },

  mounted() {
    this.onResize()
    window.addEventListener('resize', this.onResize)
    window.addEventListener('message', this.handleMessage)

    // 초기 쿼리 처리
    const query = this.$route.query
    let initialFile = this.selectedFile
    let initialResult = null
    if (query && query.res_cd === '0000') {
      initialFile = 'successPage.html'
      initialResult = query
    } else if (
      query &&
      ((query.res_cd && query.res_cd !== '0000') ||
        (query.Code && query.Code !== '0000'))
    ) {
      initialFile = 'failPage.html'
      initialResult = query
    }

    this.selectFile(initialFile, true, initialResult)
    this.setupEditor()
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.onResize)
    window.removeEventListener('message', this.handleMessage)
  },

  methods: {
    getResponseUrl(action) {
      switch (action) {
        case 'register':
          return 'https://stg-spl.kcp.co.kr/std/tradeReg/register'
        case 'paymentWindow':
          return 'https://testsmpay.kcp.co.kr/'
        case 'approve':
          return 'https://stg-spl.kcp.co.kr/gw/enc/v1/payment'
        default:
          return ''
      }
    },

    handleMessage(event) {
      if (event.data?.type === 'kcp-result') {
        const action = event.data.payload.action
        const apiUrl = this.getResponseUrl(action)
        const payloadObj =
          typeof event.data.payload === 'string'
            ? JSON.parse(event.data.payload)
            : event.data.payload
        this.eventPayload = apiUrl + '\n' + JSON.stringify(payloadObj, null, 2)
      }
    },

    handleFileClick(file) {
      this.selectedFile = file
      this.$router.replace({ path: this.$route.path })
      this.selectFile(file, true, null)
    },

    onResize() {
      this.windowWidth = window.innerWidth
      if (this.editorInstance) {
        clearTimeout(this.resizeTimeout)
        this.resizeTimeout = setTimeout(() => {
          this.editorInstance.layout()
        }, 200)
      }
    },

    ensureCssLoaded() {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = '/css/style.css'
      document.head.appendChild(link)
    },

    async fetchFile(path) {
      try {
        const res = await fetch(path)
        if (!res.ok) throw new Error(`파일 로드 실패: ${path}`)
        return await res.text()
      } catch {
        return ''
      }
    },

    applyResultToHtml(html, result) {
      let updated = html
      if (result?.ordr_no) {
        updated = updated.replace(
          /(<[^>]+id=['"]orderNo['"][^>]*>)([\s\S]*?)(<\/[^>]+>)/i,
          `$1${result.ordr_no}$3`
        )
      }
      if (result?.good_name) {
        updated = updated.replace(
          /(<[^>]+id=['"]goodName['"][^>]*>)([\s\S]*?)(<\/[^>]+>)/i,
          `$1${result.good_name}$3`
        )
      }
      if (result?.amount) {
        const amt = result.amount + '원'
        updated = updated.replace(
          /(<[^>]+id=['"]amount['"][^>]*>)([\s\S]*?)(<\/[^>]+>)/i,
          `$1${amt}$3`
        )
      }
      return updated
    },

    async selectFile(file, initialLoad, result) {
      this.selectedFile = file
      const base = file.replace(/\.(html|js)$/i, '')
      let html = await this.fetchFile(`/html/${base}.html`)
      const js = await this.fetchFile(`/js/${base}.js`)
      if (initialLoad && result) html = this.applyResultToHtml(html, result)
      this.htmlCode = html
      this.jsCode = js
      if (this.editorInstance && this.monacoGlobal) {
        const isJs = file.endsWith('.js')
        const newModel = this.monacoGlobal.editor.createModel(
          isJs ? js : html,
          isJs ? 'javascript' : 'html'
        )
        const oldModel = this.editorInstance.getModel()
        this.editorInstance.setModel(newModel)
        oldModel.dispose()
        this.editorInstance.updateOptions({ readOnly: isJs })
      }
      this.renderPreview(initialLoad)
    },


    /** 라이브 프리뷰에 HTML/JS 삽입 */
    renderPreview(forceInit) {
      this.ensureCssLoaded()
      const container = this.$refs.previewContent
      if (!container) return
      if (forceInit) container.innerHTML = this.htmlCode
      this.$nextTick(() => {
        if (this.jsCode.trim()) {
          const inlineScript = document.createElement('script')
          inlineScript.text = this.jsCode
          container.appendChild(inlineScript)
        }
        [
          'https://testspay.kcp.co.kr/plugin/kcp_spay_hub.js',
          'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js'
        ].forEach(src => {
          const extScript = document.createElement('script')
          extScript.src = src
          container.appendChild(extScript)
        })
      })
    },

      /**
     * Monaco 에디터 초기화 + previewContent에 이벤트 바인딩
     */
    setupEditor() {
      loader.config({
        paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' }
      })
      loader.init().then(monaco => {
        this.monacoGlobal = monaco
        this.editorInstance = monaco.editor.create(
          this.$refs.editorContainer,
          {
            value: this.htmlCode,
            language: 'html',
            theme: 'vs-dark',
            minimap: { enabled: false },
            wordWrap: 'on',
            fontSize: 14
          }
        )

        // 에디터 내용이 바뀌면 preview도 갱신
        this.editorInstance.onDidChangeModelContent(() => {
          if (this.skipRender) {
            this.skipRender = false
            return
          }
          this.htmlCode = this.editorInstance.getValue()
          this.updateLivePreview()
        })

        // previewContent 안의 input/textarea/select 변화를 catch
        const previewEl = this.$refs.previewContent
        ;['input','change','blur'].forEach(evt =>
          previewEl.addEventListener(evt, this.syncPreviewToCode)
        )
      })
    },

    /**
     * htmlCode가 바뀌면 previewContent에 innerHTML을 덮어쓰고
     * jsCode도 재삽입합니다.
     */
    updateLivePreview() {
      this.ensureCssLoaded()
      const container = this.$refs.previewContent
      if (!container) return

      // htmlCode로 preview 갱신
      container.innerHTML = this.htmlCode

      // jsCode 스크립트 재삽입
      if (this.jsCode.trim()) {
        const inline = document.createElement('script')
        inline.text = this.jsCode
        container.appendChild(inline)
      }
      // 외부 스크립트도 동일하게 재삽입
      [
        'https://testspay.kcp.co.kr/plugin/kcp_spay_hub.js',
        'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js'
      ].forEach(src => {
        const s = document.createElement('script')
        s.src = src
        container.appendChild(s)
      })
    },

    /**
     * preview에서 폼(input/textarea/select) 이 바뀌면
     * htmlCode에 동기화하고 에디터에 setValue 합니다.
     */
    syncPreviewToCode() {
      // 다음 편집기 변경 시 preview 재렌더링을 스킵하게 설정
      this.skipRender = true;
    
      // 기존 HTML 문자열을 가져와 수정본을 만들 준비
      let updatedHtml = this.htmlCode;
    
      // previewContent 내부의 form 요소를 모두 순회하며 value/innerHTML 갱신
      const container = this.$refs.previewContent;
      container.querySelectorAll('input, textarea, select').forEach(el => {
        const name = el.name || el.id;
        if (!name) return;
      
        if (el.tagName === 'INPUT') {
          const safeValue = el.value.replace(/"/g, '&quot;');
          const regex = new RegExp(
            `(<input[^>]*?\\b(?:name|id)=[\"']${name}[\"'][^>]*?)\\bvalue=[\"'][^\"']*[\"']?`,
            'i'
          );
          updatedHtml = updatedHtml.replace(regex, `$1 value="${safeValue}"`);
        
        } else if (el.tagName === 'TEXTAREA') {
          const escaped = el.value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const regex = new RegExp(
            `(<textarea[^>]*?\\b(?:name|id)=[\"']${name}[\"'][^>]*?>)[\\s\\S]*?(</textarea>)`,
            'i'
          );
          updatedHtml = updatedHtml.replace(regex, `$1${escaped}$2`);
        
        } else if (el.tagName === 'SELECT') {
          const optionsHtml = Array.from(el.options)
            .map(opt => {
              const attrs = Array.from(opt.attributes)
                .filter(a => a.name !== 'selected')
                .map(a => `${a.name}="${a.value}"`)
                .join(' ');
              const sel = opt.selected ? ' selected' : '';
              return `<option ${attrs}${sel}>${opt.text}</option>`;
            })
            .join('');
          const regex = new RegExp(
            `(<select[^>]*?\\b(?:name|id)=[\"']${name}[\"'][^>]*?>)[\\s\\S]*?(</select>)`,
            'i'
          );
          updatedHtml = updatedHtml.replace(regex, `$1${optionsHtml}$2`);
        }
      });
    
      // 데이터 모델 및 Monaco 에디터에 반영
      this.htmlCode = updatedHtml;
      const prettyHtml = beautify.html(updatedHtml, {
        indent_size: 2,
        preserve_newlines: true,
        max_preserve_newlines: 1,
        wrap_line_length: 120
      });
      this.editorInstance.setValue(prettyHtml);
    }
  }
}
</script>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
}
.sidebar {
  width: 200px;
  border-right: 1px solid #ddd;
  overflow-y: auto;
}
.editor-container {
  flex: 1;
  display: flex;
}
.editor-pane {
  width: 50%;
  display: flex;
  flex-direction: column;
}
.code-editor {
  flex: 1;
  border-bottom: 1px solid #ddd;
}
.terminal-pane {
  height: 150px;
  overflow: auto;
  background: #1e1e1e;
  color: #eee;
  padding: 8px;
}
.terminal-title {
  font-weight: bold;
  color: #fff;
}
.terminal-output {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}
.live-ui {
  flex: 1;
  position: relative;
  overflow: hidden;
}
.full-mobile {
  width: 100% !important;
  height: 100% !important;
  border: none;
  padding: 8px;
}
.preview-content {
  width: 100%;
  height: 100%;
  overflow: auto;
}
</style>
