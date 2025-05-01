<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goToIpr1() {
  router.push('/ipr1')
}

function goToIpr2() {}
</script>

<template>
  <div class="relative w-screen h-screen overflow-hidden">
    <div
      class="absolute bottom-1/2 left-1/2 transform -translate-x-1/2 w-[400px] bg-white bg-opacity-90 backdrop-blur-md border border-gray-300 rounded-lg shadow-lg p-4 space-y-4 z-10"
    >
      <h2 class="text-lg font-semibold text-center">Ссылки на индивидуальные задания</h2>
      <div class="flex flex-col gap-2">
        <button
          @click="goToIpr1"
          class="w-full bg-sky-600 hover:bg-sky-700 text-white py-2 rounded shadow transition"
        >
          Перейти к ИПР1
        </button>
        <button
          @click="goToIpr2"
          class="w-full bg-sky-600 hover:bg-sky-700 text-white py-2 rounded shadow transition"
        >
          Перейти к ИПР2
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
