import { useEffect, useRef, useCallback, SVGProps } from "react"
import { GALAXY } from "../lib/galaxy"
import { Body, CentreOfMass } from "../lib/interface"
import { getAllLines, getLines } from "../lib/lines"
import {
  createNode,
  renderCircle,
  renderLine,
  renderLineBetweenBodies,
  renderRectangle,
  SvgNode,
} from "../lib/render"
import {
  createQuadAndInsertBodies,
  eliminateOutliers,
  Fork,
  getBoundaries,
  getQuadForBody,
  Leaf,
  Quad,
  standardNBody,
  update,
  willCalc,
} from "../lib/simulation"
import { rand } from "../lib/util"

export default function Simulation({
  nodeCount,
  running,
  renderUncalcuatedQuads,
  renderCalculatedQuads,
  theta,
  ...props
}: {
  nodeCount: number
  running: boolean
  renderUncalcuatedQuads: boolean
  renderCalculatedQuads: boolean
  theta: number
} & SVGProps<SVGSVGElement>): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null)
  const nodesRef = useRef<SvgNode[]>([])
  const clearablesRef = useRef<SVGElement[]>([])
  const frame = useRef<number>(-1)

  const clearAndRenderQuad = useCallback(() => {
    if (!svgRef.current) return
    const svg = svgRef.current
    const nodes = nodesRef.current
    if (!nodes.length) return
    const clearables = clearablesRef.current

    const boundaries = getBoundaries(nodes)
    const quad = createQuadAndInsertBodies(
      boundaries.centerX,
      boundaries.centerY,
      boundaries.size,
      nodes
    )
    const focusNode = nodes[0]

    clearImpermanentElements(svg, clearables)
    animateQuadTree(svg, clearables, quad, focusNode, theta)
    clearables.push(renderCircle(svg, focusNode, focusNode.color, 1, 5))
  }, [theta])

  // rerender quadtree
  useEffect(() => {
    if (!running && renderCalculatedQuads) {
      clearAndRenderQuad()
    }
  }, [running, clearAndRenderQuad, renderCalculatedQuads])

  // change node opacity when estimation graphic is visible
  useEffect(() => {
    nodesRef.current.forEach(node =>
      node.el.setAttributeNS(null, "opacity", (renderCalculatedQuads ? 0.4 : 1).toString())
    )
  }, [renderCalculatedQuads])

  // animation loop
  useEffect(() => {
    window.cancelAnimationFrame(frame.current - 1)
    window.cancelAnimationFrame(frame.current)

    if (running && svgRef.current) {
      const renderLoop = () => {
        if (!svgRef.current) return
        const svg = svgRef.current
        const nodes = nodesRef.current
        if (!nodes.length) return
        const clearables = clearablesRef.current

        const boundaries = getBoundaries(nodes)
        const quad = createQuadAndInsertBodies(
          boundaries.centerX,
          boundaries.centerY,
          boundaries.size,
          nodes
        )
        const focusNode = nodes[0]

        nodesRef.current = animatePoints(svg, nodes, quad)

        clearImpermanentElements(svg, clearables)
        // Quadtree rendering
        if (renderCalculatedQuads) {
          animateQuadTree(svg, clearables, quad, focusNode, theta)

          // Render again the node which the quadtree animation is focusing on, so it
          // appears on top
          clearables.push(renderCircle(svg, focusNode, focusNode.color, 1, 5))
        }

        frame.current = window.requestAnimationFrame(renderLoop)
      }
      frame.current = window.requestAnimationFrame(renderLoop)
    }
  }, [running, renderUncalcuatedQuads, renderCalculatedQuads, theta])

  // stop animation
  useEffect(() => {
    if (!running) {
      window.cancelAnimationFrame(frame.current - 1)
      window.cancelAnimationFrame(frame.current)
    }
  }, [running])

  // reset system
  useEffect(() => {
    const svg = svgRef.current
    const clearables = clearablesRef.current
    fullClear(svg, nodesRef.current, clearables)

    if (!svg) return

    nodesRef.current = GALAXY.slice(0, nodeCount).map<SvgNode>(node =>
      node.mass > 2
        ? createNode(svg as SVGSVGElement, node, "black", 1, true)
        : createNode(svg as SVGSVGElement, node, "grey", 1)
    )
  }, [nodeCount])

  return <svg {...props} ref={svgRef} viewBox={`0 0 ${X_MAX} ${Y_MAX}`} />
}

function fullClear(svg: SVGSVGElement | null, nodes: SvgNode[], clearables: SVGElement[]): void {
  svg && (svg.innerHTML = "")
  clearables.splice(0, clearables.length)
  nodes.splice(0, nodes.length)
}

/**
 * Clear elements which exist for only one frame
 * @param svg
 * @param clearables
 */
function clearImpermanentElements(svg: SVGSVGElement, clearables: SVGElement[]): void {
  if (clearables.length) {
    clearables.forEach(el => svg.removeChild(el))
    clearables.splice(0, clearables.length)
  }
}

const range = (from: number, to: number): number[] =>
  Array.from(new Array(to - from), (_, i) => i + to)

const X_MAX = 2500
const Y_MAX = 2500

function randomlyDistributedPoints(svg: SVGSVGElement, nodes: SvgNode[], count: number): void {
  while (count--) {
    nodes.push(
      createNode(
        svg,
        {
          massX: rand(0, 2000),
          massY: rand(0, 2000),
          xSpeed: rand(-20, 20),
          ySpeed: rand(-20, 20),
          mass: 1,
        },
        "yellow",
        1
      )
    )
  }
}

function animateStandardNBody(svg: SVGSVGElement, nodes: SvgNode[]): SvgNode[] {
  return nodes.map(node => {
    const newNode = standardNBody(node, nodes)

    node.el.setAttributeNS(null, "cx", node.massX.toString())
    node.el.setAttributeNS(null, "cy", node.massY.toString())

    return Object.assign(node, newNode)
  })
}

function animatePoints(svg: SVGSVGElement, nodes: SvgNode[], quad: Quad): SvgNode[] {
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

function animateQuadTree(
  svg: SVGSVGElement,
  clearables: SVGElement[],
  quad: Quad,
  node: CentreOfMass,
  theta: number
): void {
  clearImpermanentElements(svg, clearables)

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
    intervals.forEach(line => clearables.push(renderLine(svg, line, true, y, "grey", 0.3)))
  })
  verticalLines.forEach((intervals, x) => {
    intervals.forEach(line => clearables.push(renderLine(svg, line, false, x, "grey", 0.3)))
  })

  const secondTrav = (traversingQuad: Quad, depth: number = 0): void => {
    if (depth >= depthLimit) return

    if (traversingQuad instanceof Leaf && traversingQuad.bodies.includes(node)) return

    if (willCalc(traversingQuad, node, theta)) {
      if (!(traversingQuad instanceof Leaf))
        clearables.push(renderRectangle(svg, traversingQuad, "red", 1))

      clearables.push(renderCircle(svg, traversingQuad, "red", 1))
      clearables.push(renderLineBetweenBodies(svg, traversingQuad, node, "red", 0.5))
    } else if (traversingQuad instanceof Fork) {
      secondTrav(traversingQuad.nw, depth + 1)
      secondTrav(traversingQuad.ne, depth + 1)
      secondTrav(traversingQuad.sw, depth + 1)
      secondTrav(traversingQuad.se, depth + 1)
    }
  }
  secondTrav(quad)
}
