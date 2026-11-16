import { useEffect, useRef } from 'react'
import { AmbientLight, DirectionalLight, Matrix4, OrthographicCamera, Plane, Raycaster, Scene, Vector2, Vector3, WebGLRenderer } from 'three'
import { bridgeY, fretY, makeGuitar, nutY, spacingAt, stringZ } from './guitar-scene-model'
import { stringNumbers, updateSweep, type Sweep, type SweepCursor } from './experience-strings'

export type GuitarSceneProps = {
  leftHanded: boolean; part: string | null; frets: (number | null)[]; struck: number[]; openOnly: boolean
  onPart: (id: string) => void; onPress: (string: number, fret: number) => void
  onPlay: (strings: number[], sweep?: Sweep) => void; onGesture: () => void
  onReady: () => void; onUnavailable: () => void
}

type Gesture = SweepCursor & {
  pointer: number; origin: Vector2; previous: Vector2; kind: 'turn' | 'sweep' | 'fret'; moved: boolean
  fret?: number; string?: number
}

function buildScene(canvas: HTMLCanvasElement, getProps: () => GuitarSceneProps) {
  const display = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
  const scene = new Scene()
  const camera = new OrthographicCamera(-1, 1, 1, -1, .1, 20)
  camera.position.z = 7
  const guitar = makeGuitar()
  scene.add(guitar.root, new AmbientLight(0xffffff, 1.65))
  const lamp = new DirectionalLight(0xffebda, 2.4)
  lamp.position.set(-2, 3, 4)
  scene.add(lamp)
  const rim = new DirectionalLight(0xa1baff, 1.7)
  rim.position.set(3, 0, -3)
  scene.add(rim)
  const ray = new Raycaster()
  const localMatrix = new Matrix4()
  const face = new Plane(new Vector3(0, 0, 1), -stringZ)
  let gesture: Gesture | null = null
  let ready = false

  function redraw() {
    if (!canvas.clientWidth || !canvas.clientHeight) return
    const { leftHanded, frets, struck, part } = getProps()
    guitar.root.scale.x = leftHanded ? -1 : 1
    guitar.decorate(frets, struck, part)
    try { display.render(scene, camera) }
    catch { getProps().onUnavailable(); return }
    if (!ready) { ready = true; getProps().onReady() }
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = canvas
    if (!width || !height) return
    display.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    display.setSize(width, height, false)
    const halfHeight = Math.max(2.56, 1.18 * height / width)
    camera.left = -halfHeight * width / height; camera.right = -camera.left
    camera.top = halfHeight; camera.bottom = -halfHeight
    camera.updateProjectionMatrix()
    redraw()
  }

  function localPoint(clientX: number, clientY: number) {
    const box = canvas.getBoundingClientRect()
    ray.setFromCamera(new Vector2((clientX - box.x) / box.width * 2 - 1, 1 - (clientY - box.y) / box.height * 2), camera)
    localMatrix.copy(guitar.root.matrixWorld).invert()
    const localRay = ray.ray.clone().applyMatrix4(localMatrix)
    return localRay.direction.z < 0 ? localRay.intersectPlane(face, new Vector3()) : null
  }

  function start(event: PointerEvent) {
    if (event.button !== 0 || gesture) return
    const point = localPoint(event.clientX, event.clientY)
    const { part, openOnly } = getProps()
    const origin = new Vector2(event.clientX, event.clientY)
    gesture = { pointer: event.pointerId, origin, previous: origin.clone(), kind: 'turn', moved: false, position: 0, direction: 0, struck: 0 }
    if (part === null && point) {
      const position = point.x / spacingAt(point.y) + 3
      const string = stringNumbers[Math.floor(position)]
      if (point.y >= bridgeY && point.y < fretY(12) && position > -1 && position < 7) {
        Object.assign(gesture, { kind: 'sweep', position, string })
        getProps().onGesture()
      } else if (string && point.y < nutY && !openOnly) {
        const fret = Array.from({ length: 12 }, (_, index) => index + 1).find(fret => point.y >= fretY(fret))
        if (fret) Object.assign(gesture, { kind: 'fret', string, fret })
      }
    }
    canvas.setPointerCapture(event.pointerId)
  }

  function move(event: PointerEvent) {
    if (!gesture || gesture.pointer !== event.pointerId) return
    const current = new Vector2(event.clientX, event.clientY)
    if (current.distanceTo(gesture.origin) > 4) gesture.moved = true
    if (!gesture.moved) return
    if (gesture.kind === 'turn') {
      rotate((current.x - gesture.previous.x) * .016, (current.y - gesture.previous.y) * .012)
    } else if (gesture.kind === 'sweep' && !getProps().openOnly) {
      const point = localPoint(event.clientX, event.clientY)
      if (point) {
        const y = Math.max(bridgeY, Math.min(fretY(12), point.y))
        const props = getProps()
        const crossed = updateSweep(gesture, point.x / spacingAt(y) + 3, stringNumbers, props.frets)
        if (crossed.strings.length) props.onPlay(crossed.strings, { gesture: true, startedAt: crossed.startedAt })
      }
    }
    gesture.previous = current
  }

  function end(event: PointerEvent) {
    if (!gesture || gesture.pointer !== event.pointerId) return
    if (gesture.kind === 'sweep') getProps().onGesture()
    move(event)
    const finished = gesture
    gesture = null
    if (finished.moved) return
    const props = getProps()
    if (finished.kind === 'sweep' && finished.string) props.onPlay([finished.string])
    if (finished.kind === 'fret' && finished.string && finished.fret) props.onPress(finished.string, finished.fret)
    if (props.part !== null && localPoint(event.clientX, event.clientY)) {
      const hit = ray.intersectObjects(guitar.markers.map(({ point }) => point))[0]
      const marker = guitar.markers.find(({ point }) => point === hit?.object)
      if (marker) props.onPart(marker.id)
    }
  }

  const cancel = (event: PointerEvent) => { if (gesture?.pointer === event.pointerId) gesture = null }
  function rotate(yaw: number, tilt = 0) {
    guitar.root.rotation.y += yaw
    guitar.root.rotation.x = Math.max(-.75, Math.min(.75, guitar.root.rotation.x + tilt))
    redraw()
  }
  function zoom(ratio: number) {
    camera.zoom = Math.max(.8, Math.min(2.4, camera.zoom * ratio))
    camera.updateProjectionMatrix()
    redraw()
  }
  function reset() {
    guitar.root.rotation.set(-.09, .20, .075)
    camera.zoom = 1
    camera.updateProjectionMatrix()
    redraw()
  }
  const wheel = (event: WheelEvent) => { event.preventDefault(); zoom(event.deltaY < 0 ? 1.08 : 1 / 1.08) }
  const lost = (event: Event) => { event.preventDefault(); getProps().onUnavailable() }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  canvas.addEventListener('pointerdown', start)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', end)
  canvas.addEventListener('pointercancel', cancel)
  canvas.addEventListener('lostpointercapture', cancel)
  canvas.addEventListener('wheel', wheel, { passive: false })
  canvas.addEventListener('webglcontextlost', lost)
  guitar.root.rotation.set(-.09, .20, .075)
  resize()

  return {
    redraw, rotate, zoom, reset,
    dispose() {
      resizeObserver.disconnect()
      canvas.removeEventListener('pointerdown', start)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', end)
      canvas.removeEventListener('pointercancel', cancel)
      canvas.removeEventListener('lostpointercapture', cancel)
      canvas.removeEventListener('wheel', wheel)
      canvas.removeEventListener('webglcontextlost', lost)
      guitar.dispose()
      display.dispose()
    },
  }
}

export default function GuitarScene(props: GuitarSceneProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const propsRef = useRef(props)
  const view = useRef<ReturnType<typeof buildScene> | null>(null)
  propsRef.current = props

  useEffect(() => {
    if (!canvas.current) return
    try { view.current = buildScene(canvas.current, () => propsRef.current) }
    catch { propsRef.current.onUnavailable() }
    return () => { view.current?.dispose(); view.current = null }
  }, [])
  useEffect(() => { view.current?.redraw() }, [props.leftHanded, props.frets, props.struck, props.part])

  return <div className="experience-3d-stage">
    <canvas ref={canvas} role="img" aria-label="木吉他 3D 琴面" />
    <div className="experience-3d-controls segmented" role="group" aria-label="3D 操作">
      <button type="button" onClick={() => view.current?.rotate(-.28)}>左转</button>
      <button type="button" onClick={() => view.current?.rotate(.28)}>右转</button>
      <button type="button" onClick={() => view.current?.zoom(1.18)}>放大</button>
      <button type="button" onClick={() => view.current?.zoom(1 / 1.18)}>缩小</button>
      <button type="button" onClick={() => view.current?.reset()}>复位</button>
    </div>
    <p className="experience-instruction">{props.part === null ? '点指板按弦，在音孔附近点弦或横划。拖动琴身外侧旋转。' : '拖动旋转，点琴上的标记认识部位。'}</p>
  </div>
}
