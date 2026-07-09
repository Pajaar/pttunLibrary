<script setup>
import { RouterLink, RouterView } from 'vue-router'
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <div class="container">
    <h1>Welcome to Your App</h1>
    <a class="btn btn-primary" href="#">Click Me</a>
  </div>

  <RouterView />
</template>

<style scoped>

</style>
