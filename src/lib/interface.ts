export interface BoundariesInterface {
  centerX: number
  centerY: number
  size: number
}

export interface CentreOfMass {
  massX: number
  massY: number
  mass: number
}

export interface Body extends CentreOfMass {
  xSpeed: number
  ySpeed: number
}

export abstract class QuadBase implements CentreOfMass, BoundariesInterface {
  massX: number
  massY: number
  mass: number
  centerX: number
  centerY: number
  size: number
  total: number

  constructor(props: {
    massX: number
    massY: number
    mass: number
    centerX: number
    centerY: number
    size: number
    total: number
  }) {
    this.massX = props.massX
    this.massY = props.massY
    this.mass = props.mass
    this.centerX = props.centerX
    this.centerY = props.centerY
    this.size = props.size
    this.total = props.total
  }

  abstract insert(body: CentreOfMass): unknown
}

export interface ForkInterface {
  nw: QuadBase
  ne: QuadBase
  sw: QuadBase
  se: QuadBase
}

export class Boundaries implements BoundariesInterface {
  xMin: number
  yMin: number
  xMax: number
  yMax: number
  // prettier-ignore
  get width(): number { return this.xMax - this.xMin }
  // prettier-ignore
  get height(): number { return this.yMax - this.yMin }
  // prettier-ignore
  get size(): number { return Math.max(this.width, this.height) }
  // prettier-ignore
  get centerX(): number { return this.xMin + this.width / 2 }
  // prettier-ignore
  get centerY(): number { return this.yMin + this.height / 2 }

  constructor(xMin: number, yMin: number, xMax: number, yMax: number) {
    this.xMin = xMin
    this.yMin = yMin
    this.xMax = xMax
    this.yMax = yMax
  }
}
