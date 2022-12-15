import { SvgNode } from "../components/simulation"
import { Body, BoundariesInterface, CentreOfMass, QuadInterface } from "./interface"
import { Line } from "./lines"
import { Empty, Leaf, Quad, Fork } from "./simulation"
import { getQuadrant } from "./util"

export const SVGNS = "http://www.w3.org/2000/svg"

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
): SVGLineElement {
  const [x1, x2] = horizontal ? line : [transverse, transverse]
  const [y1, y2] = horizontal ? [transverse, transverse] : line

  return renderLineSegment(svg, [x1, y1, x2, y2], color, opacity)
}

export function renderLineBetweenBodies(
  svg: SVGSVGElement,
  body1: CentreOfMass,
  body2: CentreOfMass,
  color: string,
  opacity: number
): SVGLineElement {
  const line = [body1.massX, body1.massY, body2.massX, body2.massY] as const

  return renderLineSegment(svg, line, color, opacity)
}

export function renderLineSegment(
  svg: SVGSVGElement,
  line: readonly [number, number, number, number],
  color: string,
  opacity: number
): SVGLineElement {
  const el = document.createElementNS(SVGNS, "line")
  const [x1, y1, x2, y2] = line

  el.setAttributeNS(null, "x1", x1.toString())
  el.setAttributeNS(null, "x2", x2.toString())
  el.setAttributeNS(null, "y1", y1.toString())
  el.setAttributeNS(null, "y2", y2.toString())

  el.setAttributeNS(null, "stroke", color)
  el.setAttributeNS(null, "stroke-width", "1")
  el.setAttributeNS(null, "opacity", opacity.toString())
  el.setAttributeNS(null, "stroke-dasharray", "4 6")
  svg.appendChild(el)

  return el
}

export function renderRectangle(
  svg: SVGSVGElement,
  rectangle: BoundariesInterface,
  color: string,
  opacity: number,
  dashed: boolean = false
): SVGRectElement {
  const el = document.createElementNS(SVGNS, "rect")
  el.setAttributeNS(null, "x", (rectangle.centerX - rectangle.size / 2).toString())
  el.setAttributeNS(null, "y", (rectangle.centerY - rectangle.size / 2).toString())
  el.setAttributeNS(null, "height", rectangle.size.toString())
  el.setAttributeNS(null, "width", rectangle.size.toString())
  el.setAttributeNS(null, "stroke", color)
  el.setAttributeNS(null, "fill-opacity", "0")
  el.setAttributeNS(null, "stroke-width", "2")
  el.setAttributeNS(null, "opacity", opacity.toString())
  dashed && el.setAttributeNS(null, "stroke-dasharray", "4 6")
  svg.appendChild(el)

  return el
}

export function renderCircle(
  svg: SVGSVGElement,
  body: CentreOfMass,
  color: string,
  opacity: number = 1,
  size: number = 0.7 * (body.mass - 1) + 1
): SVGCircleElement {
  const el = document.createElementNS(SVGNS, "circle")
  el.setAttributeNS(null, "cx", body.massX.toString())
  el.setAttributeNS(null, "cy", body.massY.toString())
  el.setAttributeNS(null, "r", size.toString())
  el.setAttributeNS(null, "fill", color)
  el.setAttributeNS(null, "opacity", opacity.toString())
  svg.appendChild(el)
  return el
}

function foundAddedQuad(
  newBody: Body,
  newQuad: Quad,
  addedQuads: BoundariesInterface[]
): BoundariesInterface[] {
  if (!(newQuad instanceof Fork)) return addedQuads

  const newAddedQuads = [...addedQuads, newQuad]

  return foundAddedQuad(newBody, newQuad[getQuadrant(newBody, newQuad)], newAddedQuads)
}

export function newLines(
  newBody: Body,
  newQuad: Quad,
  oldQuad: Quad | null
): BoundariesInterface[] {
  if (!(newQuad instanceof Fork)) return []
  // if we have reached a new fork add the lines
  // (because newquad is still a fork but the old one is no longer)
  // continue adding lines from here on in by making oldQuad null
  if (oldQuad === null || !(oldQuad instanceof Fork)) {
    return foundAddedQuad(newBody, newQuad, [])
  }

  const quadrant = getQuadrant(newBody, newQuad)

  return newLines(newBody, newQuad[quadrant], oldQuad[quadrant])
}
