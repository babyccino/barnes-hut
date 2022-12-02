export interface CentreOfMass {
  massX: number
  massY: number
  mass: number
}

export interface Body extends CentreOfMass {
  xSpeed: number
  ySpeed: number
}

export abstract class QuadInterface implements CentreOfMass {
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
