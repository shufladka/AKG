<script setup lang="ts">
import { onMounted, ref } from 'vue'

// Контекст отрисовки 2D
let ctx: CanvasRenderingContext2D

// Ссылка на DOM-элемент canvas
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Управление скоростями по X и Y (по умолчанию 10)
const deltaX = ref(10)
const deltaY = ref(10)

// Количество кадров перемещения (по умолчанию 60)
const stepCount = ref<number>(60)

// Размеры канваса
const W = ref(0)
const H = ref(0)

// Цвет заливки фигуры
const fillColor = 'rgba(191, 164, 245, 0.72)'

// Таймаут движения анимании
const timeout = ref<number>(300)

// Начальная позиция фигуры
let x = 0
let y = 0

// Текущий масштаб фигуры
let currentScale = 1

// Уменьшение масштаба фигуры на следующем шаге (по умолчанию 1/30) (+ делим на количество кадров) 0.99944445
const nextScale = 1 - 1 / 30 / stepCount.value

// Структура информации о следах фигуры
interface TraceInfo {
  x: number
  y: number
  scale: number
}

// Массив следов фигуры (координаты и масштаб)
const trails: TraceInfo[] = []

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
  ctx.lineTo(currentX + 160 * scale, currentY + 160 * scale)

  // ВЕРШИНА 4: в центр снизу
  ctx.lineTo(currentX + 80 * scale, currentY + 230 * scale)

  // ВЕРШИНА 5: влево
  ctx.lineTo(currentX, currentY + 160 * scale)

  // ВЕРШИНА 6: вверх
  ctx.lineTo(currentX, currentY + 70 * scale)

  // Замыкаем обратно к ВЕРШИНЕ 1
  ctx.lineTo(currentX + 80 * scale, currentY)

  // Заливаем многоугольник
  ctx.fill()
}

// Рисование "следа" от фигуры
function drawTrail(trace: TraceInfo) {
  drawPolygon(trace.x, trace.y, trace.scale, 'rgba(255,255,255,1)')
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'
  ctx.lineWidth = 1
  ctx.stroke()
}

// Отрисовка фигуры с применением масштаба
function draw(currentX: number, currentY: number) {
  currentScale *= nextScale
  drawPolygon(currentX, currentY, currentScale)
}

// Обработка нажатия на кнопку — переключение состояния "анимации"
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

      // Очистка канваса и отрисовка всех следов
      ctx.clearRect(0, 0, W.value, H.value)
      trails.forEach((trace: TraceInfo) => drawTrail(trace))

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

  // Запуск движения
  moveToPoint()
}

// Сброс параметров и очистка канваса
function reset() {
  x = window.innerWidth / 2
  y = window.innerHeight / 3
  currentScale = 1
  trails.length = 0
  trails.push({ x, y, scale: currentScale })
  ctx.clearRect(0, 0, W.value, H.value)
  draw(x, y)
}

// Инициализация канваса и начальная отрисовка при монтировании компонента
onMounted(() => {
  const canvas = canvasRef.value!
  ctx = canvas.getContext('2d')!
  W.value = canvas.width = window.innerWidth - 25
  H.value = canvas.height = window.innerHeight - 50
  reset()
})
</script>

<template>
  <div class="relative w-screen h-screen overflow-hidden">
    <!-- Канвас — занимает всё пространство сверху до блока параметров -->
    <canvas ref="canvasRef" id="canvas" class="absolute top-0 left-0 w-full h-full" />

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
/* Установка высоты канваса */
canvas {
  height: 700px;
}
</style>
