<template>
  <div class="wrapper_main">
    <nav class="navbar navbar-expand-md navbar-light landing-navbar main_header no-drag" style="background-color:#ffffff;">
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
    </nav>


    <div class="layout">
      <!-- 좌측 파일 네비게이션 -->
      <nav class="sidebar">
        <ul class="file-list">
          <li
            v-for="file in files"
            :key="file"
            :class="['file-item', { selected: file === selectedFile }]"
            @click="handleFileClick(file)"
          >
            {{ file }}
          </li>
        </ul>
      </nav>
      
      <!-- 우측 에디터 + 미리보기 + 출력창 영역 -->
      <div class="main">
        <!-- 에디터 + 출력창을 세로로 배치 -->
        <div class="editor-pane">
          <!-- 코드 에디터 -->
          <div ref="editorContainer" class="editor-container"></div>
          <!-- 출력창: 드래그로 크기 조절 가능, 최소 타이틀만 보이도록 -->
          <div class="output-pane">
            <div class="output-header">API 응답값</div>
            <div class="output-content">
              <pre>{{ outputData }}</pre>
            </div>
          </div>
        </div>
      
        <!-- 프리뷰 영역 -->
        <div class="preview-pane">
          <div ref="preview" class="preview-container"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import loader from '@monaco-editor/loader'
import beautify from 'js-beautify'
import './mainPage.css'

export default {
  name: 'LiveEditor',
  data() {
    return {
      files: [
        'orderpage.html',
        'orderpage.js',
        'successPage.html',
        'failPage.html',
        'paymentApi.js'
      ],
      filesState: {},        // 파일명 → 코드/콘텐츠
      selectedFile: '',       // 에디터에 표시할 파일
      currentHtml: '',        // 프리뷰에 렌더할 HTML 파일
      responseParams: {},
      outputData: '... waiting for response',
      fileMap: {'orderpage.js':   'orderpage.html' },
      isOutputVisible: true    // 출력창 표시 여부
    }
  },
  created() {
    // 기본 파일
    const firstHtml = this.files.find(f => f.endsWith('.html'))
    this.selectedFile = firstHtml
    this.currentHtml  = firstHtml
  },
  mounted() {
    const socket = this.$nuxtSocket({ name: 'main' })
    socket.on('connect', () => console.log('클라이언트 연결됨'))
    socket.on('registerResult', payload => {
      this.setOutPut(payload)
      if(payload.Code !== "0000") {
        this.responseProcess(payload)
        this.selectFile(this.currentHtml)
      }
    })

    // 3) 세션 상태 복원
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('liveEditor.filesState')
      if (saved) {
        try { this.filesState = JSON.parse(saved) }
        catch (e) { console.error('sessionStorage 복원 오류:', e) }
      }

      const search = window.location.search;
      if (search) {
        const params = {};
        const sp = new URLSearchParams(search);
        sp.forEach((value, key) => { params[key] = value; });
        this.setOutPut(params)
        this.responseProcess(params);
      }
    }

    // 4) Monaco 에디터 초기화
    loader.init().then(async monaco => {
      this.monaco = monaco
      await this.loadDependent(this.selectedFile)

      this.editor = monaco.editor.create(this.$refs.editorContainer, {
        model: this.createModel(this.selectedFile),
        automaticLayout: true,
        theme: 'vs-dark'
      })

      // 5) 에디터 변경 시
      this.editor.onDidChangeModelContent(async () => {
        const content = this.editor.getValue()
        Vue.set(this.filesState, this.selectedFile, content)

        // JS → HTML 매핑
        if (this.selectedFile.endsWith('.js')) {
          const mapped = this.fileMap[this.selectedFile]
          if (mapped) {
            this.currentHtml = mapped
            await this.loadFile(mapped)
          }
        } else {
          this.currentHtml = this.selectedFile
        }

        this.updatePreview()
      })

      // 6) 상태 저장 감시
      this.$watch('filesState', val => {
        if (typeof window !== 'undefined') {
          try { sessionStorage.setItem('liveEditor.filesState', JSON.stringify(val)) }
          catch (e) { console.error('sessionStorage 저장 오류:', e) }
        }
      }, { deep: true })

      // 7) 초기 프리뷰 렌더
      this.updatePreview()
    })
  },
  methods: {
    handleFileClick(file) {
      this.$router.replace({ path: this.$route.path })
      this.selectFile(file)
    },
    responseProcess(param) {
      this.responseParams = param
      const { res_cd, Code } = param;
      const codeVal = res_cd ?? Code;

      if (codeVal !== undefined) {
        this.selectedFile = codeVal === '0000'
          ? 'successPage.html'
          : 'failPage.html';
        this.currentHtml = this.selectedFile
      }
    },
    setOutPut(param) {
      const requestUrl = param.requestUrl
      delete param.requestUrl;
      this.outputData = 'url: ' + requestUrl + '\n' + 'body: ' +JSON.stringify(param, null, 2)
    },
    getPath(file) {
      return file.endsWith('.html') ? `/html/${file}` : `/js/${file}`
    },
    // 실제 파일을 fetch 후 저장
    async loadFile(file) {
      if (!(file in this.filesState)) {
        const res  = await fetch(this.getPath(file))
        if (!res.ok) throw new Error('Failed to load ${file}: ${res.status}')
        const text = await res.text()
        Vue.set(this.filesState, file, text)
      }
    },
    async loadDependent(file) {
      // HTML 먼저
      await this.loadFile(file)

      // HTML에 매핑된 JS도 모두 await
      if (file.endsWith('.html')) {
        const jsFiles = Object
          .keys(this.fileMap)
          .filter(js => this.fileMap[js] === file)

        await Promise.all(jsFiles.map(js => this.loadFile(js)))
      }

      // 에디터 모델 갱신
      if (this.editor) {
        this.editor.setModel(this.createModel(file))
      }
    },
    createModel(file) {
        const mode = file.endsWith('.html') ? 'html' : 'javascript'
        const uri  = this.monaco.Uri.parse(`inmemory://model/${file}`)
        let model = this.monaco.editor.getModel(uri)
        if (model) {
          // 이미 만들어진 모델이 있으면, 최신 코드로 덮어쓰기
          model.setValue(this.filesState[file] || '')
        } else {
          // 새 모델 생성
          model = this.monaco.editor.createModel(
            this.filesState[file] || '', mode, uri
          )
        }
        return model
    },
    async selectFile(file) {
      this.selectedFile = file

      // 1) HTML 또는 JS 파일 + 매핑된 파일 전부 로드
      await this.loadDependent(file)

      // 2) 클릭 시 매핑 로직: HTML이면 그대로, JS면 매핑된 HTML로
      if (file.endsWith('.html')) {
        this.currentHtml = file
      } else {
        // fileMap 에 정의된 경우만 매핑
        const mapped = this.fileMap[file]
        this.currentHtml = mapped || this.currentHtml
      }

      // 3) 프리뷰 갱신
      this.updatePreview()
    },
  async updatePreview() {
    // 1) HTML 문자열 파싱
    const htmlSource = this.filesState[this.currentHtml] || ''
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlSource, 'text/html')

    // 2) URL 파라미터와 id 매핑
    Object.entries(this.responseParams).forEach(([key, val]) => {
      let el = doc.getElementById(key)
      if(key === 'Message' || key === 'res_msg') {
        el = doc.getElementById('message')
      }
      if (!el) return
      if ('value' in el) el.value = val
      else el.textContent = val
    })

    // 파싱된 문서의 head 내부 <meta>, <link>, <style> 클론해 삽입
    doc.head
      .querySelectorAll('meta, link[rel="stylesheet"], style')
      .forEach(node => {
        const clone = node.cloneNode(true)
        clone.setAttribute('data-preview-head', '')
        document.head.appendChild(clone)
      })
    // ————————————————————————————————

    // 3) 문서 전체 문자열 재조합(beautify 용)
    let updatedHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
    if (typeof beautify !== 'undefined' && beautify.html) {
      updatedHtml = beautify.html(updatedHtml, {
        indent_size: 2,
        preserve_newlines: true,
        max_preserve_newlines: 1,
        wrap_line_length: 0
      })
    }

    // 4) Monaco 모델 동기화
    if (updatedHtml !== this.filesState[this.currentHtml]) {
      Vue.set(this.filesState, this.currentHtml, updatedHtml)
      if (this.selectedFile === this.currentHtml && this.editor) {
        const model = this.editor.getModel()
        if (model && model.getValue() !== updatedHtml) {
          model.setValue(updatedHtml)
        }
      }
    }

    // 5) body 내용 렌더링
    const container = this.$refs.preview
    container.innerHTML = doc.body.innerHTML

    // 6) 매핑된 JS 코드 실행
    Object.keys(this.fileMap)
      .filter(jsFile => this.fileMap[jsFile] === this.currentHtml)
      .forEach(jsFile => {
        // 이전 스크립트 제거
        Array.from(container.querySelectorAll(`script[data-js="${jsFile}"]`))
          .forEach(el => el.remove())

        // 코드 Blob 생성 & 로드
        const code = this.filesState[jsFile] || ''
        const blob = new Blob([code], { type: 'application/javascript' })
        const url = URL.createObjectURL(blob)
        const script = document.createElement('script')
        script.src = url
        script.async = false
        script.dataset.js = jsFile
        script.onload = () => URL.revokeObjectURL(url)
        container.appendChild(script)
      })

    // 7) 외부 스크립트(head에도 삽입)
    if (this.currentHtml === 'orderpage.html') {
      const ext = document.createElement('script')
      ext.src = 'https://testspay.kcp.co.kr/plugin/kcp_spay_hub.js'
      ext.async = true
      ext.setAttribute('data-preview-head', '')
      document.head.appendChild(ext)
    }
  }
  }
}
</script>