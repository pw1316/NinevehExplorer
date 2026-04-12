<script setup>
import { ref, reactive } from "vue";
import DefaultComponent from "./components/Default.vue"

const pages = reactive([
  {
    name: "一级标题1",
    secondary: [
      { name: "二级标题1-1", component: DefaultComponent },
      { name: "二级标题1-1", component: DefaultComponent },
    ]
  },
  {
    name: "一级标题2",
    secondary: [
      { name: "二级标题2-1", component: DefaultComponent },
      { name: "二级标题2-1", component: DefaultComponent },
    ]
  },
]);

const curFirstIdx = ref(0);
const curSecondIdx = ref(0);
</script>

<template>
  <!-- 头部 -->
  <div class="header">
    <div class="inner">
      <ul class="ml64 inavdark">
        <li v-for="(value, key) in pages" :key="key" @click="curFirstIdx = key; curSecondIdx = 0"
          :class="{ current: curFirstIdx === key }">
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
        <component :is="pages[curFirstIdx].secondary[curSecondIdx].component"></component>
      </div>
    </div>

    <!-- 侧边栏 -->
    <div class="side">
      <div class="hd3">{{ pages[curFirstIdx].name }}</div>
      <ul class="darklist pd10 inavdark">
        <li v-for="(content, key) in pages[curFirstIdx].secondary" :key="key" @click="curSecondIdx = key"
          :class="{ current: curSecondIdx === key }">
          <a href="javascript:void(0)">{{ content.name }}</a>
        </li>
      </ul>
    </div>
  </div>
</template>
