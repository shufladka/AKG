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

// Уменьшение масштаба фигуры на следующем шаге (по умолчанию 1/30) (+ делим на количество кадров) 0.99944445
const nextScale = 1 - 1 / 30 / stepCount.value

// Массив следов фигуры (координаты и масштаб)
let trails: TraceInfo[] = []

// Флаг — активна ли анимация
let isAnimating = ref(false)

// Ссылка на таймер setTimeout
let animateTimeout: number | null = null

const clippingTriangle = [
  { x: 400, y: 200 },
  { x: 600, y: 200 },
  { x: 500, y: 400 },
]

function liangBarsky(edge, clipWindow) {
  const dx = edge.end.x - edge.start.x
  const dy = edge.end.y - edge.start.y

  let t0 = 0
  let t1 = 1

  for (let i = 0; i < clipWindow.length; i++) {
    const k = (i + 1) % clipWindow.length
    const edgeClip = {
      x: clipWindow[k].x - clipWindow[i].x,
      y: clipWindow[k].y - clipWindow[i].y,
    }
    const edgeNormal = { x: -edgeClip.y, y: edgeClip.x }
    const numerator =
      edgeNormal.x * (edge.start.x - clipWindow[i].x) +
      edgeNormal.y * (edge.start.y - clipWindow[i].y)
    const denominator = edgeNormal.x * dx + edgeNormal.y * dy

    if (denominator !== 0) {
      const t = -numerator / denominator
      if (denominator > 0) {
        t1 = Math.min(t1, t)
      } else {
        t0 = Math.max(t0, t)
      }
    } else if (numerator > 0) {
      return null // Полностью вне отсекающей области
    }
  }

  if (t0 > t1) return null

  const clippedStart = {
    x: edge.start.x + t0 * dx,
    y: edge.start.y + t0 * dy,
  }
  const clippedEnd = {
    x: edge.start.x + t1 * dx,
    y: edge.start.y + t1 * dy,
  }

  return { start: clippedStart, end: clippedEnd }
}

// Вершины многоугольника с учётом текущего положения и масштаба
function getPolygonEdges(currentX: number, currentY: number, scale: number) {
  const vertices = [
    { x: currentX + 80 * scale, y: currentY }, // ВЕРШИНА 1
    { x: currentX + 160 * scale, y: currentY + 70 * scale }, // ВЕРШИНА 2
    { x: currentX + 160 * scale, y: currentY + 180 * scale }, // ВЕРШИНА 3
    { x: currentX + 80 * scale, y: currentY + 250 * scale }, // ВЕРШИНА 4
    { x: currentX, y: currentY + 180 * scale }, // ВЕРШИНА 5
    { x: currentX, y: currentY + 70 * scale }, // ВЕРШИНА 6
  ]

  // Преобразуем вершины в список рёбер (каждое ребро — это пара соседних вершин)
  const edges = []
  for (let i = 0; i < vertices.length; i++) {
    const start = vertices[i]
    const end = vertices[(i + 1) % vertices.length] // Замыкание последнего ребра на первую вершину
    edges.push({ start, end })
  }

  return edges
}

// // Отрисовка многоугольника
// function drawPolygon(currentX: number, currentY: number, scale: number, color = fillColor) {
//   firstPolygon.beginPath()

//   // Задаём цвет заливки
//   firstPolygon.fillStyle = color

//   // ВЕРШИНА 1: верхняя точка в середине
//   firstPolygon.moveTo(currentX + 80 * scale, currentY)

//   // ВЕРШИНА 2: вправо и вниз
//   firstPolygon.lineTo(currentX + 160 * scale, currentY + 70 * scale)

//   // ВЕРШИНА 3: прямо вниз
//   firstPolygon.lineTo(currentX + 160 * scale, currentY + 180 * scale)

//   // ВЕРШИНА 4: в центр снизу
//   firstPolygon.lineTo(currentX + 80 * scale, currentY + 250 * scale)

//   // ВЕРШИНА 5: влево
//   firstPolygon.lineTo(currentX, currentY + 180 * scale)

//   // ВЕРШИНА 6: вверх
//   firstPolygon.lineTo(currentX, currentY + 70 * scale)

//   // Замыкаем обратно к ВЕРШИНЕ 1
//   firstPolygon.lineTo(currentX + 80 * scale, currentY)

//   // Заливаем многоугольник
//   firstPolygon.fill()
// }
function drawPolygon(
  currentX: number,
  currentY: number,
  scale: number = 0,
  clippingTriangle:
    | { start: { x: number; y: number }; end: { x: number; y: number } }[]
    | null = null,
  color = fillColor
) {
  const edges = [
    {
      start: { x: currentX + 80 * scale, y: currentY },
      end: { x: currentX + 160 * scale, y: currentY + 70 * scale },
    }, // ВЕРШИНА 1-2
    {
      start: { x: currentX + 160 * scale, y: currentY + 70 * scale },
      end: { x: currentX + 160 * scale, y: currentY + 180 * scale },
    }, // ВЕРШИНА 2-3
    {
      start: { x: currentX + 160 * scale, y: currentY + 180 * scale },
      end: { x: currentX + 80 * scale, y: currentY + 250 * scale },
    }, // ВЕРШИНА 3-4
    {
      start: { x: currentX + 80 * scale, y: currentY + 250 * scale },
      end: { x: currentX, y: currentY + 180 * scale },
    }, // ВЕРШИНА 4-5
    {
      start: { x: currentX, y: currentY + 180 * scale },
      end: { x: currentX, y: currentY + 70 * scale },
    }, // ВЕРШИНА 5-6
    {
      start: { x: currentX, y: currentY + 70 * scale },
      end: { x: currentX + 80 * scale, y: currentY },
    }, // ВЕРШИНА 6-1
  ]

  firstPolygon.beginPath()
  firstPolygon.fillStyle = color

  edges.forEach((edge) => {
    if (clippingTriangle) {
      // Отсечение рёбер с помощью алгоритма Кируса-Бэка
      const clippedEdge = liangBarsky(edge, clippingTriangle)
      if (clippedEdge) {
        firstPolygon.moveTo(clippedEdge.start.x, clippedEdge.start.y)
        firstPolygon.lineTo(clippedEdge.end.x, clippedEdge.end.y)
      }
    } else {
      // Если отсечение не требуется, рисуем весь многоугольник
      firstPolygon.moveTo(edge.start.x, edge.start.y)
      firstPolygon.lineTo(edge.end.x, edge.end.y)
    }
  })

  firstPolygon.fill()
}

// function drawPolygon1(currentX: number, currentY: number, scale: number) {
//   const edges = getPolygonEdges(currentX, currentY, scale)

//   firstPolygon.beginPath()
//   firstPolygon.fillStyle = fillColor

//   edges.forEach((edge) => {
//     const clippedEdge = liangBarsky(edge, clippingTriangle)
//     if (clippedEdge) {
//       firstPolygon.moveTo(clippedEdge.start.x, clippedEdge.start.y)
//       firstPolygon.lineTo(clippedEdge.end.x, clippedEdge.end.y)
//     }
//   })

//   firstPolygon.fill()
// }

// function drawOuterCanvas() {
//   if (!firstCanvas.value || !secondCanvas.value) return

//   firstPolygon = firstCanvas.value.getContext('2d')!
//   secondPolygon = secondCanvas.value.getContext('2d')!

//   W.value = firstCanvas.value.width = secondCanvas.value.width = window.innerWidth
//   H.value = firstCanvas.value.height = secondCanvas.value.height = window.innerHeight

//   secondPolygon.beginPath()
//   secondPolygon.moveTo(clippingTriangle[0].x, clippingTriangle[0].y)
//   secondPolygon.lineTo(clippingTriangle[1].x, clippingTriangle[1].y)
//   secondPolygon.lineTo(clippingTriangle[2].x, clippingTriangle[2].y)
//   secondPolygon.closePath()

//   secondPolygon.fillStyle = 'rgba(255, 255, 255, 1)'
//   secondPolygon.fill()
// }

// Отрисовка отсекающей фигуры и фона вокруг неё
function drawOuterCanvas() {
  if (!firstCanvas.value || !secondCanvas.value) return

  firstPolygon = firstCanvas.value.getContext('2d')!
  secondPolygon = secondCanvas.value.getContext('2d')!

  W.value = firstCanvas.value.width = secondCanvas.value.width = window.innerWidth
  H.value = firstCanvas.value.height = secondCanvas.value.height = window.innerHeight

  secondPolygon.beginPath()

  secondPolygon.fillStyle = 'rgba(255, 255, 255, 0.1)'

  secondPolygon.moveTo(510, 495)
  secondPolygon.lineTo(880, 495)
  secondPolygon.lineTo(787, 360)
  secondPolygon.lineTo(693, 495)
  secondPolygon.lineTo(601, 360)
  secondPolygon.lineTo(787, 360)
  secondPolygon.lineTo(693, 225)
  secondPolygon.lineTo(510, 495)
  secondPolygon.fill()

  secondPolygon.strokeStyle = 'rgba(0, 0, 0, 1)'
  secondPolygon.lineWidth = 1
  secondPolygon.stroke()
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