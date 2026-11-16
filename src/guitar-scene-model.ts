import {
  BoxGeometry, CircleGeometry, CylinderGeometry, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, Path, RingGeometry, Shape, SphereGeometry, Vector3, type BufferGeometry, type Material,
} from 'three'

export const nutY = 1.65
export const bridgeY = -1.53
export const stringZ = .25
export const fretY = (fret: number) => bridgeY + (nutY - bridgeY) * 2 ** (-fret / 12)
export const spacingAt = (y: number) => .064 + .027 * ((nutY - y) / (nutY - bridgeY))
export const stringX = (index: number, y: number) => (index - 2.5) * spacingAt(y)

const hotspots: Record<string, [number, number]> = {
  head: [0, 2.18], tuners: [-.32, 1.99], nut: [0, nutY], neck: [.23, 1.34], fingerboard: [.12, 1.08],
  frets: [-.14, .75], strings: [0, -.23], body: [-.7, -1.87], soundhole: [0, -.61], bridge: [.34, -1.6], saddle: [0, bridgeY],
}

export function makeGuitar() {
  const root = new Group()
  const surfaces = new Set<Material>()
  const geometries = new Set<BufferGeometry>()
  function mesh(geometry: BufferGeometry, material: Material | Material[], x = 0, y = 0, z = 0) {
    const shape = new Mesh(geometry, material)
    shape.position.set(x, y, z)
    root.add(shape)
    geometries.add(geometry)
    for (const surface of Array.isArray(material) ? material : [material]) surfaces.add(surface)
    return shape
  }
  const timber = (color: number) => new MeshStandardMaterial({ color, roughness: .69 })
  const spruce = timber(0xeab578)
  const side = timber(0x864721)
  const walnut = timber(0x482d21)
  const edge = timber(0xf2d8ae)
  const steel = new MeshStandardMaterial({ color: 0xdce5ed, metalness: .35, roughness: .37 })
  const body = new Shape()
  body.moveTo(-.18, .40)
  body.bezierCurveTo(-.65, .46, -.87, .08, -.77, -.27)
  body.bezierCurveTo(-.70, -.48, -.59, -.57, -.66, -.78)
  body.bezierCurveTo(-.76, -1.06, -1.03, -1.17, -1.03, -1.64)
  body.bezierCurveTo(-1.03, -2.1, -.55, -2.26, 0, -2.26)
  body.bezierCurveTo(.55, -2.26, 1.03, -2.1, 1.03, -1.64)
  body.bezierCurveTo(1.03, -1.17, .76, -1.06, .66, -.78)
  body.bezierCurveTo(.59, -.57, .70, -.48, .77, -.27)
  body.bezierCurveTo(.87, .08, .65, .46, .18, .40)
  body.closePath()
  const soundhole = new Path()
  soundhole.absarc(0, -.61, .265, 0, Math.PI * 2, true)
  body.holes.push(soundhole)
  // The front is pierced for the sound hole. A recessed backing gives it visible depth.
  mesh(new ExtrudeGeometry(body, { depth: .44, bevelEnabled: true, bevelSize: .025, bevelThickness: .025, bevelSegments: 2, curveSegments: 15 }), [spruce, side], 0, 0, -.30)
  mesh(new CircleGeometry(.29, 36), timber(0x291c16), 0, -.61, -.26)
  mesh(new RingGeometry(.265, .30, 48), edge, 0, -.61, .149)
  mesh(new RingGeometry(.307, .32, 48), walnut, 0, -.61, .15)
  mesh(new BoxGeometry(.42, 1.68, .18), side, 0, .87, .02)
  mesh(new BoxGeometry(.43, 1.62, .072), walnut, 0, .84, .159)
  const head = new Shape()
  head.moveTo(-.19, 1.65)
  head.lineTo(-.26, 2.24)
  head.quadraticCurveTo(0, 2.31, .26, 2.24)
  head.lineTo(.19, 1.65)
  head.closePath()
  mesh(new ExtrudeGeometry(head, { depth: .15, bevelEnabled: false }), [walnut, side], 0, 0, .027)
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const y = 1.8 + i * .16
      mesh(new BoxGeometry(.15, .052, .051), steel, side * .26, y, .095)
      mesh(new BoxGeometry(.064, .09, .09), steel, side * .35, y, .095)
      mesh(new SphereGeometry(.028, 9, 6), steel, side * .15, y, .189)
    }
  }
  mesh(new BoxGeometry(.44, .035, .05), edge, 0, nutY, .207)
  mesh(new BoxGeometry(.67, .15, .095), walnut, 0, bridgeY - .035, .165)
  mesh(new BoxGeometry(.46, .024, .041), edge, 0, bridgeY, .221)
  for (let fret = 1; fret <= 12; fret++) {
    mesh(new BoxGeometry(.435, .014, .032), steel, 0, fretY(fret), .205)
    if ([3, 5, 7, 9, 12].includes(fret)) {
      const middle = (fretY(fret) + fretY(fret - 1)) / 2
      mesh(new CircleGeometry(.022, 12), edge, fret === 12 ? -.055 : 0, middle, .198)
      if (fret === 12) mesh(new CircleGeometry(.022, 12), edge, .055, middle, .198)
    }
  }

  const axis = new Vector3(0, 1, 0)
  function wire(start: Vector3, end: Vector3, index: number, material: MeshStandardMaterial) {
    const segment = new Vector3().subVectors(end, start)
    const radius = .009 - index * .0009
    const string = mesh(new CylinderGeometry(radius, radius, segment.length(), 7), material)
    string.position.addVectors(start, end).multiplyScalar(.5)
    string.quaternion.setFromUnitVectors(axis, segment.normalize())
  }
  const strings = Array.from({ length: 6 }, (_, i) => {
    const color = i < 3 ? 0xc99c62 : 0xdddfe8
    const material = new MeshStandardMaterial({ color, roughness: .42, metalness: .26 })
    const nut = new Vector3(stringX(i, nutY), nutY, stringZ)
    wire(new Vector3(stringX(i, bridgeY), bridgeY, stringZ), nut, i, material)
    wire(nut, new Vector3(i < 3 ? -.15 : .15, 1.8 + (i % 3) * .16, .20), i, material)
    return { color, material }
  })
  const pressedMaterial = new MeshBasicMaterial({ color: 0x98b4ff })
  const pressed = strings.map(() => mesh(new SphereGeometry(.028, 10, 8), pressedMaterial))
  const markers = Object.entries(hotspots).map(([id, [x, y]]) => {
    const material = new MeshBasicMaterial({ color: 0x91b0ff })
    const point = mesh(new SphereGeometry(.049, 12, 9), material, x, y, .31)
    return { id, point, material }
  })

  return {
    root,
    markers,
    decorate(frets: (number | null)[], struck: number[], part: string | null) {
      strings.forEach(({ color, material }, index) => {
        material.color.setHex(struck.includes(6 - index) ? 0x87a9ff : color)
        const fret = frets[index]
        pressed[index].visible = part === null && fret !== null && fret > 0
        if (fret !== null && fret > 0) {
          const y = (fretY(fret) + fretY(fret - 1)) / 2
          pressed[index].position.set(stringX(index, y), y, stringZ + .015)
        }
      })
      for (const { point, id, material } of markers) {
        point.visible = part !== null
        point.scale.setScalar(part === id ? 1.45 : 1)
        material.color.setHex(part === id ? 0xeff3ff : 0x597ff6)
      }
    },
    dispose() {
      for (const geometry of geometries) geometry.dispose()
      for (const material of surfaces) material.dispose()
    },
  }
}
