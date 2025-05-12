<script setup lang="ts">
import { ref, onMounted } from 'vue'

const firstCanvas = ref<HTMLCanvasElement | null>(null)
const secondCanvas = ref<HTMLCanvasElement | null>(null)

let firstPolygon: CanvasRenderingContext2D
let secondPolygon: CanvasRenderingContext2D

// Управление скоростями по X и Y (по умолчанию 10)
const deltaX = ref(10)
const deltaY = ref(10)

// Количество кадров перемещения (по умолчанию 60)
const stepCount = ref<number>(60)

// Таймаут движения анимании (по умолчанию 100)
const timeout = ref<number>(100)

// Цвет заливки фигуры
const fillColor = 'rgba(191, 164, 245, 0.72)'
const originalColor = 'rgba(191, 164, 245, 0.2)'

// Структура информации о следах фигуры
interface TraceInfo {
  x: number
  y: number
  scale: number
}

// Размеры канваса
const W = ref(0)
const H = ref(0)

// Начальная позиция фигуры
let x = 0
let y = 0

// Текущий масштаб фигуры
let currentScale = 1

// Уменьшение масштаба фигуры на следующем шаге
const nextScale = 1 - 1 / 30 / stepCount.value

// Массив следов фигуры
let trails: TraceInfo[] = []

// Флаг активности анимации
let isAnimating = ref(false)

// Ссылка на таймер setTimeout
let animateTimeout: number | null = null

// Определение отсекающего многоугольника (сложный треугольник)
const clippingPolygon = [
  { x: 510, y: 495 }, // Внешний треугольник - точка 1
  { x: 880, y: 495 }, // Внешний треугольник - точка 2
  { x: 787, y: 360 }, // Внешний треугольник - точка 3 и внутренний треугольник - точка 1
  { x: 693, y: 495 }, // Внутренний треугольник - точка 2
  { x: 601, y: 360 }, // Внутренний треугольник - точка 3
  { x: 787, y: 360 }, // Замыкаем внутренний треугольник
  { x: 693, y: 225 }, // Внешний треугольник - дополнительная точка
  { x: 510, y: 495 }, // Замыкаем внешний треугольник
]

// Функция для вычисления векторного произведения
function crossProduct(a: { x: number; y: number }, b: { x: number; y: number }) {
  return a.x * b.y - a.y * b.x
}

// Функция для вычисления нормали к ребру
function computeNormal(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  const edge = { x: p2.x - p1.x, y: p2.y - p1.y }
  // Нормаль направлена внутрь многоугольника
  return { x: -edge.y, y: edge.x }
}

// Алгоритм отсечения Кируса-Бэка
function cyrusBeckClip(
  subjectPolygon: { x: number; y: number }[],
  clipPolygon: { x: number; y: number }[]
) {
  const outputPolygon = [...subjectPolygon]

  // Для каждого ребра отсекающего многоугольника
  for (let i = 0; i < clipPolygon.length; i++) {
    const p1 = clipPolygon[i]
    const p2 = clipPolygon[(i + 1) % clipPolygon.length]

    const normal = computeNormal(p1, p2)

    const inputPolygon = [...outputPolygon]
    outputPolygon.length = 0

    // Для каждого ребра отсекаемого шестиугольника
    for (let j = 0; j < inputPolygon.length; j++) {
      const v1 = inputPolygon[j]
      const v2 = inputPolygon[(j + 1) % inputPolygon.length]

      const edge = { x: v2.x - v1.x, y: v2.y - v1.y }

      const dp = crossProduct(normal, edge)

      if (dp !== 0) {
        const t = crossProduct({ x: p1.x - v1.x, y: p1.y - v1.y }, normal) / dp

        if (dp > 0) {
          // Входная точка
          if (t > 0 && t < 1) {
            const intersect = {
              x: v1.x + edge.x * t,
              y: v1.y + edge.y * t,
            }
            outputPolygon.push(intersect)
          }
          outputPolygon.push(v2)
        } else {
          // Выходная точка
          if (t > 0 && t < 1) {
            const intersect = {
              x: v1.x + edge.x * t,
              y: v1.y + edge.y * t,
            }
            outputPolygon.push(intersect)
          }
        }
      }
    }
  }

  return outputPolygon
}

// Отрисовка исходного шестиугольника
function drawPolygon(currentX: number, currentY: number, scale: number) {
  firstPolygon.beginPath()
  firstPolygon.fillStyle = originalColor

  // ВЕРШИНА 1: верхняя точка в середине
  firstPolygon.moveTo(currentX + 80 * scale, currentY)

  // ВЕРШИНА 2: вправо и вниз
  firstPolygon.lineTo(currentX + 160 * scale, currentY + 70 * scale)

  // ВЕРШИНА 3: прямо вниз
  firstPolygon.lineTo(currentX + 160 * scale, currentY + 180 * scale)

  // ВЕРШИНА 4: в центр снизу
  firstPolygon.lineTo(currentX + 80 * scale, currentY + 250 * scale)

  // ВЕРШИНА 5: влево
  firstPolygon.lineTo(currentX, currentY + 180 * scale)

  // ВЕРШИНА 6: вверх
  firstPolygon.lineTo(currentX, currentY + 70 * scale)

  // Замыкаем обратно к ВЕРШИНЕ 1
  firstPolygon.lineTo(currentX + 80 * scale, currentY)

  // Заливаем многоугольник
  firstPolygon.fill()
  firstPolygon.strokeStyle = 'rgba(0, 0, 0, 0.5)'
  firstPolygon.lineWidth = 1
  firstPolygon.stroke()
}

// Отрисовка многоугольника с отсечением
function drawClippedPolygon(currentX: number, currentY: number, scale: number, color = fillColor) {
  // Создаем шестиугольник (subject polygon)
  const subjectPolygon = [
    { x: currentX + 80 * scale, y: currentY }, // ВЕРШИНА 1
    { x: currentX + 160 * scale, y: currentY + 70 * scale }, // ВЕРШИНА 2
    { x: currentX + 160 * scale, y: currentY + 180 * scale }, // ВЕРШИНА 3
    { x: currentX + 80 * scale, y: currentY + 250 * scale }, // ВЕРШИНА 4
    { x: currentX, y: currentY + 180 * scale }, // ВЕРШИНА 5
    { x: currentX, y: currentY + 70 * scale }, // ВЕРШИНА 6
  ]

  // Применяем алгоритм отсечения
  const clippedPolygon = cyrusBeckClip(subjectPolygon, clippingPolygon)

  // Отрисовываем результат
  if (clippedPolygon.length > 0) {
    firstPolygon.beginPath()
    firstPolygon.fillStyle = color

    // Начинаем с первой точки
    firstPolygon.moveTo(clippedPolygon[0].x, clippedPolygon[0].y)

    // Рисуем линии к остальным точкам
    for (let i = 1; i < clippedPolygon.length; i++) {
      firstPolygon.lineTo(clippedPolygon[i].x, clippedPolygon[i].y)
    }

    // Замыкаем многоугольник
    firstPolygon.closePath()
    firstPolygon.fill()
    firstPolygon.strokeStyle = 'rgba(0, 0, 0, 1)'
    firstPolygon.lineWidth = 1
    firstPolygon.stroke()
  }
}

// Отрисовка отсекающей фигуры и фона вокруг неё
function drawOuterCanvas() {
  if (!firstCanvas.value || !secondCanvas.value) return

  firstPolygon = firstCanvas.value.getContext('2d')!
  secondPolygon = secondCanvas.value.getContext('2d')!

  W.value = firstCanvas.value.width = secondCanvas.value.width = window.innerWidth
  H.value = firstCanvas.value.height = secondCanvas.value.height = window.innerHeight

  // Отрисовка сложного треугольного окна
  secondPolygon.beginPath()
  secondPolygon.fillStyle = 'rgba(255, 255, 255, 1)'

  // Рисуем внешний треугольник
  secondPolygon.moveTo(clippingPolygon[0].x, clippingPolygon[0].y)
  secondPolygon.lineTo(clippingPolygon[1].x, clippingPolygon[1].y)
  secondPolygon.lineTo(clippingPolygon[2].x, clippingPolygon[2].y)

  // Рисуем внутренний треугольник (вырез)
  secondPolygon.lineTo(clippingPolygon[3].x, clippingPolygon[3].y)
  secondPolygon.lineTo(clippingPolygon[4].x, clippingPolygon[4].y)
  secondPolygon.lineTo(clippingPolygon[5].x, clippingPolygon[5].y)

  // Завершаем внешний треугольник
  secondPolygon.lineTo(clippingPolygon[6].x, clippingPolygon[6].y)
  secondPolygon.lineTo(clippingPolygon[7].x, clippingPolygon[7].y)

  secondPolygon.fill()
  secondPolygon.strokeStyle = 'rgba(0, 0, 0, 1)'
  secondPolygon.lineWidth = 2
  secondPolygon.stroke()
}

// Отрисовка фигуры с применением масштаба и отсечения
function draw(currentX: number, currentY: number) {
  currentScale *= nextScale
  // Сначала рисуем исходный шестиугольник (полупрозрачный)
  drawPolygon(currentX, currentY, currentScale)
  // Затем рисуем отсечённую часть
  drawClippedPolygon(currentX, currentY, currentScale)
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

  let currentX = x
  let currentY = y

  // Генерация случайного сдвига по X в допустимых границах
  x += getRandomValue() * deltaX.value

  // Генерация случайного сдвига по Y в допустимых границах
  y += getRandomValue() * deltaY.value

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
      firstPolygon.clearRect(0, 0, W.value, H.value)

      // Отрисовка фигуры в новой точке с отсечением
      draw(currentX, currentY)

      // Повторный вызов через requestAnimationFrame
      requestAnimationFrame(moveToPoint)
    } else {
      // Сохраняем след и запускаем следующий цикл
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
  firstPolygon.clearRect(0, 0, W.value, H.value)
  draw(x, y)
}

onMounted(() => {
  drawOuterCanvas()
  reset()
})
</script>

<template>
  <div class="relative w-screen h-screen overflow-hidden">
    <canvas ref="firstCanvas" class="absolute top-0 left-0 w-full h-full z-0" />
    <canvas
      ref="secondCanvas"
      class="absolute top-0 left-0 w-full h-full z-10 pointer-events-none"
    />

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

        <!-- Количество шагов -->
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