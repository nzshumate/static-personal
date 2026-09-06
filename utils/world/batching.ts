import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Use only on static subtrees. Material objects remain shared, including their uniforms.
export const batchStaticGroup = (group: THREE.Group) => {
  group.updateMatrixWorld(true)
  const inverse = group.matrixWorld.clone().invert()
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>()
  const geometries = new Set<THREE.BufferGeometry>()
  const retained: THREE.Object3D[] = []
  group.traverse(child => {
    if (child === group) return
    if (!(child instanceof THREE.Mesh) || Array.isArray(child.material)) {
      if (!(child instanceof THREE.Group)) retained.push(child)
      return
    }
    const transform = inverse.clone().multiply(child.matrixWorld)
    const source = child.geometry.clone().applyMatrix4(transform)
    const geo = source.index ? source.toNonIndexed() : source
    if (geo !== source) source.dispose()
    // Authored procedural surfaces use position, not UV; normalize mixed primitives.
    geo.deleteAttribute('uv')
    const batch = batches.get(child.material) ?? []
    batch.push(geo); batches.set(child.material, batch)
    geometries.add(child.geometry)
  })
  const meshesBefore = [...batches.values()].reduce((total, geos) => total + geos.length, 0)
  const trianglesBefore = [...batches.values()].flat().reduce((total, geo) => total + geo.getAttribute('position').count / 3, 0)
  group.clear()
  batches.forEach((geos, mat) => {
    const merged = mergeGeometries(geos)
    if (merged) {
      const mesh = new THREE.Mesh(merged, mat)
      mesh.matrixAutoUpdate = false
      group.add(mesh)
    }
    geos.forEach(geo => geo.dispose())
  })
  geometries.forEach(geo => geo.dispose())
  retained.forEach(child => group.add(child))
  group.userData.staticBatch = { meshesBefore, meshesAfter: batches.size, trianglesBefore }
  return group
}
