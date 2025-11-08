<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="logo">
        <h2>SPages</h2>
        <p>Deploy Platform</p>
      </div>

      <nav class="nav">
        <router-link to="/" class="nav-item">
          <span class="icon">📊</span>
          <span>{{ $t('nav.dashboard') }}</span>
        </router-link>
        <router-link to="/add-project" class="nav-item">
          <span class="icon">➕</span>
          <span>{{ $t('nav.addProject') }}</span>
        </router-link>
        <router-link to="/settings" class="nav-item">
          <span class="icon">⚙️</span>
          <span>{{ $t('nav.settings') }}</span>
        </router-link>
      </nav>
    </aside>

    <main class="main-content">
      <div class="language-switcher-wrapper">
        <LanguageSwitcher />
      </div>
      <slot></slot>
    </main>
  </div>
</template>

<script setup>
import LanguageSwitcher from './LanguageSwitcher.vue'
</script>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.sidebar {
  width: 250px;
  background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%);
  color: white;
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow-y: auto;
  flex-shrink: 0;
}

.logo {
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo h2 {
  font-size: 28px;
  margin-bottom: 5px;
  font-weight: 700;
}

.logo p {
  font-size: 12px;
  color: #bdc3c7;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  color: #ecf0f1;
  text-decoration: none;
  border-radius: 10px;
  transition: all 0.3s ease;
  font-size: 15px;
  font-weight: 500;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateX(4px);
}

.nav-item.router-link-active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.nav-item .icon {
  font-size: 20px;
}

.main-content {
  flex: 1;
  height: 100vh;
  overflow-y: auto;
  background: #f5f7fa;
  padding: 30px;
  position: relative;
}

.language-switcher-wrapper {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}
</style>
