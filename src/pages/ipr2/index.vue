<script setup lang="ts">
import { ref, onMounted } from 'vue'

const canvas = ref<HTMLCanvasElement | null>(null)
const canvas1 = ref<HTMLCanvasElement | null>(null)

// Управление скоростями по X и Y (по умолчанию 10)
const deltaX = ref(10)
const deltaY = ref(10)

// Количество кадров перемещения (по умолчанию 60)
const stepCount = ref<number>(60)

// Таймаут движения анимании
const timeout = ref<number>(300)

// Цвет заливки фигуры
const fillColor = 'rgba(191, 164, 245, 0.72)'

// Структура информации о следах фигуры
interface TraceInfo {
  x: number
  y: number
  scale: number
}

let ctx: CanvasRenderingContext2D
let ctx1: CanvasRenderingContext2D

// Размеры канваса
const W = ref(0)
const H = ref(0)

// Начальная позиция фигуры
let x = 0
let y = 0

// Текущий масштаб фигуры
let currentScale = 1

// Уменьшение масштаба фигуры на следующем шаге (по умолчанию 1/30) (+ делим на количество кадров) 0.99944445
const nextScale = 1 - 1 / 30 / stepCount.value

// Массив следов фигуры (координаты и масштаб)
let trails: TraceInfo[] = []

// Флаг — активна ли анимация
let isAnimating = ref(false)

// Ссылка на таймер setTimeout
let animateTimeout: number | null = null

// Отрисовка многоугольника
function drawPolygon(currentX: number, currentY: number, scale: number, color = fillColor) {
  ctx.beginPath()

  // Задаём цвет заливки
  ctx.fillStyle = color

  // ВЕРШИНА 1: верхняя точка в середине
  ctx.moveTo(currentX + 80 * scale, currentY)

  // ВЕРШИНА 2: вправо и вниз
  ctx.lineTo(currentX + 160 * scale, currentY + 70 * scale)

  // ВЕРШИНА 3: прямо вниз
  ctx.lineTo(currentX + 160 * scale, currentY + 180 * scale)

  // ВЕРШИНА 4: в центр снизу
  ctx.lineTo(currentX + 80 * scale, currentY + 250 * scale)

  // ВЕРШИНА 5: влево
  ctx.lineTo(currentX, currentY + 180 * scale)

  // ВЕРШИНА 6: вверх
  ctx.lineTo(currentX, currentY + 70 * scale)

  // Замыкаем обратно к ВЕРШИНЕ 1
  ctx.lineTo(currentX + 80 * scale, currentY)

  // Заливаем многоугольник
  ctx.fill()
}

// Отрисовка фигуры с применением масштаба
function draw(currentX: number, currentY: number) {
  currentScale *= nextScale
  drawPolygon(currentX, currentY, currentScale)
}

// Переключение состояния "анимации"
function toggleAnimation() {
  if (isAnimating.value) {
    // Остановить анимацию
    isAnimating.value = false

    if (animateTimeout !== null) clearTimeout(animateTimeout)

    animateTimeout = null
  } else {
    // Запустить анимацию
    reset()
    isAnimating.value = true
    animate()
  }
}

// Получение случайного числа в диапазоне от -2 до 2
function getRandomValue() {
  return Math.random() * 4 - 2
}

// Рассчитываем новые координаты и запускает движение
function animate() {
  if (!isAnimating.value) return

  let n = 0
  let currentX = x
  let currentY = y

  // Генерация случайного сдвига по X в допустимых границах
  do {
    n = getRandomValue() * deltaX.value
  } while (x + n <= 25 || x + n >= W.value - 160)
  x += n

  // Генерация случайного сдвига по Y в допустимых границах
  do {
    n = getRandomValue() * deltaY.value
  } while (y + n <= 95 || y + n >= H.value - 75)
  y += n

  // Деление пути на заданное количество шагов
  const stepX = (x - currentX) / stepCount.value
  const stepY = (y - currentY) / stepCount.value
  let k = 0

  // Пошаговое перемещение фигуры к новой позиции
  function moveToPoint() {
    if (!isAnimating.value) return

    if (k !== stepCount.value) {
      k++
      currentX += stepX
      currentY += stepY
      ctx.clearRect(0, 0, W.value, H.value)

      // Отрисовка фигуры в новой точке
      draw(currentX, currentY)

      // Повторный вызов через requestAnimationFrame
      requestAnimationFrame(moveToPoint)
    } else {
      // Сохраняем след и запускаем следующий цикл
      console.log(currentScale)
      trails.push({ x: currentX, y: currentY, scale: currentScale })
      animateTimeout = window.setTimeout(animate, timeout.value)
    }
  }

  moveToPoint()
}

// Сброс параметров и очистка канваса
function reset() {
  x = 700
  y = 300
  currentScale = 1
  trails.length = 0
  trails = [{ x, y, scale: currentScale }]
  draw(x, y)
}

onMounted(() => {
  if (!canvas.value || !canvas1.value) return

  ctx = canvas.value.getContext('2d')!
  ctx1 = canvas1.value.getContext('2d')!

  W.value = canvas.value.width = canvas1.value.width = window.innerWidth
  H.value = canvas.value.height = canvas1.value.height = window.innerHeight

  // Отсекающее окно
  ctx1.beginPath()
  ctx1.fillStyle = 'rgba(255, 173, 15, 0.1)' // бежевый фон
  ctx1.moveTo(565, 285)

  ctx1.lineTo(640, 285)
  ctx1.lineTo(640, 415)
  ctx1.lineTo(695, 415)
  ctx1.lineTo(695, 285)
  ctx1.lineTo(770, 285)
  ctx1.lineTo(770, 485)
  ctx1.lineTo(565, 485)
  ctx1.lineTo(565, 285)

  ctx1.fill()
  ctx1.strokeStyle = 'rgba(0, 0, 0, 0.5)' // белый фон
  ctx1.lineWidth = 1
  ctx1.stroke()

  // Внешняя область вокруг отсекающей фигуры
  ctx1.beginPath()
  ctx1.fillStyle = 'rgba(255, 255, 255, 1)'
  ctx1.moveTo(0, 0)
  ctx1.lineTo(0, H.value)
  ctx1.lineTo(565, H.value)

  ctx1.lineTo(565, 285)
  ctx1.lineTo(640, 285)
  ctx1.lineTo(640, 415)
  ctx1.lineTo(695, 415)
  ctx1.lineTo(695, 285)
  ctx1.lineTo(770, 285)
  ctx1.lineTo(770, 485)
  ctx1.lineTo(565, 485)
  ctx1.lineTo(565, 285)

  ctx1.lineTo(565, H.value)
  ctx1.lineTo(W.value, H.value)
  ctx1.lineTo(W.value, 0)
  ctx1.fill()

  reset()
})
</script>

<template>
  <div class="relative w-screen h-screen overflow-hidden">
    <!-- Канвасы -->
    <canvas ref="canvas" id="canvas" class="absolute top-0 left-0 w-full h-full z-0" />
    <canvas ref="canvas1" class="absolute top-0 left-0 w-full h-full z-10 pointer-events-none" />

    <!-- Параметры анимации -->
    <div
      class="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-[600px] bg-white bg-opacity-90 backdrop-blur-md border border-gray-300 rounded-lg shadow-lg p-4 space-y-4 z-10"
    >
      <h2 class="text-lg font-semibold text-center">Параметры анимации</h2>

      <div class="grid grid-cols-4 gap-4">
        <!-- ΔX -->
        <label class="flex flex-col text-sm">
          ΔX
          <input
            v-model.number="deltaX"
            type="number"
            class="border px-2 py-1 rounded focus:outline-none focus:ring focus:ring-blue-300"
          />
        </label>

        <!-- ΔY -->
        <label class="flex flex-col text-sm">
          ΔY
          <input
            v-model.number="deltaY"
            type="number"
            class="border px-2 py-1 rounded focus:outline-none focus:ring focus:ring-blue-300"
          />
        </label>

        <!-- Количество кадров анимации -->
        <label class="flex flex-col text-sm">
          Кадров анимации
          <input
            v-model.number="stepCount"
            type="number"
            min="1"
            class="border px-2 py-1 rounded focus:outline-none focus:ring focus:ring-blue-300"
          />
        </label>

        <!-- Кол-во шагов -->
        <label class="flex flex-col text-sm">
          Таймаут (мс)
          <input
            v-model.number="timeout"
            type="number"
            min="1"
            class="border px-2 py-1 rounded focus:outline-none focus:ring focus:ring-blue-300"
          />
        </label>
      </div>

      <!-- Кнопка -->
      <button
        @click="toggleAnimation"
        class="w-full bg-teal-700 hover:bg-teal-800 text-white py-2 rounded shadow transition"
      >
        {{ isAnimating ? 'Остановить анимацию' : 'Запустить анимацию' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
</style>