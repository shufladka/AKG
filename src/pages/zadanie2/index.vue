<template>
  <div ref="container" class="w-full h-full fixed top-0 left-0" />
</template>

<script setup>
import { onMounted, ref } from 'vue'
import * as THREE from 'three'

const container = ref(null)

onMounted(() => {
  const arrayLand = Array(5)
  const arrayEdges = Array(5)
  const arrayBottom = Array(5)
  const arrayPoints = [
    [0, -100, 0],
    [100, -100, -173],
    [273, -100, -173],
    [373, -100, 0],
    [273, -100, 173],
    [0, -100, 0],
  ]
  const arr = Array(5)

  let camera, scene, renderer
  let rotation = 0
  const height = 300
  const size = 10
  const dash = 1

  function init() {
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

    const material2 = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: dash,
      gapSize: 0.00001,
    })

    // ось x
    let tmp = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 400),
    ])
    arr[5] = new THREE.Line(tmp, material2)
    arr[5].computeLineDistances?.()
    scene.add(arr[5])

    // ось y
    tmp = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 400, 0),
    ])
    arr[4] = new THREE.Line(tmp, material2)
    arr[4].computeLineDistances?.()
    scene.add(arr[4])

    // ось z
    tmp = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(400, 0, 0),
    ])
    arr[3] = new THREE.Line(tmp, material2)
    arr[3].computeLineDistances?.()
    scene.add(arr[3])

    function createAxisLabel(text, position) {
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 128
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = 'white'
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

    // Добавление подписей
    scene.add(createAxisLabel('X', new THREE.Vector3(420, 0, 0)))
    scene.add(createAxisLabel('Y', new THREE.Vector3(0, 420, 0)))
    scene.add(createAxisLabel('Z', new THREE.Vector3(0, 0, 420)))

    for (let i = 0; i < 5; i++) {
      const lineMaterial = new THREE.LineDashedMaterial({
        color: 0xcbbbee,
        dashSize: 5,
        gapSize: 0.0001,
        linewidth: 10,
      })

      const landGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...arrayPoints[i]),
        new THREE.Vector3(...arrayPoints[i + 1]),
      ])
      const bottomGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(arrayPoints[i][0], arrayPoints[i][1] + height, arrayPoints[i][2]),
        new THREE.Vector3(
          arrayPoints[i + 1][0],
          arrayPoints[i + 1][1] + height,
          arrayPoints[i + 1][2]
        ),
      ])
      const edgeGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...arrayPoints[i]),
        new THREE.Vector3(arrayPoints[i][0], arrayPoints[i][1] + height, arrayPoints[i][2]),
      ])

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

      arrayLand[i].line.rotation.y = 0.2
      arrayBottom[i].line.rotation.y = 0.2
      arrayEdges[i].line.rotation.y = 0.2

      scene.add(arrayLand[i].line)
      scene.add(arrayBottom[i].line)
      scene.add(arrayEdges[i].line)
    }

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setClearColor(0x111111)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)

    container.value.appendChild(renderer.domElement)

    window.addEventListener('resize', onWindowResize)
  }

  function onWindowResize() {
    camera.left = window.innerWidth / -2
    camera.right = window.innerWidth / 2
    camera.top = window.innerHeight / 2
    camera.bottom = window.innerHeight / -2
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  function animate() {
    requestAnimationFrame(animate)

    for (let i = 0; i < 5; i++) {
      // задаем ось вращения призмы вокруг оси Z
      arrayLand[i].line.rotation.z = rotation
      arrayEdges[i].line.rotation.z = rotation
      arrayBottom[i].line.rotation.z = rotation

      arrayLand[i].line.rotation.y = 0.2
      arrayBottom[i].line.rotation.y = 0.2
      arrayEdges[i].line.rotation.y = 0.2

      arrayLand[i].line.material.gapSize = 0.0001
      arrayEdges[i].line.material.gapSize = 0.0001
      arrayBottom[i].line.material.gapSize = 0.0001
    }

    const range = (start, end) => rotation >= start && rotation < end

    // if (range(0, 1.05) || rotation >= 6.037) {
    //   arrayLand[0].line.material.gapSize = size
    //   arrayLand[1].line.material.gapSize = size
    //   arrayLand[2].line.material.gapSize = size
    //   arrayEdges[1].line.material.gapSize = size
    //   arrayEdges[2].line.material.gapSize = size
    // } else if (range(1.05, 1.38)) {
    //   arrayLand[0].line.material.gapSize = size
    //   arrayLand[1].line.material.gapSize = size
    //   arrayLand[5].line.material.gapSize = size
    //   arrayEdges[1].line.material.gapSize = size
    //   arrayEdges[0].line.material.gapSize = size
    // } else if (range(1.38, 2.13)) {
    //   arrayLand[0].line.material.gapSize = size
    //   arrayLand[4].line.material.gapSize = size
    //   arrayLand[5].line.material.gapSize = size
    //   arrayEdges[5].line.material.gapSize = size
    //   arrayEdges[0].line.material.gapSize = size
    // } else if (range(2.13, 2.9)) {
    //   arrayLand[3].line.material.gapSize = size
    //   arrayLand[4].line.material.gapSize = size
    //   arrayLand[5].line.material.gapSize = size
    //   arrayEdges[5].line.material.gapSize = size
    //   arrayEdges[4].line.material.gapSize = size
    // } else if (range(2.9, 3.65)) {
    //   arrayBottom[3].line.material.gapSize = size
    //   arrayBottom[4].line.material.gapSize = size
    //   arrayBottom[5].line.material.gapSize = size
    //   arrayEdges[5].line.material.gapSize = size
    //   arrayEdges[4].line.material.gapSize = size
    // } else if (range(3.65, 4.42)) {
    //   arrayBottom[0].line.material.gapSize = size
    //   arrayBottom[4].line.material.gapSize = size
    //   arrayBottom[5].line.material.gapSize = size
    //   arrayEdges[5].line.material.gapSize = size
    //   arrayEdges[0].line.material.gapSize = size
    // } else if (range(4.42, 4.75)) {
    //   arrayBottom[0].line.material.gapSize = size
    //   arrayBottom[1].line.material.gapSize = size
    //   arrayBottom[5].line.material.gapSize = size
    //   arrayEdges[1].line.material.gapSize = size
    //   arrayEdges[0].line.material.gapSize = size
    // } else if (range(4.75, 6.037)) {
    //   arrayBottom[0].line.material.gapSize = size
    //   arrayBottom[1].line.material.gapSize = size
    //   arrayBottom[2].line.material.gapSize = size
    //   arrayEdges[2].line.material.gapSize = size
    //   arrayEdges[1].line.material.gapSize = size
    // }

    rotation = rotation >= Math.PI * 2 ? 0 : rotation + 0.005

    renderer.render(scene, camera)
  }

  init()
  animate()
})
</script>

<style scoped>
html,
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
