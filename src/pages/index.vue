<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goToIpr1() {
  router.push('/ipr1')
}

function goToIpr2() {
  router.push('/ipr2')
}

function goToZadanie1() {
  router.push('/zadanie1')
}

function goToZadanie2() {
  router.push('/zadanie2')
}
</script>

<template>
  <div class="relative w-screen h-screen overflow-hidden">
    <div
      class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] bg-white bg-opacity-90 backdrop-blur-md border border-gray-300 rounded-lg shadow-lg p-4 space-y-4 z-10"
    >
      <div class="flex flex-col gap-1">
        <div class="text-md text-start">ФИО: <span class="font-semibold">Клезович Олег Сергеевич</span></div>
        <div class="text-md text-start">Номер зачетной книжки: <span class="font-semibold">15105012</span></div>
        <div class="text-md text-start">Группа: <span class="font-semibold">151051</span></div>
      </div>
      <div class="flex flex-col gap-2">
        <button
          @click="goToIpr1"
          class="w-full bg-sky-600 hover:bg-sky-700 text-white py-2 rounded shadow transition"
        >
          Индивидуальная практическая работа №1
        </button>
        <button
          @click="goToIpr2"
          class="w-full bg-sky-600 hover:bg-sky-700 text-white py-2 rounded shadow transition"
        >
          Индивидуальная практическая работа №2
        </button>

        <button
          @click="goToZadanie1"
          class="w-full bg-sky-600 hover:bg-sky-700 text-white py-2 rounded shadow transition"
        >
          Контрольная работа. Задание №1
        </button>
        <button
          @click="goToZadanie2"
          class="w-full bg-sky-600 hover:bg-sky-700 text-white py-2 rounded shadow transition"
        >
          Контрольная работа. Задание №2
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
