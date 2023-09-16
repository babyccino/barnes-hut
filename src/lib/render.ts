import { GALAXY } from "./galaxy"
import { Body, BoundariesInterface, CentreOfMass } from "./interface"
import { Line, getAllLines, getLines } from "./lines"
import { Poolable, acquire, free } from "./pool"
import {
  Fork,
  Leaf,
  Quad,
  createQuadAndInsertBodies,
  eliminateOutliers,
  getBoundaries,
  getQuadForBody,
  standardNBody,
  update,
  willCalc,
} from "./simulation"
import { getQuadrant } from "./util"

export const SVGNS = "http://www.w3.org/2000/svg"

export interface SvgNode extends Body {
  el: SVGCircleElement
  color: string
}

export function createNode(
  svg: SVGSVGElement,
  node: Body,
  color: string,
  opacity: number,
  blackHole: boolean = false
): SvgNode {
  const el = document.createElementNS(SVGNS, "circle")
  el.setAttributeNS(null, "cx", node.massX.toString())
  el.setAttributeNS(null, "cy", node.massY.toString())
  el.setAttributeNS(null, "r", blackHole ? "8" : (node.mass * 4).toString())
  el.setAttributeNS(null, "fill", color)
  el.setAttributeNS(null, "opacity", opacity.toString())
  svg.appendChild(el)

  const newNode: SvgNode = Object.assign({ el, color }, node)

  return newNode
}

export function removeNodes(svg: SVGSVGElement, nodes: SvgNode[], count: number): void {
  while (count--) {
    const node = nodes.pop()
    if (!node) return
    svg.removeChild(node.el)
  }
}

export function renderLine(
  svg: SVGSVGElement,
  line: Line,
  horizontal: boolean,
  transverse: number,
  color: string,
  opacity: number
) {
  let x1, x2, y1, y2
  if (horizontal) {
    x1 = line[0]
    x2 = line[1]
    y1 = y2 = transverse
    y2 = transverse
  } else {
    x1 = transverse
    x2 = transverse
    y1 = line[0]
    y2 = line[1]
  }
  return renderLineSegment(svg, color, opacity, 2, x1, y1, x2, y2)
}

export function renderLineBetweenBodies(
  svg: SVGSVGElement,
  body1: CentreOfMass,
  body2: CentreOfMass,
  color: string,
  opacity: number
) {
  return renderLineSegment(
    svg,
    color,
    opacity,
    4,
    body1.massX,
    body1.massY,
    body2.massX,
    body2.massY
  )
}

export class LineSegment
  implements Poolable<[SVGSVGElement, string, number, number, number, number, number, number]>
{
  el: SVGLineElement

  constructor(
    svg: SVGSVGElement,
    color: string,
    opacity: number,
    strokeWidth: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) {
    this.el = document.createElementNS(SVGNS, "line")
    this.el.setAttributeNS(null, "stroke-dasharray", "4 6")
    this.set(svg, color, opacity, strokeWidth, x1, y1, x2, y2)
    svg.appendChild(this.el)
  }

  set(
    svg: SVGSVGElement,
    color: string,
    opacity: number,
    strokeWidth: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) {
    this.el.setAttributeNS(null, "x1", x1.toString())
    this.el.setAttributeNS(null, "x2", x2.toString())
    this.el.setAttributeNS(null, "y1", y1.toString())
    this.el.setAttributeNS(null, "y2", y2.toString())
    this.el.setAttributeNS(null, "opacity", opacity.toString())
    this.el.setAttributeNS(null, "stroke", color)
    this.el.setAttributeNS(null, "stroke-width", strokeWidth.toString())
  }

  free() {
    this.el.setAttributeNS(null, "opacity", "0")
    free(LineSegment, this)
  }
}
export function renderLineSegment(
  svg: SVGSVGElement,
  color: string,
  opacity: number,
  strokeWidth: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): LineSegment {
  return acquire(LineSegment, svg, color, opacity, strokeWidth, x1, y1, x2, y2)
}

class Rectangle implements Poolable<[SVGSVGElement, BoundariesInterface, string, number, boolean]> {
  el: SVGRectElement

  constructor(
    svg: SVGSVGElement,
    rectangle: BoundariesInterface,
    color: string,
    opacity: number,
    dashed: boolean = false
  ) {
    this.el = document.createElementNS(SVGNS, "rect")

    // static properties
    this.el.setAttributeNS(null, "fill-opacity", "0")
    this.el.setAttributeNS(null, "stroke-width", "2")

    this.el.setAttributeNS(null, "stroke", color)
    this.el.setAttributeNS(null, "opacity", opacity.toString())
    if (dashed) this.el.setAttributeNS(null, "stroke-dasharray", "4 6")

    this.set(svg, rectangle, color, opacity, dashed)
    svg.appendChild(this.el)
  }
  set(
    svg: SVGSVGElement,
    rectangle: BoundariesInterface,
    color: string,
    opacity: number,
    dashed: boolean = false
  ) {
    this.el.setAttributeNS(null, "x", (rectangle.centerX - rectangle.size / 2).toString())
    this.el.setAttributeNS(null, "y", (rectangle.centerY - rectangle.size / 2).toString())
    this.el.setAttributeNS(null, "height", rectangle.size.toString())
    this.el.setAttributeNS(null, "width", rectangle.size.toString())
    this.el.setAttributeNS(null, "opacity", opacity.toString())
    this.el.setAttributeNS(null, "stroke", color)
    if (dashed) this.el.setAttributeNS(null, "stroke-dasharray", "4 6")
    else this.el.removeAttributeNS(null, "stroke-dasharray")
  }
  free() {
    this.el.setAttributeNS(null, "opacity", "0")
    free(Rectangle, this)
  }
}
export function renderRectangle(
  svg: SVGSVGElement,
  rectangle: BoundariesInterface,
  color: string,
  opacity: number,
  dashed: boolean = false
): Rectangle {
  return acquire(Rectangle, svg, rectangle, color, opacity, dashed)
}

class Circle implements Poolable<[SVGSVGElement, CentreOfMass, string, number, number]> {
  el: SVGCircleElement

  constructor(
    svg: SVGSVGElement,
    body: CentreOfMass,
    color: string,
    opacity: number = 1,
    size: number = 0.7 * (body.mass - 1) + 4
  ) {
    this.el = document.createElementNS(SVGNS, "circle")
    this.set(svg, body, color, opacity, size)
    svg.appendChild(this.el)
  }
  set(
    svg: SVGSVGElement,
    body: CentreOfMass,
    color: string,
    opacity: number = 1,
    size: number = 0.7 * (body.mass - 1) + 4
  ) {
    this.el.setAttributeNS(null, "cx", body.massX.toString())
    this.el.setAttributeNS(null, "cy", body.massY.toString())
    this.el.setAttributeNS(null, "r", size.toString())
    this.el.setAttributeNS(null, "opacity", opacity.toString())
    this.el.setAttributeNS(null, "opacity", opacity.toString())
    this.el.setAttributeNS(null, "fill", color)
  }
  free() {
    this.el.setAttributeNS(null, "opacity", "0")
    free(Circle, this)
  }
}
export function renderCircle(
  svg: SVGSVGElement,
  body: CentreOfMass,
  color: string,
  opacity: number = 1,
  size: number = 0.7 * (body.mass - 1) + 4
): Circle {
  return acquire(Circle, svg, body, color, opacity, size)
}

function foundAddedQuad(
  newBody: Body,
  newQuad: Quad,
  addedQuads: BoundariesInterface[],
  depthLimit: number = Number.MAX_VALUE,
  depth: number = 0
): BoundariesInterface[] {
  if (!(newQuad instanceof Fork) || depth > depthLimit) return addedQuads

  addedQuads.push(newQuad)
  return foundAddedQuad(
    newBody,
    newQuad[getQuadrant(newBody, newQuad)],
    addedQuads,
    depthLimit,
    depth + 1
  )
}

export function newLines(
  newBody: Body,
  newQuad: Quad,
  oldQuad: Quad | null,
  depthLimit: number = Number.MAX_VALUE,
  depth: number = 0
): BoundariesInterface[] {
  if (!(newQuad instanceof Fork) || depth > depthLimit) return []
  // if we have reached a new fork add the lines
  // (because newquad is still a fork but the old one is no longer)
  // continue adding lines from here on in by making oldQuad null
  if (oldQuad === null || !(oldQuad instanceof Fork)) {
    return foundAddedQuad(newBody, newQuad, [], depthLimit, depth)
  }

  const quadrant = getQuadrant(newBody, newQuad)

  return newLines(newBody, newQuad[quadrant], oldQuad[quadrant], depthLimit, depth + 1)
}

export function highlightLastBody(
  svg: SVGSVGElement,
  bodies: Body[],
  clearableLines: Poolable<any>[]
): void {
  const body = bodies.at(-1)
  if (body === undefined) return

  const boundaries = getBoundaries(GALAXY)
  const quad = createQuadAndInsertBodies(
    boundaries.centerX,
    boundaries.centerY,
    boundaries.size,
    bodies
  )

  const [horizontalLines, verticalLines] = getAllLines(quad)
  horizontalLines.forEach((intervals, y) => {
    intervals.forEach(line => clearableLines.push(renderLine(svg, line, true, y, "grey", 0.5)))
  })
  verticalLines.forEach((intervals, x) => {
    intervals.forEach(line => clearableLines.push(renderLine(svg, line, false, x, "grey", 0.5)))
  })

  const leaf = getQuadForBody(body, quad) as Leaf
  clearableLines.push(renderRectangle(svg, leaf, "red", 1))
  clearableLines.push(
    renderCircle(svg, { ...body, mass: (body.mass > 2 ? 8 : body.mass) * 4 }, "red", 1)
  )
  quad.free()
}

export function animateStandardNBody(svg: SVGSVGElement, nodes: SvgNode[]): SvgNode[] {
  return nodes.map(node => {
    const newNode = standardNBody(node, nodes)

    node.el.setAttributeNS(null, "cx", node.massX.toString())
    node.el.setAttributeNS(null, "cy", node.massY.toString())

    return Object.assign(node, newNode)
  })
}

export function animatePoints(svg: SVGSVGElement, nodes: SvgNode[], quad: Quad): SvgNode[] {
  // remove svg elements if node is to be removed
  const pred = eliminateOutliers(quad)
  nodes.forEach(node => !pred(node) && svg.removeChild(node.el))

  // filter nodes then animate them
  return nodes.filter(pred).map(node => {
    const newNode = update(node, quad)

    node.el.setAttributeNS(null, "cx", newNode.massX.toString())
    node.el.setAttributeNS(null, "cy", newNode.massY.toString())

    return Object.assign(node, newNode)
  })
}

export function animateQuadTree(
  svg: SVGSVGElement,
  pooledObjs: Poolable<any>[],
  quad: Quad,
  node: CentreOfMass,
  theta: number
): void {
  /**
   * The z-index of svg elements relies on the order in which they are added
   * so to make sure the quads which are being calculated are rendered on top
   * the tree needs to be traversed once to render the quads which will not be calculated
   * and then again for the quads which will be traversed
   *  */
  const depthLimit = 100

  // first traverse
  const [horizontalLines, verticalLines] = getLines(quad, node, theta, depthLimit)
  horizontalLines.forEach((intervals, y) => {
    intervals.forEach(line => pooledObjs.push(renderLine(svg, line, true, y, "grey", 0.3)))
  })
  verticalLines.forEach((intervals, x) => {
    intervals.forEach(line => pooledObjs.push(renderLine(svg, line, false, x, "grey", 0.3)))
  })

  const secondTrav = (traversingQuad: Quad, depth: number = 0): void => {
    if (depth >= depthLimit) return

    if (traversingQuad instanceof Leaf && traversingQuad.bodies.includes(node)) return

    if (willCalc(traversingQuad, node, theta)) {
      if (!(traversingQuad instanceof Leaf))
        pooledObjs.push(renderRectangle(svg, traversingQuad, "red", 1))

      pooledObjs.push(renderCircle(svg, traversingQuad, "red", 1))
      pooledObjs.push(renderLineBetweenBodies(svg, traversingQuad, node, "red", 0.5))
    } else if (traversingQuad instanceof Fork) {
      secondTrav(traversingQuad.nw, depth + 1)
      secondTrav(traversingQuad.ne, depth + 1)
      secondTrav(traversingQuad.sw, depth + 1)
      secondTrav(traversingQuad.se, depth + 1)
    }
  }
  secondTrav(quad)
}
