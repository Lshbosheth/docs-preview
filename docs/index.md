---
layout: home
---

<script setup>
import { useData } from "vitepress";

const { theme } = useData();
const home = theme.value.home;
</script>

<div class="home">

<section class="home-hero">

<p class="home-eyebrow">Personal documentation workspace</p>

<h1 class="home-title">写下来的东西，<br /><em>才留得住</em></h1>

<p class="home-lede">学习计划、技术英语、AI Agent 每日一课、项目设计和系统记录，都收在这里。页面保持轻和清楚，方便随时回头翻。</p>

<div class="home-cta">
  <a class="home-btn home-btn--primary" :href="home.latestAiAgent">今天的 AI Agent 每日一课</a>
  <a class="home-btn" :href="home.latestEnglish">打开每日英语</a>
</div>

<dl class="home-stats">
  <div class="home-stat" v-for="stat in home.stats" :key="stat.label">
    <dt>{{ stat.label }}</dt>
    <dd>{{ stat.value }}</dd>
  </div>
</dl>

</section>

<section class="home-block">
<div class="home-block-head">
<div>
<p class="home-eyebrow">Daily</p>
<h2>每天都在长的两条线</h2>
<p class="home-block-lede">早上自动生成，晚上回来补笔记。断更也不删，留着看节奏。</p>
</div>
</div>

<a v-if="home.today" class="home-feature" :href="home.today.link">
  <span class="home-feature-tag">{{ home.today.label }} · {{ home.today.date }}</span>
  <strong>{{ home.today.title }}</strong>
  <span class="home-feature-go">继续读</span>
</a>

<div class="home-lists">
  <div class="home-list">
    <div class="home-list-head">
      <h3>AI Agent 近期</h3>
      <a href="/ai-agent/">全部</a>
    </div>
    <ul>
      <li v-for="item in home.aiAgentRecent" :key="item.link">
        <a :href="item.link"><span class="home-list-date">{{ item.date }}</span><span>{{ item.title }}</span></a>
      </li>
    </ul>
  </div>

  <div class="home-list">
    <div class="home-list-head">
      <h3>每日英语近期</h3>
      <a :href="home.latestEnglish">最新</a>
    </div>
    <ul>
      <li v-for="item in home.englishRecent" :key="item.link">
        <a :href="item.link"><span class="home-list-date">{{ item.date }}</span><span>{{ item.title }}</span></a>
      </li>
    </ul>
  </div>
</div>
</section>

<section class="home-block">
<div class="home-block-head">
<div>
<p class="home-eyebrow">Learning</p>
<h2>四门课，一条线</h2>
<p class="home-block-lede">项目驱动，文档当字典查。每天一个小功能，不求一次学完。</p>
</div>
<a class="home-more" href="/study/react-lowcode-series-plan">看总规划</a>
</div>

<ol class="home-rail">
  <li v-for="course in home.courses" :key="course.link">
    <a :href="course.link">
      <span class="home-rail-index">{{ course.index }}</span>
      <span class="home-rail-body">
        <strong>{{ course.text }}</strong>
        <span>{{ course.note }}</span>
      </span>
      <span class="home-rail-days">{{ course.days }} 天</span>
    </a>
  </li>
</ol>

<div class="home-inline">
  <span>相关：</span>
  <a href="/study/python-agent-learning-plan">Python × AI Agent 15 天</a>
  <a href="/study/react-learning-roadmap">React 学习路线</a>
  <a href="/study/react-skill-gaps-plan">查漏补缺清单</a>
  <a href="/study/go-learning-plan">Go 启动计划</a>
</div>
</section>

<section class="home-block">
<div class="home-block-head">
<div>
<p class="home-eyebrow">Systems</p>
<h2>项目与系统</h2>
<p class="home-block-lede">微信入口、个人上下文、长期记忆检索。主线设计和历史决策都留在这里。</p>
</div>
</div>

<div class="home-split">
  <a class="home-panel" href="/personal-context-layer/">
    <span class="home-panel-tag">当前主线</span>
    <strong>Personal Context Layer</strong>
    <span class="home-panel-note">微信入口、个人上下文、Agent Handoff 的定位与实施路线。包含 MVP 范围、权限策略和信息披露边界。</span>
    <span class="home-feature-go">进入</span>
  </a>

  <div class="home-stack">
    <a class="home-card" href="/memory/zvec-memory-plan">
      <strong>zvec 记忆检索改造</strong>
      <span>长期记忆检索链路和工程改造记录。</span>
    </a>
    <a class="home-card" href="/memory/dashscope-embedding-v4-guide">
      <strong>text-embedding-v4 接入</strong>
      <span>向量模型接入、配置和排查参考。</span>
    </a>
    <a class="home-card" href="/wx-agent-bridge/">
      <strong>微信 Agent Bridge 归档</strong>
      <span>Day 1-11 的计划、实现提示词和降级说明。</span>
    </a>
  </div>
</div>
</section>

<section class="home-block">
<div class="home-block-head">
<div>
<p class="home-eyebrow">Reference</p>
<h2>参考与记录</h2>
</div>
</div>

<div class="home-inline home-inline--loose">
  <a href="/memory/rag-learning-map">RAG 技术路线与名词地图</a>
  <a href="/ranran-gsap-migration">Ranran GSAP 迁移计划</a>
  <a href="/markdown-preview-site-plan">Markdown 文档站方案</a>
</div>
</section>

<p class="home-foot">适合长期阅读的页面，别搞得花里胡哨。入口清楚，正文舒服，才是真能用的文档站。</p>

</div>
