<script setup lang="ts">
import { onMounted, ref } from 'vue'
import * as THREE from 'three'

// Ссылка на DOM-элемент-контейнер, в который будет вставлен канвас
const container = ref(null)

// Массивы для хранения объектов осей, граней, рёбер и оснований призмы
const arr = Array(5)
const arrayLand = Array(5) // верхнее основание
const arrayEdges = Array(5) // вертикальные рёбра
const arrayBottom = Array(5) // нижнее основание

// Глобальные переменные сцены
let camera, scene, renderer
let rotation = 0 // угол вращения
const height = 300 // высота призмы
const size = 10 // размер штриховки
const dash = 1 // длина штриха по умолчанию

// Массив точек, определяющих основание призмы (пятиугольник)
const arrayPoints = [
  [250, 0, 150], // начальная позиция
  [180.9, 0, 245.1], // 1-я вершина
  [69.1, 0, 208.8], // 2-я вершина
  [69.1, 0, 91.2], // 3-я вершина
  [180.9, 0, 54.9], // 4-я вершина
  [250, 0, 150], // замыкаем контур
]

// Функция создания текстовой метки оси на плоскости
function createAxisLabel(text: string, position: THREE.Vector3) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'black'
  ctx.font = '48px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(100, 50, 1)
  sprite.position.copy(position)
  return sprite
}

// Обработчик изменения размера окна
function onWindowResize() {
  camera.left = window.innerWidth / -2
  camera.right = window.innerWidth / 2
  camera.top = window.innerHeight / 2
  camera.bottom = window.innerHeight / -2
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

// Функция инициализации сцены, камеры и объектов
function init() {
  // Настройка ортографической камеры
  camera = new THREE.OrthographicCamera(
    window.innerWidth / -2,
    window.innerWidth / 2,
    window.innerHeight / 2,
    window.innerHeight / -2,
    1,
    10000
  )
  camera.position.set(500, 500, 500)
  camera.lookAt(0, 0, 0)

  scene = new THREE.Scene()

  // Общий материал для осей
  const material2 = new THREE.LineDashedMaterial({
    color: 0x111111,
    dashSize: dash,
    gapSize: 0.00001,
  })

  // Добавление осей X, Y, Z
  let tmp = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 400),
  ])
  arr[5] = new THREE.Line(tmp, material2)
  arr[5].computeLineDistances?.()
  scene.add(arr[5])

  tmp = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 400, 0),
  ])
  arr[4] = new THREE.Line(tmp, material2)
  arr[4].computeLineDistances?.()
  scene.add(arr[4])

  tmp = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(400, 0, 0),
  ])
  arr[3] = new THREE.Line(tmp, material2)
  arr[3].computeLineDistances?.()
  scene.add(arr[3])

  // Добавление подписей к осям
  scene.add(createAxisLabel('X', new THREE.Vector3(420, 0, 0)))
  scene.add(createAxisLabel('Y', new THREE.Vector3(0, 420, 0)))
  scene.add(createAxisLabel('Z', new THREE.Vector3(0, 0, 420)))

  // Построение граней призмы
  for (let i = 0; i < 5; i++) {
    // Линии для верхнего основания
    const landGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...arrayPoints[i]),
      new THREE.Vector3(...arrayPoints[i + 1]),
    ])

    // Линии для нижнего основания
    const bottomGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(arrayPoints[i][0], arrayPoints[i][1] + height, arrayPoints[i][2]),
      new THREE.Vector3(
        arrayPoints[i + 1][0],
        arrayPoints[i + 1][1] + height,
        arrayPoints[i + 1][2]
      ),
    ])

    // Вертикальные рёбра
    const edgeGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...arrayPoints[i]),
      new THREE.Vector3(arrayPoints[i][0], arrayPoints[i][1] + height, arrayPoints[i][2]),
    ])

    // Создание и добавление линий в сцену
    const lineMaterial = new THREE.LineDashedMaterial({
      color: 0x9d0bff,
      dashSize: 50,
      gapSize: 0.01,
      linewidth: 10,
    })

    arrayLand[i] = {
      line: new THREE.Line(landGeometry, lineMaterial),
    }
    arrayBottom[i] = {
      line: new THREE.Line(bottomGeometry, lineMaterial.clone()),
    }
    arrayEdges[i] = {
      line: new THREE.Line(edgeGeometry, lineMaterial.clone()),
    }

    arrayLand[i].line.computeLineDistances?.()
    arrayBottom[i].line.computeLineDistances?.()
    arrayEdges[i].line.computeLineDistances?.()

    scene.add(arrayLand[i].line)
    scene.add(arrayBottom[i].line)
    scene.add(arrayEdges[i].line)
  }

  // Инициализация рендерера
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setClearColor(new THREE.Color(255, 255, 255))
  renderer.setClearAlpha(0.8)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)

  container.value.appendChild(renderer.domElement)

  window.addEventListener('resize', onWindowResize)
}

// Функция анимации и вращения призмы
function animate() {
  requestAnimationFrame(animate)

  for (let i = 0; i < 5; i++) {
    // Вращаем каждую грань вокруг оси Z
    arrayLand[i].line.rotation.z = rotation
    arrayEdges[i].line.rotation.z = rotation
    arrayBottom[i].line.rotation.z = rotation

    // Сброс размера штриховки до минимального (невидимость)
    arrayLand[i].line.material.gapSize = 0.0001
    arrayEdges[i].line.material.gapSize = 0.0001
    arrayBottom[i].line.material.gapSize = 0.0001
  }

  const range = (start: number, end: number) => rotation >= start && rotation < end

  if (range(0, 0.75)) {
    // штрихуем ребра верхнего основания
    arrayLand[2].line.material.gapSize = size
    arrayLand[3].line.material.gapSize = size

    // штрихуем боковое ребро
    arrayEdges[3].line.material.gapSize = size
  } else if (range(0.75, 0.8)) {
    // штрихуем боковое ребро
    arrayEdges[3].line.material.gapSize = size
  } else if (range(0.8, 1.8)) {
    // штрихуем боковое ребро
    arrayEdges[3].line.material.gapSize = size

    // штрихуем ребра нижнего основания
    arrayBottom[2].line.material.gapSize = size
    arrayBottom[3].line.material.gapSize = size
  } else if (range(1.8, 2.35)) {
    // штрихуем боковое ребро
    arrayEdges[3].line.material.gapSize = size
    arrayEdges[4].line.material.gapSize = size

    // штрихуем ребра нижнего основания
    arrayBottom[2].line.material.gapSize = size
    arrayBottom[3].line.material.gapSize = size
    arrayBottom[4].line.material.gapSize = size
  } else if (range(2.35, 2.92)) {
    // штрихуем боковое ребро
    arrayEdges[4].line.material.gapSize = size

    // штрихуем ребра нижнего основания
    arrayBottom[3].line.material.gapSize = size
    arrayBottom[4].line.material.gapSize = size
  } else if (range(2.92, 3.94)) {
    // штрихуем боковое ребро
    arrayEdges[0].line.material.gapSize = size
    arrayEdges[4].line.material.gapSize = size

    // штрихуем ребра нижнего основания
    arrayBottom[0].line.material.gapSize = size
    arrayBottom[3].line.material.gapSize = size
    arrayBottom[4].line.material.gapSize = size
  } else if (range(3.94, 4.92)) {
    // штрихуем боковое ребро
    arrayEdges[0].line.material.gapSize = size
    arrayEdges[4].line.material.gapSize = size

    // штрихуем ребра верхнего основания
    arrayLand[0].line.material.gapSize = size
    arrayLand[3].line.material.gapSize = size
    arrayLand[4].line.material.gapSize = size
  } else if (range(4.92, 5.5)) {
    // штрихуем боковое ребро
    arrayEdges[4].line.material.gapSize = size

    // штрихуем ребра верхнего основания
    arrayLand[3].line.material.gapSize = size
    arrayLand[4].line.material.gapSize = size
  } else if (range(5.5, 6.037)) {
    // штрихуем боковое ребро
    arrayEdges[3].line.material.gapSize = size
    arrayEdges[4].line.material.gapSize = size

    // штрихуем ребра верхнего основания
    arrayLand[2].line.material.gapSize = size
    arrayLand[3].line.material.gapSize = size
    arrayLand[4].line.material.gapSize = size
  } else if (rotation > 6.037) {
    // штрихуем боковое ребро
    arrayEdges[3].line.material.gapSize = size

    // штрихуем ребра верхнего основания
    arrayLand[2].line.material.gapSize = size
    arrayLand[3].line.material.gapSize = size
  }

  // Вращение по кругу
  rotation = rotation >= Math.PI * 2 ? 0 : rotation + 0.005

  // Обновление сцены
  renderer.render(scene, camera)
}

onMounted(() => {
  init()
  animate()
})
</script>

<template>
  <div ref="container" class="w-full h-full fixed top-0 left-0" />
</template>

<style scoped>
html,
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
