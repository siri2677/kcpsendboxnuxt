<template>
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
        <div class="code-editor" ref="editorContainer">
        </div>
        <div class="terminal-pane">
          <div class="terminal-title">Output</div>
          <pre class="terminal-output">{{ formattedOutput }}</pre>
        </div>
      </div>

      <!-- 오른쪽: 라이브 미리보기 -->
      <div
        class="live-ui"
        ref="livePreview"
        contenteditable="true"
        :class="{ 'full-mobile': isMobile }"
      >
      </div>
    </div>
  </div>
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
      mobileBreakpoint: 768
    }
  },

  computed: {
    isMobile() {
      return (
        this.windowWidth > 0 &&
        this.windowWidth < this.mobileBreakpoint
      )
    },

    formattedOutput() {
      const query = this.$route.query || 'Waiting for response..'
      if(query) {
        return query
      } else {
        return JSON.stringify(query, null, 2)
      }
    }
  },

  mounted() {
    this.onResize()
    window.addEventListener('resize', this.onResize)

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
  },

  methods: {
    // 네비게이션 클릭 시 메인 주소로 라우팅하고 파일 로드
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

      if (initialLoad && result) {
        html = this.applyResultToHtml(html, result)
      }

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

      this.renderPreview(initialLoad, result)
    },

    setupEditor() {
      loader.config({
        paths: {
          vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs'
        }
      })
      loader.init().then((monaco) => {
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
        this.editorInstance.onDidChangeModelContent(() => {
          if (this.skipRender) {
            this.skipRender = false
            return
          }
          this.htmlCode = this.editorInstance.getValue()
          this.updateLivePreview()
        })
        const liveEl = this.$refs.livePreview
        ['input', 'change', 'blur'].forEach((evt) =>
          liveEl.addEventListener(evt, this.syncPreviewToCode)
        )
      })
    },

    renderPreview(forceInit, result) {
      this.ensureCssLoaded()
      const liveEl = this.$refs.livePreview
      if (!liveEl) return
      if (forceInit) liveEl.innerHTML = this.htmlCode
      this.$nextTick(() => {
        if (this.jsCode.trim()) {
          const inline = document.createElement('script')
          inline.text = this.jsCode
          liveEl.appendChild(inline)
        }
        [
          'https://testspay.kcp.co.kr/plugin/kcp_spay_hub.js',
          'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js'
        ].forEach((src) => {
          const s = document.createElement('script')
          s.src = src
          liveEl.appendChild(s)
        })
      })
    },

    updateLivePreview() {
      const liveEl = this.$refs.livePreview
      if (!liveEl) return
      const doc = new DOMParser().parseFromString(
        this.htmlCode,
        'text/html'
      )
      liveEl.querySelectorAll('input,textarea,select').forEach((oldEl) => {
        const name = oldEl.name || oldEl.id
        const newEl = doc.body.querySelector(`[name="${name}"],[id="${name}"]`)
        if (!newEl) return
        if (/INPUT|TEXTAREA/.test(oldEl.tagName)) {
          oldEl.value = newEl.value
        } else if (oldEl.tagName === 'SELECT') {
          oldEl.innerHTML = newEl.innerHTML
          oldEl.value = newEl.value
        }
      })
    },

    syncPreviewToCode() {
      const liveEl = this.$refs.livePreview
      if (!liveEl || !this.editorInstance) return
      let updatedHtml = this.htmlCode
      liveEl.querySelectorAll('input,textarea,select').forEach((el) => {
        const name = el.name || el.id
        const tag = el.tagName.toLowerCase()
        if (tag === 'input') {
          const safe = el.value.replace(/"/g, '&quot;')
          updatedHtml = updatedHtml.replace(
            new RegExp(
              `(<input[^>]*?\\b(?:name|id)=["']${name}["'][^>]*?)\\bvalue=["'][^"']*["']?`,
              'i'
            ),
            `$1 value="${safe}"`
          )
        } else if (tag === 'textarea') {
          const esc = el.value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
          updatedHtml = updatedHtml.replace(
            new RegExp(
              `(<textarea[^>]*?\\b(?:name|id)=["']${name}["'][^>]*?>)[\\s\\S]*?(</textarea>)`,
              'i'
            ),
            `$1${esc}$2`
          )
        } else if (tag === 'select') {
          const opts = Array.from(el.options).map((opt) =>
            `<option${opt.selected ? ' selected' : ''}>${opt.text}</option>`
          ).join('')
          updatedHtml = updatedHtml.replace(
            new RegExp(
              `(<select[^>]*?\\b(?:name|id)=["']${name}["'][^>]*?>)[\\s\\S]*?(</select>)`,
              'i'
            ),
            `$1${opts}$2`
          )
        }
      })
      this.skipRender = true
      const model = this.editorInstance.getModel()
      this.editorInstance.pushUndoStop()
      this.editorInstance.executeEdits('sync', [
        {
          range: model.getFullModelRange(),
          text: beautify.html(updatedHtml, {
            indent_size: 2,
            preserve_newlines: true,
            max_preserve_newlines: 1,
            wrap_line_length: 120
          }),
          forceMoveMarkers: true
        }
      ])
      this.editorInstance.pushUndoStop()
    }
  }
}
</script>