<template>
    <div class="home">
      <div class="box" @click="goTo('pc')">
        PC 에디터
      </div>
      <div class="box" @click="goTo('mobile')">
        Mobile 에디터
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: 'Home',
    methods: {
      goTo(mode) {
        const routeName = mode === 'pc'
          ? 'KcpHtmlLiveEditorPC'
          : 'KcpHtmlLiveEditorMobile'
        this.$router.push({ name: routeName })
      }
    }
  }
  </script>
  
  <style scoped>
  .home {
    display: flex;
    gap: 2rem;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background: #f0f0f0;
  }
  .box {
    width: 200px;
    height: 200px;
    background: #fff;
    border: 2px solid #ccc;
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.2s, background 0.2s;
  }
  .box:hover {
    background: #e8e8e8;
    transform: scale(1.05);
  }
  </style>