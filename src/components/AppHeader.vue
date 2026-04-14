<template>
  <header class="app-header">
    <div class="header-inner">
      <router-link to="/" class="brand">
        <div class="brand-icon">
          <img src="/海量.png" alt="logo" class="brand-logo-img" />
        </div>
        <div class="brand-text">
          <span class="brand-name">智能数据库管理平台</span>
          <span class="brand-sub">VastBase AI</span>
        </div>
      </router-link>

      <nav class="nav-desktop">
        <router-link
          v-for="item in navItems"
          :key="item.route"
          :to="item.route"
          class="nav-item"
          :class="[{ active: isActive(item.route) }, `nav-item--${item.color}`]"
        >
          <span class="nav-item-text">
            <span class="nav-item-label">{{ item.label }}</span>
            <span class="nav-item-desc">{{ item.desc }}</span>
          </span>
        </router-link>
      </nav>

      <button class="mobile-menu-btn" @click="showMobile = !showMobile" aria-label="菜单">
        <i class="fa" :class="showMobile ? 'fa-times' : 'fa-bars'"></i>
      </button>
    </div>
  </header>

  <div v-if="showMobile" class="mobile-nav">
    <router-link
      v-for="item in navItems"
      :key="item.route"
      :to="item.route"
      class="mobile-nav-item"
      :class="[{ active: isActive(item.route) }, `mobile-nav-item--${item.color}`]"
      @click="showMobile = false"
    >
      <span>{{ item.label }}</span>
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const showMobile = ref(false)

const navItems = [
  { label: '智能评估', desc: 'Assessment', route: '/install', icon: 'fa-cogs', color: 'blue' },
  { label: '智能迁移', desc: 'Migration', route: '/migrate', icon: 'fa-exchange', color: 'purple' },
  { label: '报错答疑', desc: 'Support', route: '/chat', icon: 'fa-comments', color: 'teal' },
  { label: '运维监控', desc: 'Monitor', route: '/monitor', icon: 'fa-line-chart', color: 'orange' },
]

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(22, 93, 255, 0.08);
  box-shadow: 0 1px 20px rgba(0, 0, 0, 0.06);
}

.header-inner {
  max-width: 100%;
  margin: 0 auto;
  padding: 0 40px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.brand-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-name {
  font-size: 15px;
  font-weight: 700;
  color: #1D2129;
  letter-spacing: -0.2px;
}

.brand-sub {
  font-size: 11px;
  color: #165DFF;
  font-weight: 500;
  opacity: 0.8;
}

.nav-desktop {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 16px 7px 12px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #4E5969;
  text-decoration: none;
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  position: relative;
  border: 1px solid transparent;
}

.nav-item-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
  transition: all 0.22s;
  background: #F2F4F7;
  color: #86909C;
}

.nav-item-text {
  display: flex;
  flex-direction: column;
  line-height: 1;
  gap: 2px;
}

.nav-item-label {
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.nav-item-desc {
  font-size: 10px;
  font-weight: 400;
  opacity: 0.55;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* color variants - hover */
.nav-item--blue:hover {
  background: #EEF3FF;
  color: #165DFF;
  border-color: rgba(22, 93, 255, 0.12);
}
.nav-item--blue:hover .nav-item-icon {
  background: rgba(22, 93, 255, 0.12);
  color: #165DFF;
}

.nav-item--purple:hover {
  background: #F3EEFF;
  color: #7B3FE4;
  border-color: rgba(123, 63, 228, 0.12);
}
.nav-item--purple:hover .nav-item-icon {
  background: rgba(123, 63, 228, 0.12);
  color: #7B3FE4;
}

.nav-item--teal:hover {
  background: #E8FAF5;
  color: #0D9E6E;
  border-color: rgba(13, 158, 110, 0.12);
}
.nav-item--teal:hover .nav-item-icon {
  background: rgba(13, 158, 110, 0.12);
  color: #0D9E6E;
}

.nav-item--orange:hover {
  background: #FFF4EC;
  color: #E07B00;
  border-color: rgba(224, 123, 0, 0.12);
}
.nav-item--orange:hover .nav-item-icon {
  background: rgba(224, 123, 0, 0.12);
  color: #E07B00;
}

/* active states */
.nav-item--blue.active {
  background: linear-gradient(135deg, #165DFF 0%, #4080FF 100%);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 14px rgba(22, 93, 255, 0.3);
}
.nav-item--blue.active .nav-item-icon {
  background: rgba(255,255,255,0.2);
  color: white;
}

.nav-item--purple.active {
  background: linear-gradient(135deg, #7B3FE4 0%, #9B6FFF 100%);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 14px rgba(123, 63, 228, 0.3);
}
.nav-item--purple.active .nav-item-icon {
  background: rgba(255,255,255,0.2);
  color: white;
}

.nav-item--teal.active {
  background: linear-gradient(135deg, #0D9E6E 0%, #2DC98A 100%);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 14px rgba(13, 158, 110, 0.3);
}
.nav-item--teal.active .nav-item-icon {
  background: rgba(255,255,255,0.2);
  color: white;
}

.nav-item--orange.active {
  background: linear-gradient(135deg, #E07B00 0%, #FF9A2E 100%);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 14px rgba(224, 123, 0, 0.3);
}
.nav-item--orange.active .nav-item-icon {
  background: rgba(255,255,255,0.2);
  color: white;
}

.nav-item.active .nav-item-desc {
  opacity: 0.7;
}

.mobile-menu-btn {
  display: none;
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #165DFF;
  font-size: 18px;
  border-radius: 8px;
  transition: background 0.2s;
}

.mobile-menu-btn:hover {
  background: #F2F6FF;
}

.mobile-nav {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 8px 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.mobile-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #4E5969;
  text-decoration: none;
  transition: all 0.2s;
}

.mobile-nav-item--blue.active { background: #EEF3FF; color: #165DFF; }
.mobile-nav-item--purple.active { background: #F3EEFF; color: #7B3FE4; }
.mobile-nav-item--teal.active { background: #E8FAF5; color: #0D9E6E; }
.mobile-nav-item--orange.active { background: #FFF4EC; color: #E07B00; }

.mobile-nav-item--blue.active .nav-item-icon { background: rgba(22,93,255,0.12); color: #165DFF; }
.mobile-nav-item--purple.active .nav-item-icon { background: rgba(123,63,228,0.12); color: #7B3FE4; }
.mobile-nav-item--teal.active .nav-item-icon { background: rgba(13,158,110,0.12); color: #0D9E6E; }
.mobile-nav-item--orange.active .nav-item-icon { background: rgba(224,123,0,0.12); color: #E07B00; }

@media (max-width: 768px) {
  .nav-desktop {
    display: none;
  }

  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .brand-sub {
    display: none;
  }
}
</style>
