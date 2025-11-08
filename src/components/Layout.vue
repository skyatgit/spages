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

      <div class="sidebar-footer">
        <LanguageSwitcher />
      </div>
    </aside>

    <main class="main-content">
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
  min-height: 100vh;
}

.sidebar {
  width: 250px;
  background: #2c3e50;
  color: white;
  padding: 20px;
  position: fixed;
  height: 100vh;
  overflow-y: auto;
}

.logo {
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo h2 {
  font-size: 28px;
  margin-bottom: 5px;
}

.logo p {
  font-size: 12px;
  color: #95a5a6;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 15px;
  color: #ecf0f1;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.nav-item.router-link-active {
  background: #3498db;
  color: white;
}

.nav-item .icon {
  font-size: 20px;
}

.sidebar-footer {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.main-content {
  flex: 1;
  margin-left: 250px;
  padding: 30px;
  background: #f5f5f5;
  min-height: 100vh;
}
</style>
