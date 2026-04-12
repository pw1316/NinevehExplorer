<script setup>
import { usePageStore } from "./stores/pageStore.js"
const pageStore = usePageStore()
</script>

<template>
  <!-- 头部 -->
  <div class="header">
    <div class="inner">
      <ul class="ml64 inavdark">
        <li v-for="(value, key) in pageStore.pages" :key="key" @click="pageStore.setFirstIndex(key)"
          :class="{ current: pageStore.curFirstIdx === key }">
          <a href="javascript:void(0)">{{ value.name }}</a>
        </li>
      </ul>
    </div>
  </div>

  <!-- 中间部分 -->
  <div class="inner mt40">
    <!-- 正文 -->
    <div class="main">
      <div class="box">
        <component :is="pageStore.curComponent"></component>
      </div>
    </div>

    <!-- 侧边栏 -->
    <div class="side">
      <div class="hd3">{{ pageStore.curFirstName }}</div>
      <ul class="darklist pd10 inavdark">
        <li v-for="(content, key) in pageStore.curFirstChildren" :key="key" @click="pageStore.setSecondIndex(key)"
          :class="{ current: pageStore.curSecondIdx === key }">
          <a href="javascript:void(0)">{{ content.name }}</a>
        </li>
      </ul>
    </div>
  </div>
</template>
