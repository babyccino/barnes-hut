import { Body, Boundaries, CentreOfMass, ForkInterface, QuadBase } from "./interface"
import { Poolable, acquire, free } from "./pool"
import { distance, getQuadrant, unitVector } from "./util"

export class Empty extends QuadBase implements Poolable<[number, number, number]> {
  constructor(centerX: number, centerY: number, size: number) {
    super({
      massX: centerX,
      massY: centerY,
      mass: 0,
      centerX,
      centerY,
      size,
      total: 0,
    })
  }

  set(centerX: number, centerY: number, size: number) {
    this.massX = centerX
    this.massY = centerY
    this.centerX = centerX
    this.centerY = centerY
    this.size = size
  }

  insert(body: CentreOfMass): Leaf {
    this.free()
    return acquire(Leaf, this.centerX, this.centerY, this.size, [body])
  }

  free() {
    free(Empty, this)
  }
}
export class Leaf extends QuadBase implements Poolable<[number, number, number, CentreOfMass[]]> {
  bodies: CentreOfMass[]

  constructor(centerX: number, centerY: number, size: number, bodies: CentreOfMass[]) {
    const [mass, massX, massY] = getMassCentre(bodies)

    super({
      massX,
      massY,
      mass,
      centerX,
      centerY,
      size,
      total: bodies.length,
    })

    this.bodies = bodies
  }

  set(centerX: number, centerY: number, size: number, bodies: CentreOfMass[]) {
    const [mass, massX, massY] = getMassCentre(bodies)

    this.massX = massX
    this.massY = massY
    this.mass = mass
    this.centerX = centerX
    this.centerY = centerY
    this.size = size
    this.bodies = bodies
    this.total = bodies.length
  }

  free() {
    free(Leaf, this)
  }

  update(): Leaf {
    ;[this.mass, this.massX, this.massY] = getMassCentre(this.bodies)
    return this
  }

  insert(body: CentreOfMass): Leaf | Fork {
    this.bodies.push(body)
    ++this.total
    if (this.size > MINIMUM_SIZE && this.bodies.length > 1) {
      this.free()
      return createForkAndInsertBodies(this.centerX, this.centerY, this.size, this.bodies)
    } else {
      return this.update()
    }
  }
}
export class Fork extends QuadBase implements ForkInterface, Poolable<[Quad, Quad, Quad, Quad]> {
  nw: Quad
  ne: Quad
  sw: Quad
  se: Quad

  constructor(nw: Quad, ne: Quad, sw: Quad, se: Quad) {
    const [mass, massX, massY] = getMassCentre(nw, ne, sw, se)
    super({
      massX,
      massY,
      mass,
      centerX: (nw.centerX + ne.centerX) / 2,
      centerY: (nw.centerY + sw.centerY) / 2,
      size: nw.size * 2,
      total: nw.total + ne.total + sw.total + se.total,
    })
    ;[this.nw, this.ne, this.sw, this.se] = [nw, ne, sw, se]
  }
  set(nw: Quad, ne: Quad, sw: Quad, se: Quad) {
    const [mass, massX, massY] = getMassCentre(nw, ne, sw, se)
    this.massX = massX
    this.massY = massY
    this.mass = mass
    this.centerX = (nw.centerX + ne.centerX) / 2
    this.centerY = (nw.centerY + sw.centerY) / 2
    this.size = nw.size * 2
    this.total = nw.total + ne.total + sw.total + se.total
    ;[this.nw, this.ne, this.sw, this.se] = [nw, ne, sw, se]
  }

  free() {
    this.nw.free()
    this.ne.free()
    this.sw.free()
    this.se.free()
    free(Fork, this)
  }

  update(): Fork {
    ;[this.mass, this.massX, this.massY] = getMassCentre(this.nw, this.ne, this.sw, this.se)
    return this
  }

  insert(body: CentreOfMass): Fork {
    ++this.total

    const quadrant = getQuadrant(body, this)
    this[quadrant] = this[quadrant].insert(body)

    return this.update()
  }
}
export type Quad = Empty | Leaf | Fork

export const GEE = 100
export const MINIMUM_SIZE = 0.0001
export const DELTA = 0.01
export const THETA = 0.5
const THRESHOLD = 1

export const force = (m1: number, m2: number, dist: number): number =>
  (GEE * m1 * m2) / (dist * dist)

export function addForce(body: CentreOfMass, otherBody: CentreOfMass): [number, number] {
  const dist = distance(body, otherBody)
  if (dist > THRESHOLD) {
    const dForce = force(body.mass, otherBody.mass, dist)
    const unit = unitVector(body, otherBody)
    return [dForce * unit[0], dForce * unit[1]]
  } else return [0, 0]
}

export function addForceToBody(
  body: Body,
  netXForce: number,
  netYForce: number,
  multiplier: number = 1
): Body {
  const massX = body.massX + body.xSpeed * DELTA * multiplier
  const massY = body.massY + body.ySpeed * DELTA * multiplier
  const xSpeed = body.xSpeed + (netXForce / body.mass) * DELTA * multiplier
  const ySpeed = body.ySpeed + (netYForce / body.mass) * DELTA * multiplier

  return { massX, massY, mass: body.mass, xSpeed, ySpeed }
}

export function standardNBody(body: Body, bodies: CentreOfMass[], multiplier: number): Body {
  let netXForce = 0
  let netYForce = 0
  for (const otherBody of bodies) {
    if (body === otherBody) continue
    const dForce = addForce(body, otherBody)
    netXForce += dForce[0]
    netYForce += dForce[1]
  }

  return addForceToBody(body, netXForce, netYForce, multiplier)
}

function getBodies(...bodies: any[]): CentreOfMass[] {
  if (Array.isArray(bodies[0])) {
    return bodies[0] as CentreOfMass[]
  } else {
    return bodies as CentreOfMass[]
  }
}

// returns [mass, massX, massY]
export function getMassCentre(bodies: CentreOfMass[]): [number, number, number]
export function getMassCentre(...bodies: CentreOfMass[]): [number, number, number]
export function getMassCentre(..._bodies: any[]): [number, number, number] {
  const bodies = getBodies(..._bodies)
  const mass = bodies.reduce((prev, body) => prev + body.mass, 0)
  const massX = bodies.reduce((prev, body) => prev + body.mass * body.massX, 0) / mass
  const massY = bodies.reduce((prev, body) => prev + body.mass * body.massY, 0) / mass
  return [mass, massX, massY]
}

export function getBoundaries(nodes: CentreOfMass[]): Boundaries {
  const [minX, minY, maxX, maxY] = nodes.reduce(
    (prev, curr) => [
      Math.min(prev[0], curr.massX),
      Math.min(prev[1], curr.massY),
      Math.max(prev[2], curr.massX),
      Math.max(prev[3], curr.massY),
    ],
    [Number.MAX_VALUE, Number.MAX_VALUE, Number.MIN_VALUE, Number.MIN_VALUE]
  )
  return new Boundaries(minX, minY, maxX, maxY)
}

const createEmptyFork = (x: number, y: number, size: number): Fork =>
  acquire(
    Fork,
    acquire(Empty, x - size / 4, y - size / 4, size / 2) as Empty,
    acquire(Empty, x + size / 4, y - size / 4, size / 2) as Empty,
    acquire(Empty, x - size / 4, y + size / 4, size / 2) as Empty,
    acquire(Empty, x + size / 4, y + size / 4, size / 2) as Empty
  )

export function createForkAndInsertBodies(
  x: number,
  y: number,
  size: number,
  bodies: CentreOfMass[]
): Fork {
  const newFork = createEmptyFork(x, y, size)
  return bodies.reduce<Fork>((fork, body) => fork.insert(body), newFork)
}

export function createQuadAndInsertBodies(
  x: number,
  y: number,
  size: number,
  bodies: CentreOfMass[]
): Quad {
  const newFork = acquire(Empty, x, y, size) as Empty
  return bodies.reduce<Quad>((quad, body) => quad.insert(body), newFork)
}

export function getQuadForBody(body: CentreOfMass, quad: Quad): Leaf | null {
  if (quad instanceof Fork) return getQuadForBody(body, quad[getQuadrant(body, quad)])
  else if (quad instanceof Leaf && quad.bodies.includes(body)) return quad
  else return null
}

export function update(body: Body, quad: Quad, multiplier: number = 1): Body {
  let netXForce = 0
  let netYForce = 0
  function traverse(quad: Quad, depth: number): void {
    if (quad instanceof Leaf) {
      for (const otherBody of quad.bodies) {
        if (otherBody === body) continue
        const dForce = addForce(body, otherBody)
        netXForce += dForce[0]
        netYForce += dForce[1]
      }
      return
    } else if (quad instanceof Fork) {
      // quad is of type Fork
      const dist = distance(quad, body)
      if (quad.size / dist < THETA) {
        const dForce = addForce(body, quad)
        netXForce += dForce[0]
        netYForce += dForce[1]
      } else {
        traverse(quad.nw, depth + 1)
        traverse(quad.ne, depth + 1)
        traverse(quad.sw, depth + 1)
        traverse(quad.se, depth + 1)
      }
    }
  }
  traverse(quad, 0)

  return addForceToBody(body, netXForce, netYForce, multiplier)
}

export const eliminateOutliers =
  (quad: QuadBase, threshold: number = 0.5) =>
  (body: Body) => {
    const dx = quad.massX - body.massX
    const dy = quad.massY - body.massY
    const d = Math.sqrt(dx * dx + dy * dy)
    // object is far away from the center of the mass
    if (d > threshold * quad.size) {
      const nx = dx / d
      const ny = dy / d
      const relativeSpeed = body.xSpeed * nx + body.ySpeed * ny
      // object is moving away from the center of the mass
      if (relativeSpeed < 0) {
        const escapeSpeed = Math.sqrt((2 * GEE * quad.mass) / d)
        // object has the espace velocity
        return !(-relativeSpeed > 2 * escapeSpeed)
      } else return true
    } else return true
  }

export const willCalc = (quad: Quad, body: CentreOfMass, theta: number = THETA): boolean =>
  (theta === 0 && quad instanceof Leaf) ||
  (!(quad instanceof Empty) && (quad instanceof Leaf || quad.size / distance(quad, body) < theta))
