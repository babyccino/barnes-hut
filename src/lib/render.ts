import { SvgNode } from "../components/simulation"
import { Body, CentreOfMass } from "./interface"
import { Line } from "./lines"
import { Quad } from "./simulation"

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
  quad: Quad,
  color: string,
  opacity: number
): SVGRectElement {
  const el = document.createElementNS(SVGNS, "rect")
  el.setAttributeNS(null, "x", (quad.centerX - quad.size / 2).toString())
  el.setAttributeNS(null, "y", (quad.centerY - quad.size / 2).toString())
  el.setAttributeNS(null, "height", quad.size.toString())
  el.setAttributeNS(null, "width", quad.size.toString())
  el.setAttributeNS(null, "stroke", color)
  el.setAttributeNS(null, "fill-opacity", "0")
  el.setAttributeNS(null, "stroke-width", "2")
  el.setAttributeNS(null, "opacity", opacity.toString())
  svg.appendChild(el)

  return el
}

export function renderCircle(
  svg: SVGSVGElement,
  body: CentreOfMass,
  color: string,
  opacity: number = 1,
  size?: number
): SVGCircleElement {
  const el = document.createElementNS(SVGNS, "circle")
  el.setAttributeNS(null, "cx", body.massX.toString())
  el.setAttributeNS(null, "cy", body.massY.toString())
  el.setAttributeNS(null, "r", (size ?? 0.7 * (body.mass - 1) + 1).toString())
  el.setAttributeNS(null, "fill", color)
  el.setAttributeNS(null, "opacity", opacity.toString())
  svg.appendChild(el)
  return el
}
