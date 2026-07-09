<script setup>
import { RouterLink, RouterView } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <div class="container">
    <h1>Welcome to Your App</h1>
    <button class="btn btn-primary">Click Me</button>
  </div>

  <RouterView />
</template>

<style scoped>

</style>
