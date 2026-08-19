import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js'
import { unzipSync } from 'three/examples/jsm/libs/fflate.module.js'

const ACCENT = new THREE.Color('#7fd8ff')
const SEMANTIC_COLORS = {
  workbench: '#cf8d58',
  robot: '#69b9d7',
  crate: '#d6ad63',
  floor: '#7c8790',
  shelf: '#7fa58d',
  monitor: '#9b8dd0',
  scanner: '#d17f91',
}

const OBJECT_META = {
  workbench: { name: 'Workbench', type: 'Surface', confidence: '98%', locked: false },
  robot: { name: 'Robot arm', type: 'Articulated · 6 DOF', confidence: '96%', locked: false },
  crate: { name: 'Storage crate', type: 'Container', confidence: '94%', locked: false },
  floor: { name: 'Workshop floor', type: 'Structure', confidence: '99%', locked: true },
  shelf: { name: 'Storage rack', type: 'Structure', confidence: '95%', locked: false },
  monitor: { name: 'Control display', type: 'Electronic', confidence: '93%', locked: false },
  scanner: { name: 'Depth scanner', type: 'Sensor', confidence: '97%', locked: false },
}
const ROOT_ORDER = ['workbench', 'robot', 'crate', 'floor', 'shelf', 'monitor', 'scanner']

const round = value => Math.round(value * 100) / 100
const degrees = radians => round(THREE.MathUtils.radToDeg(radians))
const radians = value => THREE.MathUtils.degToRad(Number(value) || 0)

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function roundedBox(width, height, depth, radius = 0.05) {
  const shape = new THREE.Shape()
  const x = -width / 2
  const y = -height / 2
  shape.moveTo(x + radius, y)
  shape.lineTo(x + width - radius, y)
  shape.quadraticCurveTo(x + width, y, x + width, y + radius)
  shape.lineTo(x + width, y + height - radius)
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  shape.lineTo(x + radius, y + height)
  shape.quadraticCurveTo(x, y + height, x, y + height - radius)
  shape.lineTo(x, y + radius)
  shape.quadraticCurveTo(x, y, x + radius, y)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: radius * 0.45,
    bevelThickness: radius * 0.45,
  })
  geometry.center()
  return geometry
}

function StudioViewport({ selected, onSelect, mode, layers, reconstructing, sourceImage, tool = 'translate', transformSpace = 'world', snapEnabled = true, onReady, onSceneChange, onHistoryChange, onStatsChange }) {
  const mountRef = useRef(null)
  const sceneApiRef = useRef(null)
  const selectedRef = useRef(selected)
  const modeRef = useRef(mode)
  const layersRef = useRef(layers)
  const reconstructingRef = useRef(reconstructing)
  const onSelectRef = useRef(onSelect)
  const onReadyRef = useRef(onReady)
  const onSceneChangeRef = useRef(onSceneChange)
  const onHistoryChangeRef = useRef(onHistoryChange)
  const onStatsChangeRef = useRef(onStatsChange)
  const [cameraLabel, setCameraLabel] = useState('Perspective')
  const [stats, setStats] = useState({ objects: 7, triangles: 21400 })

  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { layersRef.current = layers }, [layers])
  useEffect(() => { reconstructingRef.current = reconstructing }, [reconstructing])
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])
  useEffect(() => { onReadyRef.current = onReady }, [onReady])
  useEffect(() => { onSceneChangeRef.current = onSceneChange }, [onSceneChange])
  useEffect(() => { onHistoryChangeRef.current = onHistoryChange }, [onHistoryChange])
  useEffect(() => { onStatsChangeRef.current = onStatsChange }, [onStatsChange])
  useEffect(() => { sceneApiRef.current?.select(selected) }, [selected])
  useEffect(() => { sceneApiRef.current?.setTool(tool) }, [tool])
  useEffect(() => { sceneApiRef.current?.setSpace(transformSpace) }, [transformSpace])
  useEffect(() => { sceneApiRef.current?.setSnap(snapEnabled) }, [snapEnabled])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#090b0d')
    scene.fog = new THREE.FogExp2('#090b0d', 0.035)

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80)
    camera.position.set(6.7, 4.6, 7.8)

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.06
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.setAttribute('aria-label', 'Interactive metric 3D workshop scene')
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.075
    controls.zoomToCursor = true
    controls.target.set(0, 0.85, 0)
    controls.minDistance = 3.6
    controls.maxDistance = 16
    controls.maxPolarAngle = Math.PI * 0.48

    scene.add(new THREE.HemisphereLight('#ccecff', '#171311', 1.45))
    const keyLight = new THREE.DirectionalLight('#fff3dc', 3.1)
    keyLight.position.set(4.5, 7, 5)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(1536, 1536)
    keyLight.shadow.camera.left = -7
    keyLight.shadow.camera.right = 7
    keyLight.shadow.camera.top = 7
    keyLight.shadow.camera.bottom = -7
    scene.add(keyLight)
    const rimLight = new THREE.PointLight('#65c8ff', 19, 12, 2)
    rimLight.position.set(-4, 3.2, -3)
    scene.add(rimLight)

    const grid = new THREE.GridHelper(20, 40, '#45515b', '#242a2f')
    grid.position.y = 0.006
    grid.material.transparent = true
    grid.material.opacity = 0.48
    scene.add(grid)

    const stage = new THREE.Mesh(
      new THREE.CylinderGeometry(5.45, 5.45, 0.08, 80),
      new THREE.MeshStandardMaterial({ color: '#11161a', roughness: 0.82, metalness: 0.12 })
    )
    stage.position.y = -0.06
    stage.receiveShadow = true
    scene.add(stage)

    const roots = new Map()
    const pickables = new Set()
    const edges = new THREE.Group()
    const world = new THREE.Group()
    world.name = 'Atlas_Editable_World'
    scene.add(world, edges)

    const createRoot = (id, position = [0, 0, 0], meta = OBJECT_META[id]) => {
      const group = new THREE.Group()
      group.name = id
      group.userData.rootId = id
      group.userData.meta = { ...(meta || { name: id, type: 'Scene object', confidence: 'Imported', locked: false }), visible: true }
      group.position.set(...position)
      roots.set(id, group)
      world.add(group)
      return group
    }

    const addMesh = (root, geometry, materialOptions, position, rotation = [0, 0, 0], parent = root) => {
      const material = new THREE.MeshStandardMaterial({
        color: materialOptions.color,
        roughness: materialOptions.roughness ?? 0.62,
        metalness: materialOptions.metalness ?? 0.14,
        transparent: true,
      })
      material.userData.baseColor = material.color.getHex()
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(...position)
      mesh.rotation.set(...rotation)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData.rootId = root.userData.rootId
      parent.add(mesh)
      pickables.add(mesh)

      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 24),
        new THREE.LineBasicMaterial({ color: '#88a6b4', transparent: true, opacity: 0.16 })
      )
      edge.position.copy(mesh.position)
      edge.rotation.copy(mesh.rotation)
      edge.userData.rootId = root.userData.rootId
      parent.add(edge)
      edge.userData.isEdge = true
      return mesh
    }

    const floor = createRoot('floor')
    const floorMesh = addMesh(floor, new THREE.BoxGeometry(9.1, 0.09, 6.6), { color: '#171b1e', roughness: 0.94 }, [0, 0, 0])
    floorMesh.receiveShadow = true

    const bench = createRoot('workbench', [0.15, 0, 0.25])
    addMesh(bench, roundedBox(3.45, 0.15, 1.38, 0.07), { color: '#766257', roughness: 0.72 }, [0, 1.08, 0])
    ;[[-1.45, 0.54, -0.5], [1.45, 0.54, -0.5], [-1.45, 0.54, 0.5], [1.45, 0.54, 0.5]].forEach(pos => {
      addMesh(bench, new THREE.BoxGeometry(0.11, 1.02, 0.11), { color: '#3c4448', metalness: 0.72, roughness: 0.3 }, pos)
    })
    addMesh(bench, new THREE.BoxGeometry(2.9, 0.055, 0.06), { color: '#596066', metalness: 0.65 }, [0, 0.5, -0.53])

    const robot = createRoot('robot', [0.78, 1.16, 0.18])
    addMesh(robot, new THREE.CylinderGeometry(0.31, 0.38, 0.18, 28), { color: '#5e6b72', metalness: 0.72, roughness: 0.28 }, [0, 0.09, 0])
    const shoulder = new THREE.Group()
    shoulder.position.set(0, 0.24, 0)
    shoulder.rotation.z = -0.48
    robot.add(shoulder)
    addMesh(robot, roundedBox(0.28, 1.18, 0.28, 0.09), { color: '#b8c0c4', metalness: 0.4, roughness: 0.32 }, [0, 0.59, 0], [0, 0, 0], shoulder)
    const elbow = new THREE.Group()
    elbow.position.set(0, 1.18, 0)
    elbow.rotation.z = -1.02
    shoulder.add(elbow)
    addMesh(robot, roundedBox(0.24, 0.92, 0.24, 0.08), { color: '#8e999f', metalness: 0.45, roughness: 0.3 }, [0, 0.46, 0], [0, 0, 0], elbow)
    addMesh(robot, new THREE.SphereGeometry(0.25, 24, 16), { color: '#6ec7e5', metalness: 0.3, roughness: 0.28 }, [0, 0.24, 0])
    addMesh(robot, new THREE.SphereGeometry(0.21, 24, 16), { color: '#6ec7e5', metalness: 0.3, roughness: 0.28 }, [0, 1.18, 0], [0, 0, 0], shoulder)
    addMesh(robot, new THREE.SphereGeometry(0.15, 20, 14), { color: '#86d6ed', metalness: 0.35, roughness: 0.25 }, [0, 0.94, 0], [0, 0, 0], elbow)
    addMesh(robot, new THREE.BoxGeometry(0.08, 0.34, 0.08), { color: '#c2c9cc', metalness: 0.55, roughness: 0.28 }, [-0.1, 1.09, 0], [0, 0, -0.18], elbow)
    addMesh(robot, new THREE.BoxGeometry(0.08, 0.34, 0.08), { color: '#c2c9cc', metalness: 0.55, roughness: 0.28 }, [0.1, 1.09, 0], [0, 0, 0.18], elbow)

    const crate = createRoot('crate', [-2.02, 0, 0.7])
    addMesh(crate, roundedBox(1.02, 0.78, 0.92, 0.05), { color: '#665445', roughness: 0.84 }, [0, 0.43, 0])
    for (let i = -1; i <= 1; i += 1) addMesh(crate, new THREE.BoxGeometry(0.06, 0.75, 0.95), { color: '#9b7959', roughness: 0.76 }, [i * 0.35, 0.43, 0])

    const shelf = createRoot('shelf', [-3.2, 0, -1.78])
    ;[-0.78, 0.78].forEach(x => addMesh(shelf, new THREE.BoxGeometry(0.09, 2.7, 0.62), { color: '#434c51', metalness: 0.68 }, [x, 1.35, 0]))
    ;[0.12, 0.92, 1.72, 2.52].forEach(y => addMesh(shelf, new THREE.BoxGeometry(1.65, 0.08, 0.68), { color: '#566168', metalness: 0.48 }, [0, y, 0]))
    ;[[-0.42, 0.52, 0], [0.38, 1.31, 0], [-0.3, 2.11, 0]].forEach((pos, index) => addMesh(shelf, roundedBox(0.55, 0.46, 0.48, 0.04), { color: index === 1 ? '#786653' : '#5a5149', roughness: 0.8 }, pos))

    const monitor = createRoot('monitor', [-0.72, 1.18, 0.2])
    addMesh(monitor, roundedBox(0.92, 0.56, 0.07, 0.05), { color: '#252d31', metalness: 0.52, roughness: 0.28 }, [0, 0.42, 0])
    const screen = addMesh(monitor, new THREE.PlaneGeometry(0.77, 0.42), { color: '#376d7e', metalness: 0.05, roughness: 0.18 }, [0, 0.42, 0.04])
    screen.material.emissive.set('#16445a'); screen.material.emissiveIntensity = 1.25
    addMesh(monitor, new THREE.BoxGeometry(0.08, 0.31, 0.08), { color: '#50595e', metalness: 0.65 }, [0, 0.04, 0])

    const scanner = createRoot('scanner', [2.45, 0, -1.5])
    addMesh(scanner, new THREE.CylinderGeometry(0.34, 0.42, 0.16, 26), { color: '#414b50', metalness: 0.7 }, [0, 0.12, 0])
    addMesh(scanner, new THREE.CylinderGeometry(0.055, 0.055, 1.85, 16), { color: '#77838a', metalness: 0.75 }, [0, 1.05, 0])
    const scannerHead = addMesh(scanner, roundedBox(0.7, 0.26, 0.35, 0.08), { color: '#858f94', metalness: 0.52 }, [0, 1.92, 0])
    scannerHead.rotation.y = -0.42
    const scanCone = new THREE.Mesh(new THREE.ConeGeometry(1.05, 2.8, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#55c9f3', transparent: true, opacity: 0.045, side: THREE.DoubleSide, depthWrite: false }))
    scanCone.rotation.z = Math.PI
    scanCone.rotation.x = -0.18
    scanCone.position.set(-0.35, 0.65, 0.25)
    scanner.add(scanCone)

    const pathCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.4, 0.08, 2.2),
      new THREE.Vector3(-0.8, 0.08, 1.75),
      new THREE.Vector3(1.15, 0.08, 2.1),
      new THREE.Vector3(2.5, 0.08, 0.95),
      new THREE.Vector3(2.1, 0.08, -0.5),
    ])
    const pathGeometry = new THREE.BufferGeometry().setFromPoints(pathCurve.getPoints(100))
    const pathLine = new THREE.Line(pathGeometry, new THREE.LineDashedMaterial({ color: '#83d8f4', dashSize: 0.16, gapSize: 0.12, transparent: true, opacity: 0.65 }))
    pathLine.computeLineDistances()
    scene.add(pathLine)
    const pathMarker = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshBasicMaterial({ color: '#bcecff' }))
    scene.add(pathMarker)

    const relationGeometry = new THREE.BufferGeometry()
    const relationMaterial = new THREE.LineBasicMaterial({ color: '#8ccde3', transparent: true, opacity: 0.28 })
    const relationLines = new THREE.LineSegments(relationGeometry, relationMaterial)
    scene.add(relationLines)

    const pointPositions = new Float32Array(1500 * 3)
    for (let i = 0; i < 1500; i += 1) {
      pointPositions[i * 3] = (Math.random() - 0.5) * 8.8
      pointPositions[i * 3 + 1] = Math.random() * 3.2
      pointPositions[i * 3 + 2] = (Math.random() - 0.5) * 6.2
    }
    const pointCloudGeometry = new THREE.BufferGeometry()
    pointCloudGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3))
    const pointCloud = new THREE.Points(pointCloudGeometry, new THREE.PointsMaterial({ color: '#a9e7ff', size: 0.022, transparent: true, opacity: 0, depthWrite: false }))
    scene.add(pointCloud)

    const labelElements = new Map()
    const history = []
    const future = []
    let cloneIndex = 1

    const getAnchor = root => {
      const box = new THREE.Box3().setFromObject(root)
      if (box.isEmpty()) return root.getWorldPosition(new THREE.Vector3())
      const position = box.getCenter(new THREE.Vector3())
      position.y = box.max.y + 0.16
      return position
    }

    const sceneSnapshot = () => Array.from(roots.values()).sort((left, right) => {
      const leftIndex = ROOT_ORDER.indexOf(left.userData.rootId)
      const rightIndex = ROOT_ORDER.indexOf(right.userData.rootId)
      return (leftIndex < 0 ? 999 : leftIndex) - (rightIndex < 0 ? 999 : rightIndex)
    }).map(root => {
      const box = new THREE.Box3().setFromObject(root)
      const size = box.isEmpty() ? new THREE.Vector3() : box.getSize(new THREE.Vector3())
      const meta = root.userData.meta || {}
      return {
        id: root.userData.rootId,
        name: meta.name || root.name,
        type: meta.type || 'Scene object',
        confidence: meta.confidence || 'Imported',
        visible: root.visible,
        locked: Boolean(meta.locked),
        position: root.position.toArray().map(round),
        rotation: [degrees(root.rotation.x), degrees(root.rotation.y), degrees(root.rotation.z)],
        scale: root.scale.toArray().map(round),
        dimensions: size.toArray().map(round),
      }
    })

    const sceneStats = () => {
      let triangles = 0
      roots.forEach(root => root.traverse(child => {
        if (!child.isMesh || !child.geometry) return
        const count = child.geometry.index?.count ?? child.geometry.attributes.position?.count ?? 0
        triangles += count / 3
      }))
      return { objects: roots.size, triangles: Math.round(triangles) }
    }

    const emitScene = () => {
      onSceneChangeRef.current?.(sceneSnapshot())
      const nextStats = sceneStats()
      setStats(nextStats)
      onStatsChangeRef.current?.(nextStats)
    }

    const emitHistory = () => onHistoryChangeRef.current?.({ canUndo: history.length > 0, canRedo: future.length > 0 })

    const pushHistory = command => {
      history.push(command)
      if (history.length > 60) history.shift()
      future.length = 0
      emitHistory()
    }

    const createLabel = id => {
      if (labelElements.has(id)) return
      const label = document.createElement('button')
      label.type = 'button'
      label.className = 'studio-object-label'
      label.textContent = `${id.toUpperCase()}_01`
      label.addEventListener('click', () => onSelectRef.current?.(id))
      mount.appendChild(label)
      labelElements.set(id, label)
    }

    const removeLabel = id => {
      labelElements.get(id)?.remove()
      labelElements.delete(id)
    }

    const registerPickables = root => root.traverse(child => {
      child.userData.rootId = root.userData.rootId
      if (child.isMesh) {
        pickables.add(child)
        child.castShadow = true
        child.receiveShadow = true
        if (Array.isArray(child.material)) {
          child.material = child.material.map(material => material.clone())
          child.material.forEach(material => { if (material.color) material.userData.baseColor = material.color.getHex() })
        } else if (child.material) {
          child.material = child.material.clone()
          if (child.material.color) child.material.userData.baseColor = child.material.color.getHex()
        }
      }
    })

    const unregisterPickables = root => root.traverse(child => { if (child.isMesh) pickables.delete(child) })

    const attachRoot = root => {
      const id = root.userData.rootId
      roots.set(id, root)
      world.add(root)
      registerPickables(root)
      createLabel(id)
      emitScene()
    }

    const detachRoot = root => {
      const id = root.userData.rootId
      unregisterPickables(root)
      roots.delete(id)
      world.remove(root)
      removeLabel(id)
      emitScene()
    }

    roots.forEach((_, id) => createLabel(id))

    const transformControls = new TransformControls(camera, renderer.domElement)
    const transformHelper = transformControls.getHelper()
    transformControls.setSize(0.78)
    scene.add(transformHelper)
    let transformBefore = null
    let activeTool = tool

    const readTransform = root => ({
      position: root.position.toArray(),
      rotation: [root.rotation.x, root.rotation.y, root.rotation.z],
      scale: root.scale.toArray(),
    })

    const applyTransform = (root, state) => {
      root.position.fromArray(state.position)
      root.rotation.set(...state.rotation)
      root.scale.fromArray(state.scale)
      root.updateMatrixWorld(true)
      emitScene()
    }

    const selectRoot = id => {
      const root = roots.get(id)
      transformControls.detach()
      if (activeTool !== 'select' && root?.visible && !root.userData.meta?.locked) transformControls.attach(root)
    }

    transformControls.addEventListener('dragging-changed', event => { controls.enabled = !event.value })
    transformControls.addEventListener('mouseDown', () => {
      if (transformControls.object) transformBefore = readTransform(transformControls.object)
    })
    transformControls.addEventListener('objectChange', emitScene)
    transformControls.addEventListener('mouseUp', () => {
      const root = transformControls.object
      if (!root || !transformBefore) return
      const before = transformBefore
      const after = readTransform(root)
      transformBefore = null
      if (JSON.stringify(before) === JSON.stringify(after)) return
      pushHistory({
        undo: () => applyTransform(root, before),
        redo: () => applyTransform(root, after),
      })
    })

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let pointerDown = null
    const updatePointer = event => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    }
    const onPointerDown = event => { pointerDown = event.button === 0 ? { x: event.clientX, y: event.clientY } : null }
    const onPointerUp = event => {
      if (!pointerDown) return
      const movement = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y)
      pointerDown = null
      if (movement > 5) return
      updatePointer(event)
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(Array.from(pickables).filter(object => roots.get(object.userData.rootId)?.visible), false)[0]
      onSelectRef.current?.(hit?.object.userData.rootId || '')
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointerup', onPointerUp)

    const resize = () => {
      const width = mount.clientWidth
      const height = mount.clientHeight
      if (!width || !height) return
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)
    resize()

    const applyCamera = (type) => {
      if (type === 'top') {
        camera.position.set(0.01, 10.8, 0.01)
        controls.target.set(0, 0, 0)
        setCameraLabel('Top')
      } else if (type === 'front') {
        camera.position.set(0, 2.8, 9.5)
        controls.target.set(0, 1, 0)
        setCameraLabel('Front')
      } else {
        camera.position.set(6.7, 4.6, 7.8)
        controls.target.set(0, 0.85, 0)
        setCameraLabel('Perspective')
      }
      controls.update()
    }

    const frameSelected = () => {
      const root = roots.get(selectedRef.current)
      if (!root) return
      const box = new THREE.Box3().setFromObject(root)
      if (box.isEmpty()) return
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3()).length()
      const direction = camera.position.clone().sub(controls.target).normalize()
      camera.position.copy(center).add(direction.multiplyScalar(Math.max(size * 1.65, 2.5)))
      controls.target.copy(center)
      controls.update()
    }

    const setTool = nextTool => {
      activeTool = ['select', 'translate', 'rotate', 'scale'].includes(nextTool) ? nextTool : 'select'
      if (activeTool === 'select') {
        transformControls.detach()
        return
      }
      transformControls.setMode(activeTool)
      selectRoot(selectedRef.current)
    }
    const setSpace = nextSpace => transformControls.setSpace(nextSpace === 'local' ? 'local' : 'world')

    const setSnap = enabled => {
      transformControls.setTranslationSnap(enabled ? 0.25 : null)
      transformControls.setRotationSnap(enabled ? THREE.MathUtils.degToRad(15) : null)
      transformControls.setScaleSnap(enabled ? 0.1 : null)
    }

    const cloneSelected = () => {
      const source = roots.get(selectedRef.current)
      if (!source) return null
      let id
      do { id = `${source.userData.rootId}-copy-${cloneIndex++}` } while (roots.has(id))
      const clone = source.clone(true)
      clone.name = id
      clone.userData.rootId = id
      clone.userData.meta = { ...source.userData.meta, name: `${source.userData.meta?.name || source.name} copy`, locked: false }
      clone.position.x += 0.55
      clone.position.z += 0.45
      attachRoot(clone)
      onSelectRef.current?.(id)
      pushHistory({
        undo: () => { detachRoot(clone); onSelectRef.current?.(source.userData.rootId) },
        redo: () => { attachRoot(clone); onSelectRef.current?.(id) },
      })
      return id
    }

    const deleteSelected = () => {
      const root = roots.get(selectedRef.current)
      if (!root || root.userData.meta?.locked) return false
      const previousId = root.userData.rootId
      transformControls.detach()
      detachRoot(root)
      const fallback = roots.keys().next().value || ''
      onSelectRef.current?.(fallback)
      pushHistory({
        undo: () => { attachRoot(root); onSelectRef.current?.(previousId) },
        redo: () => { detachRoot(root); onSelectRef.current?.(roots.keys().next().value || '') },
      })
      return true
    }

    const setVisible = (id, visible) => {
      const root = roots.get(id)
      if (!root || root.visible === visible) return
      const previous = root.visible
      const apply = value => {
        root.visible = value
        root.userData.meta.visible = value
        if (!value && transformControls.object === root) transformControls.detach()
        else if (value && selectedRef.current === id && !root.userData.meta.locked) transformControls.attach(root)
        emitScene()
      }
      apply(visible)
      pushHistory({ undo: () => apply(previous), redo: () => apply(visible) })
    }

    const setLocked = (id, locked) => {
      const root = roots.get(id)
      if (!root || Boolean(root.userData.meta.locked) === locked) return
      const previous = Boolean(root.userData.meta.locked)
      const apply = value => {
        root.userData.meta.locked = value
        if (value && transformControls.object === root) transformControls.detach()
        else if (!value && root.visible && selectedRef.current === id) transformControls.attach(root)
        emitScene()
      }
      apply(locked)
      pushHistory({ undo: () => apply(previous), redo: () => apply(locked) })
    }

    const renameObject = (id, name) => {
      const root = roots.get(id)
      const next = String(name || '').trim()
      if (!root || !next || root.userData.meta.name === next) return
      const previous = root.userData.meta.name
      const apply = value => { root.userData.meta.name = value; emitScene() }
      apply(next)
      pushHistory({ undo: () => apply(previous), redo: () => apply(next) })
    }

    const setTransformValue = (id, channel, axis, value) => {
      const root = roots.get(id)
      if (!root || root.userData.meta?.locked) return
      const before = readTransform(root)
      const index = { x: 0, y: 1, z: 2 }[axis]
      if (channel === 'position') root.position.setComponent(index, Number(value) || 0)
      if (channel === 'rotation') root.rotation[axis] = radians(value)
      if (channel === 'scale') root.scale.setComponent(index, Math.max(0.01, Number(value) || 0.01))
      root.updateMatrixWorld(true)
      const after = readTransform(root)
      if (JSON.stringify(before) === JSON.stringify(after)) return
      emitScene()
      pushHistory({ undo: () => applyTransform(root, before), redo: () => applyTransform(root, after) })
    }

    const undo = () => {
      const command = history.pop()
      if (!command) return
      command.undo()
      future.push(command)
      emitHistory()
    }

    const redo = () => {
      const command = future.pop()
      if (!command) return
      command.redo()
      history.push(command)
      emitHistory()
    }

    const exportRoot = () => {
      const root = world.clone(true)
      const removable = []
      root.traverse(child => {
        if (child.userData.isEdge || child.isLine) removable.push(child)
        if (!child.isMesh || !child.material) return
        if (Array.isArray(child.material)) child.material = child.material.map(material => material.clone())
        else child.material = child.material.clone()
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach(material => {
          if (material.userData.baseColor !== undefined && material.color) material.color.setHex(material.userData.baseColor)
          if (material.emissive) material.emissive.set('#000000')
          material.opacity = 1
          material.transparent = false
        })
      })
      removable.forEach(child => child.parent?.remove(child))
      root.updateMatrixWorld(true)
      return root
    }

    const exportScene = async format => {
      const root = exportRoot()
      if (format === 'glb') {
        const data = await new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: false, trs: true })
        downloadBlob(new Blob([data], { type: 'model/gltf-binary' }), 'atlas-scene.glb')
        return 'atlas-scene.glb'
      }
      const data = await new USDZExporter().parseAsync(root, { onlyVisible: false })
      if (format === 'usdz') {
        downloadBlob(new Blob([data], { type: 'model/vnd.usdz+zip' }), 'atlas-scene.usdz')
        return 'atlas-scene.usdz'
      }
      const files = unzipSync(new Uint8Array(data))
      const entry = Object.entries(files).find(([name]) => name.endsWith('.usda'))
      if (!entry) throw new Error('usd_export_failed')
      downloadBlob(new Blob([entry[1]], { type: 'model/vnd.usda' }), 'atlas-scene.usda')
      return 'atlas-scene.usda'
    }

    const importModel = async file => {
      const buffer = await file.arrayBuffer()
      const extension = file.name.split('.').pop()?.toLowerCase()
      let model
      if (extension === 'glb' || extension === 'gltf') {
        const source = extension === 'gltf' ? new TextDecoder().decode(buffer) : buffer
        const gltf = await new GLTFLoader().parseAsync(source, '')
        model = gltf.scene
      } else if (extension === 'obj') {
        model = new OBJLoader().parse(new TextDecoder().decode(buffer))
      } else if (extension === 'stl') {
        const geometry = new STLLoader().parse(buffer)
        geometry.computeVertexNormals()
        model = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#aab4b9', roughness: 0.68, metalness: 0.08 }))
      } else if (extension === 'ply') {
        const geometry = new PLYLoader().parse(buffer)
        geometry.computeVertexNormals()
        const hasVertexColors = Boolean(geometry.getAttribute('color'))
        model = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#aab4b9', vertexColors: hasVertexColors, roughness: 0.72, metalness: 0.04 }))
      } else {
        throw new Error('unsupported_model_format')
      }
      const base = (file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'model').replace(/^-|-$/g, '')
      let id = base
      let suffix = 2
      while (roots.has(id)) id = `${base}-${suffix++}`
      const root = new THREE.Group()
      root.name = id
      root.userData.rootId = id
      root.userData.meta = { name: file.name.replace(/\.[^.]+$/, ''), type: 'Imported model', confidence: 'Imported', locked: false, visible: true }
      root.add(model)
      const initialBox = new THREE.Box3().setFromObject(model)
      const size = initialBox.getSize(new THREE.Vector3())
      const longest = Math.max(size.x, size.y, size.z)
      if (longest > 3.2) model.scale.multiplyScalar(3.2 / longest)
      const normalizedBox = new THREE.Box3().setFromObject(model)
      model.position.y -= normalizedBox.min.y
      root.position.set(0, 0.06, 1.8)
      attachRoot(root)
      onSelectRef.current?.(id)
      pushHistory({
        undo: () => { detachRoot(root); onSelectRef.current?.(roots.keys().next().value || '') },
        redo: () => { attachRoot(root); onSelectRef.current?.(id) },
      })
      return id
    }

    const api = {
      applyCamera,
      frameSelected,
      select: selectRoot,
      setTool,
      setSpace,
      setSnap,
      cloneSelected,
      deleteSelected,
      setVisible,
      setLocked,
      renameObject,
      setTransformValue,
      undo,
      redo,
      exportScene,
      importModel,
      getSceneSnapshot: sceneSnapshot,
    }
    sceneApiRef.current = api
    if (import.meta.env.DEV) window.__ATLAS_STUDIO__ = api
    onReadyRef.current?.(api)
    setTool(tool)
    setSpace(transformSpace)
    setSnap(snapEnabled)
    selectRoot(selectedRef.current)
    emitScene()
    emitHistory()

    const clock = new THREE.Clock()
    let animationFrame
    const animate = () => {
      animationFrame = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()
      const currentMode = modeRef.current
      const currentSelected = selectedRef.current
      const currentLayers = layersRef.current

      controls.update()
      pathLine.visible = currentLayers.path
      pathMarker.visible = currentLayers.path && currentMode === 'Simulate'
      if (pathMarker.visible) pathMarker.position.copy(pathCurve.getPoint((elapsed * 0.085) % 1))

      shoulder.rotation.z = -0.48 + (currentMode === 'Simulate' ? Math.sin(elapsed * 0.85) * 0.18 : 0)
      elbow.rotation.z = -1.02 + (currentMode === 'Simulate' ? Math.sin(elapsed * 1.15 + 1) * 0.28 : 0)

      roots.forEach((root, id) => {
        root.traverse(child => {
          if (!child.isMesh || child === scanCone) return
          const isSelected = id === currentSelected
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach(material => {
            const baseColor = material.userData.baseColor
            if (material.color && currentMode === 'Objects' && SEMANTIC_COLORS[id]) material.color.set(SEMANTIC_COLORS[id])
            else if (material.color && baseColor !== undefined) material.color.setHex(baseColor)
            if (child !== screen && material.emissive) {
              material.emissive.set(isSelected ? ACCENT : '#000000')
              material.emissiveIntensity = isSelected ? 0.22 + Math.sin(elapsed * 2.4) * 0.04 : 0
            }
            material.transparent = true
            material.opacity = reconstructingRef.current ? 0.2 : 1
          })
        })
        root.traverse(child => {
          if (child.userData.isEdge) {
            child.visible = currentLayers.geometry
            child.material.color.set(id === currentSelected ? '#aee9ff' : '#78909b')
            child.material.opacity = id === currentSelected ? 0.65 : currentMode === 'Objects' ? 0.34 : 0.13
          }
        })
      })

      pointCloud.material.opacity += ((reconstructingRef.current ? 0.82 : 0) - pointCloud.material.opacity) * 0.08
      pointCloud.rotation.y = elapsed * 0.018

      if (currentMode === 'Reason' && roots.has(currentSelected)) {
        const start = getAnchor(roots.get(currentSelected))
        const positions = []
        roots.forEach((root, id) => {
          if (id !== currentSelected && root.visible) {
            const end = getAnchor(root)
            positions.push(start.x, start.y, start.z, end.x, end.y, end.z)
          }
        })
        relationGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        relationLines.visible = true
      } else relationLines.visible = false

      roots.forEach((root, id) => {
        const label = labelElements.get(id)
        if (!label) return
        label.hidden = !currentLayers.labels || !root.visible
        if (!currentLayers.labels || !root.visible) return
        const worldPosition = getAnchor(root)
        const projected = worldPosition.clone().project(camera)
        label.style.transform = `translate(-50%,-50%) translate(${(projected.x * .5 + .5) * mount.clientWidth}px,${(-projected.y * .5 + .5) * mount.clientHeight}px)`
        label.classList.toggle('active', id === currentSelected)
        label.style.opacity = projected.z > 1 ? '0' : '1'
      })

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      controls.dispose()
      transformControls.detach()
      transformControls.dispose()
      scene.remove(transformHelper)
      scene.traverse(object => {
        object.geometry?.dispose()
        if (Array.isArray(object.material)) object.material.forEach(material => material.dispose())
        else object.material?.dispose()
      })
      labelElements.forEach(label => label.remove())
      renderer.dispose()
      renderer.domElement.remove()
      sceneApiRef.current = null
      if (import.meta.env.DEV && window.__ATLAS_STUDIO__ === api) delete window.__ATLAS_STUDIO__
      onReadyRef.current?.(null)
    }
  }, [])

  return (
    <div className="studio-canvas-wrap" ref={mountRef}>
      <div className="studio-view-controls" aria-label="Camera views">
        <span>{cameraLabel}</span>
        <button type="button" onClick={() => sceneApiRef.current?.applyCamera('perspective')}>Orbit</button>
        <button type="button" onClick={() => sceneApiRef.current?.applyCamera('front')}>Front</button>
        <button type="button" onClick={() => sceneApiRef.current?.applyCamera('top')}>Top</button>
      </div>
      <div className="studio-canvas-help">Drag to orbit · Scroll to zoom · Click an object to inspect</div>
      <div className="studio-scene-stats"><span>{stats.objects} objects</span><span>{stats.triangles.toLocaleString()} triangles</span><span>Metric scene</span></div>
      {sourceImage && <div className="studio-source-chip"><span>Source linked</span><img src={sourceImage} alt="" /></div>}
    </div>
  )
}

export default StudioViewport
