<template>
  <div class="book-card">
    <div class="book-cover">
      <div class="frame">
        <div class="title-mark">Book<br>Name</div>
        <div class="author-mark">AUTHOR NAME</div>
      </div>
    </div>
    <div class="book-body">
      <h5>{{ b.title }}</h5>
      <div class="author">Penulis Buku</div>
      <span class="badge-tag" :style="{ background: b.tagBg, color: b.tagColor }">{{ b.tag }}</span>
      <div class="year"><i class="fa-regular fa-calendar"></i>{{ b.year }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  b: Object
})
</script>

<style scoped>

</style>