<template>
  <div class="layout">
    <!-- PC 모드일 때만 사이드바 표시 -->
    <nav class="sidebar" v-if="!isMobile">
      <ul>
        <li
          v-for="file in files"
          :key="file"
          :class="{ selected: selectedFile === file }"
          @click="selectFile(file, true)"
        >
          {{ file }}
        </li>
      </ul>
    </nav>

    <div class="editor-container">
      <!-- PC 모드일 때만 코드 에디터 표시 -->
      <div class="code-editor" ref="editorContainer" v-if="!isMobile"></div>
      <!-- 라이브 프리뷰: 모바일 모드에서 전체 화면 -->
      <div
        class="live-ui"
        ref="livePreview"
        contenteditable="true"
        :class="{ 'full-mobile': isMobile }"
      ></div>
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
        'server.js',
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
    }
  },

  computed: {
    isMobile() {
      return this.windowWidth > 0 && this.windowWidth < this.mobileBreakpoint
    },
  },

  mounted() {
    // 화면 크기 초기화 및 리스너 등록
    this.onResize()
    window.addEventListener('resize', this.onResize)

    // URL 쿼리 처리 및 초기 파일 로드
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
      if (result.ordr_no) {
        updated = updated.replace(
          /(<[^>]+id=['"]orderNo['"][^>]*>)([\s\S]*?)(<\/[^>]+>)/i,
          `$1${result.ordr_no}$3`
        )
      }
      if (result.good_name) {
        updated = updated.replace(
          /(<[^>]+id=['"]goodName['"][^>]*>)([\s\S]*?)(<\/[^>]+>)/i,
          `$1${result.good_name}$3`
        )
      }
      if (result.amount) {
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

      // 쿼리 결과가 있으면 HTML 코드에 반영
      if (initialLoad && result) {
        html = this.applyResultToHtml(html, result)
      }

      this.htmlCode = html
      this.jsCode = js

      if (this.editorInstance && this.monacoGlobal) {
        const isJs = file.endsWith('.js')
        const language = isJs ? 'javascript' : 'html'
        const code = isJs ? this.jsCode : this.htmlCode

        const oldModel = this.editorInstance.getModel()
        const newModel = this.monacoGlobal.editor.createModel(
          code,
          language
        )
        this.editorInstance.setModel(newModel)
        if (oldModel) oldModel.dispose()
        this.editorInstance.updateOptions({ readOnly: isJs })
      }
      this.renderPreview(initialLoad, result)
    },

    setupEditor() {
      loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } })
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
            fontSize: 14,
            readOnly: false,
          }
        )
        // 에디터 변경 시 Live Preview 업데이트
        this.editorInstance.onDidChangeModelContent(() => {
          if (this.skipRender) {
            this.skipRender = false
            return
          }
          this.htmlCode = this.editorInstance.getValue()
          this.updateLivePreview()
        })
        // Live Preview 변경 시 코드로 동기화
        const liveEl = this.$refs.livePreview
        liveEl.addEventListener('input', this.syncPreviewToCode)
        liveEl.addEventListener('change', this.syncPreviewToCode)
        liveEl.addEventListener('blur', this.syncPreviewToCode)
      })
    },

    renderPreview(forceInit, result) {
      this.ensureCssLoaded()
      const livePreviewElement = this.$refs.livePreview
      if (!livePreviewElement) return

      if (forceInit) {
        livePreviewElement.innerHTML = this.htmlCode
      }
      this.$nextTick(() => {
        if (this.jsCode.trim()) {
          const inline = document.createElement('script')
          inline.text = this.jsCode
          livePreviewElement.appendChild(inline)
        }
        const ext = document.createElement('script')
        ext.src = 'https://testspay.kcp.co.kr/plugin/kcp_spay_hub.js'
        livePreviewElement.appendChild(ext)
        const axiosScript = document.createElement('script')
        axiosScript.src = 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js'
        livePreviewElement.appendChild(axiosScript)
      })
    },

    updateLivePreview() {
      const liveEl = this.$refs.livePreview
      if (!liveEl) return
      const parser = new DOMParser()
      const doc = parser.parseFromString(this.htmlCode, 'text/html')
      const newBody = doc.body
      liveEl.querySelectorAll('input, textarea, select').forEach(oldEl => {
        const name = oldEl.name || oldEl.id
        if (!name) return
        const newEl = newBody.querySelector(`[name=\"${name}\"], [id=\"${name}\"]`)
        if (!newEl) return
        if (oldEl.tagName === 'INPUT' || oldEl.tagName === 'TEXTAREA') oldEl.value = newEl.value
        if (oldEl.tagName === 'SELECT') { oldEl.innerHTML = newEl.innerHTML; oldEl.value = newEl.value }
      })
    },

    syncPreviewToCode() {
      const liveEl = this.$refs.livePreview
      if (!liveEl || !this.editorInstance) return
      let updatedHtml = this.htmlCode
      liveEl.querySelectorAll('input, textarea, select').forEach(el => {
        const name = el.name || el.id
        if (!name) return
        if (el.tagName.toLowerCase() === 'input') {
          const safe = el.value.replace(/"/g, '&quot;')
          const pat = new RegExp(`(<input[^>]*?\\b(?:name|id)=["']${name}["'][^>]*?)\\bvalue=["'][^"']*["']?`, 'i')
          updatedHtml = updatedHtml.replace(pat, `$1 value="${safe}"`)
        }
        if (el.tagName.toLowerCase() === 'textarea') {
          const esc = el.value.replace(/</g,'&lt;').replace(/>/g,'&gt;')
          const pat = new RegExp(`(<textarea[^>]*?\\b(?:name|id)=["']${name}["'][^>]*?>)[\\s\\S]*?(</textarea>)`, 'i')
          updatedHtml = updatedHtml.replace(pat, `$1${esc}$2`)
        }
        if (el.tagName.toLowerCase() === 'select') {
          const opts = Array.from(el.options).map(opt => {
            const attrs = Array.from(opt.attributes).map(a => a.name==='selected'?'':`${a.name}="${a.value}"`).join(' ')
            const sel = opt.selected?' selected':''
            return `<option ${attrs}${sel}>${opt.text}</option>`
          }).join('')
          const pat = new RegExp(`(<select[^>]*?\\b(?:name|id)=["']${name}["'][^>]*?>)[\\s\\S]*?(</select>)`, 'i')
          updatedHtml = updatedHtml.replace(pat, `$1${opts}$2`)
        }
      })
      this.skipRender = true
      const model = this.editorInstance.getModel()
      this.editorInstance.pushUndoStop()
      this.editorInstance.executeEdits('sync', [{ range: model.getFullModelRange(), text: beautify.html(updatedHtml, { indent_size:2, preserve_newlines:true, max_preserve_newlines:1, wrap_line_length:120 }), forceMoveMarkers:true }])
      this.editorInstance.pushUndoStop()
    }
  }
}
</script>