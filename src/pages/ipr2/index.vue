<script setup lang="ts">
import { ref, onMounted } from 'vue'

const firstCanvas = ref<HTMLCanvasElement | null>(null)
const secondCanvas = ref<HTMLCanvasElement | null>(null)

let firstPolygon: CanvasRenderingContext2D
let secondPolygon: CanvasRenderingContext2D

// Управление скоростями по X и Y (по умолчанию 5)
const deltaX = ref(5)
const deltaY = ref(5)

// Количество кадров перемещения (по умолчанию 60)
const stepCount = ref<number>(60)

// Таймаут движения анимании (по умолчанию 100)
const timeout = ref<number>(100)

// Цвет заливки фигуры
const fillColor = 'rgba(191, 164, 245, 0.72)'

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

// Уменьшение масштаба фигуры на следующем шаге и деление на количество кадров
const nextScale = 1 - 1 / 30 / stepCount.value

// Массив следов фигуры (координаты и масштаб)
let trails: TraceInfo[] = []

// Флаг активности анимации
let isAnimating = ref(false)

// Ссылка на таймер setTimeout
let animateTimeout: number | null = null

// Коды регионов для алгоритма Коэна-Сазерленда
const INSIDE = 0 // 0000
const LEFT = 1 // 0001
const RIGHT = 2 // 0010
const BOTTOM = 4 // 0100
const TOP = 8 // 1000

// Отсекающее окно
const clipRect = {
  xmin: 550, // левая граница
  ymin: 285, // верхняя граница
  xmax: 785, // правая граница
  ymax: 485, // нижняя граница
}

// Вычисление линий внутри отсеченной области
function computeOutCode(x: number, y: number): number {
  let code = INSIDE
  if (x < clipRect.xmin) code |= LEFT
  else if (x > clipRect.xmax) code |= RIGHT

  if (y < clipRect.ymin) code |= TOP
  else if (y > clipRect.ymax) code |= BOTTOM

  return code
}

// Алгоритм отсечения линии Коэна-Сазерленда
function cohenSutherlandClip(
  x0: number,
  y0: number,
  x1: number,
  y1: number
): [number, number, number, number] | null {
  let outcode0 = computeOutCode(x0, y0)
  let outcode1 = computeOutCode(x1, y1)
  let accept = false // по умолчанию линия не проходит отсечение

  while (true) {
    if (!(outcode0 | outcode1)) {
      // Если обе точки внутри окна => принимаем весь отрезок
      accept = true
      break
    } else if (outcode0 & outcode1) {
      // Если обе точки снаружи в одной и той же зоне => отрезок полностью вне окна
      break
    } else {
      // Отрезок частично внутри — требуется отсечение
      let outcodeOut = outcode0 ? outcode0 : outcode1 // выбираем точку, находящуюся вне окна
      let x, y

      // Находим точку пересечения с соответствующей стороной окна
      if (outcodeOut & TOP) {
        x = x0 + ((x1 - x0) * (clipRect.ymin - y0)) / (y1 - y0)
        y = clipRect.ymin
      } else if (outcodeOut & BOTTOM) {
        x = x0 + ((x1 - x0) * (clipRect.ymax - y0)) / (y1 - y0)
        y = clipRect.ymax
      } else if (outcodeOut & RIGHT) {
        y = y0 + ((y1 - y0) * (clipRect.xmax - x0)) / (x1 - x0)
        x = clipRect.xmax
      } else if (outcodeOut & LEFT) {
        y = y0 + ((y1 - y0) * (clipRect.xmin - x0)) / (x1 - x0)
        x = clipRect.xmin
      }

      // Заменяем исходную точку на точку пересечения и пересчитываем ее код
      if (outcodeOut === outcode0) {
        x0 = x
        y0 = y
        outcode0 = computeOutCode(x0, y0)
      } else {
        x1 = x
        y1 = y
        outcode1 = computeOutCode(x1, y1)
      }
    }
  }

  return accept ? [x0, y0, x1, y1] : null
}

// Отрисовка многоугольника с отсечением ребер
function drawPolygon(currentX: number, currentY: number, scale: number, color = fillColor) {
  firstPolygon.beginPath()
  firstPolygon.fillStyle = color

  const points = [
    [currentX + 80 * scale, currentY],
    [currentX + 160 * scale, currentY + 70 * scale],
    [currentX + 160 * scale, currentY + 180 * scale],
    [currentX + 80 * scale, currentY + 250 * scale],
    [currentX, currentY + 180 * scale],
    [currentX, currentY + 70 * scale],
  ]

  // Добавляем замыкающее ребро
  points.push(points[0])

  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]

    const clipped = cohenSutherlandClip(x0, y0, x1, y1)
    if (clipped) {
      const [cx0, cy0, cx1, cy1] = clipped
      firstPolygon.moveTo(cx0, cy0)
      firstPolygon.lineTo(cx1, cy1)
    }
  }

  firstPolygon.strokeStyle = color
  firstPolygon.lineWidth = 2
  firstPolygon.stroke()
}

// Отрисовка отсекающей фигуры и фона вокруг нее
function drawOuterCanvas() {
  if (!firstCanvas.value || !secondCanvas.value) return

  firstPolygon = firstCanvas.value.getContext('2d')!
  secondPolygon = secondCanvas.value.getContext('2d')!

  W.value = firstCanvas.value.width = secondCanvas.value.width = window.innerWidth
  H.value = firstCanvas.value.height = secondCanvas.value.height = window.innerHeight

  // Отсекающее окно
  secondPolygon.beginPath()
  secondPolygon.fillStyle = 'rgba(255, 173, 15, 0.1)' // бежевый фон
  secondPolygon.moveTo(550, 285)

  secondPolygon.lineTo(625, 285)
  secondPolygon.lineTo(625, 415)
  secondPolygon.lineTo(710, 415)
  secondPolygon.lineTo(710, 285)
  secondPolygon.lineTo(785, 285)
  secondPolygon.lineTo(785, 485)
  secondPolygon.lineTo(550, 485)
  secondPolygon.lineTo(550, 285)

  secondPolygon.fill()
  secondPolygon.strokeStyle = 'rgba(0, 0, 0, 0.5)'
  secondPolygon.lineWidth = 1
  secondPolygon.stroke()

  // Внешняя область вокруг отсекающей фигуры
  secondPolygon.beginPath()
  secondPolygon.fillStyle = 'rgba(255, 255, 255, 1)' // белый фон
  secondPolygon.moveTo(0, 0)
  secondPolygon.lineTo(0, H.value)
  secondPolygon.lineTo(550, H.value)

  secondPolygon.lineTo(550, 285)
  secondPolygon.lineTo(625, 285)
  secondPolygon.lineTo(625, 415)
  secondPolygon.lineTo(710, 415)
  secondPolygon.lineTo(710, 285)
  secondPolygon.lineTo(785, 285)
  secondPolygon.lineTo(785, 485)
  secondPolygon.lineTo(550, 485)
  secondPolygon.lineTo(550, 285)

  secondPolygon.lineTo(550, H.value)
  secondPolygon.lineTo(W.value, H.value)
  secondPolygon.lineTo(W.value, 0)
  secondPolygon.fill()
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
  drawOuterCanvas()
  reset()
})
</script>

<template>
  <div class="relative w-screen h-screen overflow-hidden">
    <!-- Канвасы -->
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