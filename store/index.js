// store/index.js
export const state = () => ({
  connected: false,
  messages: []
})

export const mutations = {
  SET_CONNECTED(state, status) {
    state.connected = status
  },
  ADD_MESSAGE(state, message) {
    state.messages.push(message)
  },
  CLEAR_MESSAGES(state) {
    state.messages = []
  }
}

export const actions = {
  // nuxt-socket-io가 socket 이벤트를 감지해 자동 호출
  nuxtSocketIo_connect({ commit }) {
    commit('SET_CONNECTED', true)
  },
  nuxtSocketIo_disconnect({ commit }) {
    commit('SET_CONNECTED', false)
  },
  nuxtSocketIo_message({ commit }, payload) {
    commit('ADD_MESSAGE', payload)
  },

  // 컴포넌트에서 직접 호출할 수 있는 예시 액션
  sendMessage({ state }, message) {
    const socket = this.app.$nuxtSocket({ name: 'main' })
    socket.emit('message', { room: 'chat-1', data: message })
  }
}

export const getters = {
  isConnected: state => state.connected,
  allMessages: state => state.messages,
  messageCount: state => state.messages.length
}
