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
import './mainPage.css'

export default {
  name: 'KcpHtmlLiveEditor',

  data() {
    return {
      files: ['orderPage.html', 'orderPage.js', 'successPage.html', 'failPage.html'],
      selectedFile: 'orderPage.html',
      htmlCode: '',
      jsCode: '',
      editorInstance: null,
      monacoGlobal: null,
      resizeTimeout: null,
      skipRender: false
    }
  },

  mounted() {
    const query = this.$route.query
    if(query && query.res_cd === "0000") {
      this.selectFile('successPage.html', true, query)
    } else if (query && ((query.res_cd && query.res_cd !== "0000") || query.Code && query.Code !== "0000")) {
      this.selectFile('failPage.html', true, query)
    } else {
      this.selectFile(this.selectedFile, true)
    }
    this.setupEditor()
  },

  methods: {
    ensureCssLoaded() {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = '/css/style.css'
        document.head.appendChild(link)
    },
    

    async fetchFile(path) {
      try {
        const reseponseFetchFile = await fetch(path)
        if (!reseponseFetchFile.ok) throw new Error(`파일 로드 실패: ${path}`)
        return await reseponseFetchFile.text()
      } catch {
        return ''
      }
    },

    async selectFile(file, initialLoad, result) {
      this.selectedFile = file
      const base = file.replace(/\.(html|js)$/i, '')

      this.htmlCode = await this.fetchFile(`/html/${base}.html`)
      this.jsCode   = await this.fetchFile(`/js/${base}.js`)

      if (this.editorInstance && this.monacoGlobal) {
        const isJs = file.endsWith('.js')
        const language = isJs ? 'javascript' : 'html'
        const code = isJs ? this.jsCode : this.htmlCode
      
        const oldModel = this.editorInstance.getModel()
        const newModel = this.monacoGlobal.editor.createModel(code, language)
        this.editorInstance.setModel(newModel)
        if (oldModel) oldModel.dispose()
        this.editorInstance.updateOptions({ readOnly: isJs })
      }
    
      this.renderPreview(initialLoad, result)
    },

    // 왼쪽 코드 편집기 설정
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

        const livePreviewElement = this.$refs.livePreview
        livePreviewElement.addEventListener('input',  this.syncPreviewToCode)
        livePreviewElement.addEventListener('change', this.syncPreviewToCode)
        livePreviewElement.addEventListener('blur',   this.syncPreviewToCode)
        window.addEventListener('resize', this.handleResize)
      })
    },

    renderPreview(forceInit, result) {
      this.ensureCssLoaded()
      const livePreviewElement = this.$refs.livePreview
      if (!livePreviewElement) return

      if (forceInit) {
        livePreviewElement.innerHTML = this.htmlCode
      }

      // 새로운 페이지에 대한 설정 진행
      this.$nextTick(() => {
        if (this.selectedFile === 'successPage.html' && result) {
          livePreviewElement.querySelector('#orderNo').textContent = result.ordr_no
          livePreviewElement.querySelector('#goodName').textContent = result.good_name
          livePreviewElement.querySelector('#amount').textContent = result.amount + "원"
          this.syncPreviewToCode()
        }

        if (this.jsCode.trim()) {
          const inline = document.createElement('script')
          inline.type = 'text/javascript'
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
      const livePreviewElement = this.$refs.livePreview
      if (!livePreviewElement) return

      const parser = new DOMParser()
      const doc = parser.parseFromString(this.htmlCode, 'text/html')
      const newBody = doc.body

      livePreviewElement.querySelectorAll('input, textarea, select').forEach(oldElement => {
        const name = oldElement.name || oldElement.id
        if (!name) return

        const newElement = newBody.querySelector(`[name="${name}"], [id="${name}"]`)
        if (!newElement) return

        if (oldElement.tagName === 'INPUT' || oldElement.tagName === 'TEXTAREA') {
          oldElement.value = newElement.value
        }
        if (oldElement.tagName === 'SELECT') {
          oldElement.innerHTML = newElement.innerHTML
          oldElement.value = newElement.value
        }
      })
    },

    syncPreviewToCode() {
      const livePreviewElement = this.$refs.livePreview
      if (!livePreviewElement || !this.editorInstance) return

      let updatedHtml = this.htmlCode

      livePreviewElement.querySelectorAll('input, textarea, select').forEach(element => {
        const name = element.name || element.id
        if (!name) return

        if (element.tagName.toLowerCase() === 'input') {
          const safeValue = element.value.replace(/"/g, '&quot;')
          const pattern = new RegExp(`(<input[^>]*?\\b(?:name|id)=["']${name}["'][^>]*?)\\bvalue=["'][^"']*["']?`, 'i')
          updatedHtml = updatedHtml.replace(pattern, `$1 value="${safeValue}"`)
        }
        if (element.tagName.toLowerCase() === 'textarea') {
          const escaped = element.value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
          const pattern = new RegExp(`(<textarea[^>]*?\\b(?:name|id)=["']${name}["'][^>]*?>)[\\s\\S]*?(</textarea>)`, 'i')
          updatedHtml = updatedHtml.replace(pattern, `$1${escaped}$2`)
        }
        if (element.tagName.toLowerCase() === 'select') {
          const options = Array.from(element.options)
            .map(opt => {
              const attrs = Array.from(opt.attributes)
                .map(attr => {
                  if (attr.name === 'selected') return '';
                  return `${attr.name}="${attr.value}"`;
                }).join(' ');
              
              const selected = opt.selected ? ' selected' : '';
              return `<option ${attrs}${selected ? ' ' + selected : ''}>${opt.text}</option>`;
            })
            .join('');
          
          const pattern = new RegExp(`(<select[^>]*?\\b(?:name|id)=["']${name}["'][^>]*?>)[\\s\\S]*?(</select>)`, 'i');
          updatedHtml = updatedHtml.replace(pattern, `$1${options}$2`);
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