<template>
  <div class="layout">
    <nav class="sidebar">
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
      <div class="code-editor" ref="editorContainer"></div>
      <div class="live-ui" ref="livePreview" contenteditable="true"></div>
    </div>
  </div>
</template>

<script>
import loader from '@monaco-editor/loader'
import beautify from 'js-beautify'

export default {
  name: 'KcpHtmlLiveEditor',

  data() {
    return {
      files: ['orderMobile.html', 'orderMobile.js','register.html', 'register.js', 'returnPage.html', 'returnPage.js'],
      selectedFile: 'orderMobile.html',
      htmlCode: '',
      jsCode: '',
      editorInstance: null,
      monacoGlobal: null,
      resizeTimeout: null,
      skipRender: false
    }
  },

  mounted() {
    window.addEventListener('message', this.handleMessage)
    const query = this.$route.query
    if(query && query.PayUrl) {
      alert(query.PayUrl)
    }

    this.selectFile(this.selectedFile, true) // 최초 로딩만 전체 렌더링
    this.setupEditor()
  },

  beforeDestroy() {
    window.removeEventListener('message', this.handleMessage)
    window.removeEventListener('resize', this.handleResize)
  },

  methods: {
    handleMessage(event) {
      if (event.data?.type === 'kcp-result') {
        const result = event.data.payload
        alert(result.PayUrl)
        this.selectFile('returnPage.html', true, result)
      }
    },

    ensureCssLoaded() {
      if (!document.getElementById('kcp-style')) {
        const link = document.createElement('link')
        link.id   = 'kcp-style'
        link.rel  = 'stylesheet'
        link.href = '/css/style.css'
        document.head.appendChild(link)
      }
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

    async selectFile(file, initialLoad = false, result) {
      this.selectedFile = file
      const base = file.replace(/\.(html|js)$/i, '')

      this.htmlCode = await this.fetchFile(`/html/${base}.html`)
      this.jsCode   = await this.fetchFile(`/js/${base}.js`)

      if (this.editorInstance && this.monacoGlobal) {
        const isJs     = file.endsWith('.js')
        const language = isJs ? 'javascript' : 'html'
        const code     = isJs ? this.jsCode : this.htmlCode
      
        const oldModel = this.editorInstance.getModel()
        const newModel = this.monacoGlobal.editor.createModel(code, language)
        this.editorInstance.setModel(newModel)
        if (oldModel) oldModel.dispose()
        this.editorInstance.updateOptions({ readOnly: isJs })
      }
    
      this.renderPreview(initialLoad, result) // ← 무조건 호출
    },

    setupEditor() {
      loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } })
      loader.init().then(monaco => {
        this.monacoGlobal = monaco
        this.editorInstance = monaco.editor.create(this.$refs.editorContainer, {
          value: this.htmlCode,
          language: 'html',
          theme: 'vs-dark',
          minimap: { enabled: false },
          wordWrap: 'on',
          fontSize: 14,
          readOnly: false
        })

        this.editorInstance.onDidChangeModelContent(() => {
          if (this.skipRender) {
            this.skipRender = false
            return
          }
          this.htmlCode = this.editorInstance.getValue()
          this.updateLivePreview()
        })

        const live = this.$refs.livePreview
        live.addEventListener('input',  this.syncPreviewToCode)
        live.addEventListener('change', this.syncPreviewToCode)
        live.addEventListener('blur',   this.syncPreviewToCode)
        window.addEventListener('resize', this.handleResize)
      })
    },

    renderPreview(forceInit = false, result) {
      this.ensureCssLoaded()
      const el = this.$refs.livePreview
      if (!el) return

      if (forceInit) {
        el.innerHTML = this.htmlCode
      }

      this.$nextTick(() => {
        if (this.selectedFile === 'returnPage.html' && result?.PayUrl) {
          const ta = el.querySelector('textarea[name="req"]')
          if (ta) {
            ta.value = result.PayUrl
            this.syncPreviewToCode()
          }
        }

        if (this.jsCode.trim()) {
          const inline = document.createElement('script')
          inline.type = 'text/javascript'
          inline.text = this.jsCode
          el.appendChild(inline)
        }

        const ext = document.createElement('script')
        ext.src = 'https://testspay.kcp.co.kr/plugin/kcp_spay_hub.js'
        el.appendChild(ext)

        const axiosScript = document.createElement('script')
        axiosScript.src = 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js'
        el.appendChild(axiosScript)
      })
    },

    updateLivePreview() {
      const el = this.$refs.livePreview
      if (!el) return

      const parser = new DOMParser()
      const doc = parser.parseFromString(this.htmlCode, 'text/html')
      const newBody = doc.body

      el.querySelectorAll('input, textarea, select').forEach(oldEl => {
        const name = oldEl.name || oldEl.id
        if (!name) return

        const newEl = newBody.querySelector(`[name="${name}"], [id="${name}"]`)
        if (!newEl) return

        if (oldEl.tagName === 'INPUT' || oldEl.tagName === 'TEXTAREA') {
          oldEl.value = newEl.value
        }
        if (oldEl.tagName === 'SELECT') {
          oldEl.innerHTML = newEl.innerHTML
          oldEl.value = newEl.value
        }
      })
    },

    syncPreviewToCode() {
      const el = this.$refs.livePreview
      if (!el || !this.editorInstance) return

      let updatedHtml = this.htmlCode

      el.querySelectorAll('input, textarea, select').forEach(domEl => {
        const name = domEl.name || domEl.id
        if (!name) return

        if (domEl.tagName.toLowerCase() === 'input') {
          const safeValue = domEl.value.replace(/"/g, '&quot;')
          const pattern = new RegExp(`(<input[^>]*?\\b(?:name|id)=["']${name}["'][^>]*?)\\bvalue=["'][^"']*["']?`, 'i')
          updatedHtml = updatedHtml.replace(pattern, `$1 value="${safeValue}"`)
        }
        if (domEl.tagName.toLowerCase() === 'textarea') {
          const escaped = domEl.value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
          const pattern = new RegExp(`(<textarea[^>]*?\\b(?:name|id)=["']${name}["'][^>]*?>)[\\s\\S]*?(</textarea>)`, 'i')
          updatedHtml = updatedHtml.replace(pattern, `$1${escaped}$2`)
        }
        if (domEl.tagName.toLowerCase() === 'select') {
          const options = Array.from(domEl.options)
            .map(opt =>
              `<option value="${opt.value}"${opt.selected ? ' selected' : ''}>${opt.text}</option>`
            ).join('')
          const pattern = new RegExp(`(<select[^>]*?\\b(?:name|id)=["']${name}["'][^>]*?>)[\\s\\S]*?(</select>)`, 'i')
          updatedHtml = updatedHtml.replace(pattern, `$1${options}$2`)
        }
      })

      this.skipRender = true
      const model = this.editorInstance.getModel()
      this.editorInstance.pushUndoStop()
      this.editorInstance.executeEdits('sync', [{
        range: model.getFullModelRange(),
        text: beautify.html(updatedHtml, {
          indent_size: 2,
          preserve_newlines: true,
          max_preserve_newlines: 1,
          wrap_line_length: 120
        }),
        forceMoveMarkers: true
      }])
      this.editorInstance.pushUndoStop()
    },

    handleResize() {
      clearTimeout(this.resizeTimeout)
      this.resizeTimeout = setTimeout(() => {
        if (this.editorInstance) {
          this.editorInstance.layout()
        }
      }, 200)
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
  background: #f5f5f5;
  border-right: 1px solid #ccc;
}
.sidebar ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.sidebar li {
  padding: 1rem;
  cursor: pointer;
  transition: 0.2s;
}
.sidebar li:hover {
  background: #ddd;
}
.sidebar li.selected {
  background: #333;
  color: #fff;
  font-weight: bold;
}
.editor-container {
  display: flex;
  flex: 1;
  gap: 1rem;
  height: 100vh;
}
.live-ui {
  flex: 1;
  border: 1px solid #ccc;
  overflow: auto;
  min-width: 0;
}
.code-editor {
  flex: 1;
  min-width: 200px;
  min-height: 200px;
}
</style>
