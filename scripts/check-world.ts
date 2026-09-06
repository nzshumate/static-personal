const assert = (condition: unknown, message = 'Assertion failed') => { if (!condition) throw new Error(message) }
import * as THREE from 'three'
import { makeCabin, makePalm } from '../utils/world/details'
import { makeMushroom } from '../utils/world/actors'
import { makeRng } from '../utils/world/math'
import { batchStaticGroup } from '../utils/world/batching'

// Batching must preserve transformed bounds and live material references.
const root = new THREE.Group(), mat = new THREE.MeshStandardMaterial()
root.position.set(3, 2, -4)
const nested = new THREE.Group(); nested.position.set(1, 2, 3); root.add(nested)
for (let i=0;i<5;i++) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(.5,1,.7),mat)
  mesh.position.set(i*.7,0,i*.3);mesh.rotation.z=i*.2;nested.add(mesh)
}
const before = new THREE.Box3().setFromObject(root)
batchStaticGroup(root)
const after = new THREE.Box3().setFromObject(root)
assert(before.min.distanceTo(after.min)<1e-6 && before.max.distanceTo(after.max)<1e-6,'batch changed world-space bounds')
assert(root.children.length === 1)
assert((root.children[0] as THREE.Mesh).material === mat,'animated material reference must survive')
const random = makeRng(1234)
const stats = [makeCabin(),makePalm(random),makeMushroom(random)].map((group,i) => {
  const {meshesBefore,meshesAfter,trianglesBefore} = group.userData.staticBatch
  let trianglesAfter=0
  assert(meshesAfter < meshesBefore / 2,'static draw-call reduction must be substantial')
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    const positions=object.geometry.getAttribute('position')
    trianglesAfter+=positions.count/3
    for(let j=0;j<positions.array.length;j++)assert(Number.isFinite(positions.array[j]),'non-finite geometry')
  })
  assert(trianglesBefore === trianglesAfter,'batch must preserve every triangle')
  return {model:['cabin','palm','mushroom'][i],before:meshesBefore,after:meshesAfter}
})
console.table(stats)
console.log('PASS: static draw-call reduction, transformed bounds, material identity, finite geometry.')

// Regression: every snake body vertex follows the dune, not only the head.
const { makeSnake } = await import('../utils/world/actors')
const snake = makeSnake()
const ground = (x:number,z:number) => Math.sin(x*2)*.3+z*.15
for(const time of [0,3,8]) {
  snake.update(time,ground)
  const body=snake.group.children[0] as THREE.Mesh
  const vertices=body.geometry.getAttribute('position')
  for(let i=0;i<vertices.count;i++) {
    assert(vertices.getY(i)>=ground(vertices.getX(i),vertices.getZ(i))+.008,'snake must remain above the terrain along its entire body')
  }
}
console.log('PASS: snake terrain contact across animation poses.')
