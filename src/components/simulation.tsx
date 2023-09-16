import { HTMLProps, useEffect, useRef } from "react"

import { grey } from "src/lib/util"
import { GALAXY } from "../lib/galaxy"
import { BodyGraphic, animateQuadTree, renderCircle } from "../lib/render"
import {
  Quad,
  createQuadAndInsertBodies,
  eliminateOutliers,
  getBoundaries,
  update,
} from "../lib/simulation"

const IS_DEV = process.env.NODE_ENV === "development"

let TIME = 0
let FRAME_COUNTER = 0
let FRAME_SKIP = 15

const X_MAX = 2500
const Y_MAX = 2500

export default function Simulation({
  nodeCount,
  running,
  renderCalculatedQuads,
  theta,
  ...props
}: {
  nodeCount: number
  running: boolean
  renderCalculatedQuads: boolean
  theta: number
} & HTMLProps<HTMLCanvasElement>): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bodiesRef = useRef<BodyGraphic[]>([])
  const frame = useRef<number>(-1)
  const fpsRef = useRef<HTMLParagraphElement>(null)

  // rerender quadtree if animation stops
  useEffect(() => {
    if (running || !renderCalculatedQuads) return

    const canvas = canvasRef.current?.getContext("2d")
    if (!canvas) return
    const bodies = bodiesRef.current
    if (!bodies.length) return

    const boundaries = getBoundaries(bodies)
    const quad = createQuadAndInsertBodies(
      boundaries.centerX,
      boundaries.centerY,
      boundaries.size,
      bodies
    )
    const focusNode = bodies[0]

    canvas.clearRect(0, 0, X_MAX, Y_MAX)
    animateQuadTree(canvas, quad, focusNode, theta)
    renderCircle(canvas, focusNode, "grey", 5)
    quad.free()
  }, [running, renderCalculatedQuads])

  // change node opacity when estimation graphic is visible
  // useEffect(() => {
  //   bodiesRef.current.forEach(body =>
  //     body.el.setAttributeNS(null, "opacity", (renderCalculatedQuads ? 0.4 : 1).toString())
  //   )
  // }, [renderCalculatedQuads])

  // animation loop
  useEffect(() => {
    window.cancelAnimationFrame(frame.current - 1)
    window.cancelAnimationFrame(frame.current)

    if (!running || !canvasRef.current) return

    const renderLoop = (time: number) => {
      if (IS_DEV && fpsRef.current && FRAME_COUNTER && FRAME_COUNTER % FRAME_SKIP === 0) {
        fpsRef.current.innerText = ((1000 * FRAME_SKIP) / (time - TIME)).toPrecision(3).toString()
        TIME = time
        FRAME_COUNTER = 0
      }
      ++FRAME_COUNTER

      const canvas = canvasRef.current?.getContext("2d")
      if (!canvas) return
      const bodies = bodiesRef.current
      if (!bodies.length) return

      const boundaries = getBoundaries(bodies)
      const quad = createQuadAndInsertBodies(
        boundaries.centerX,
        boundaries.centerY,
        boundaries.size,
        bodies
      )
      const focusNode = bodies[0]

      canvas.clearRect(0, 0, 2500, 2500)
      bodiesRef.current = updateBodies(bodies, quad)
      drawBodies(canvas, bodiesRef.current)

      // Quadtree rendering
      if (renderCalculatedQuads) {
        animateQuadTree(canvas, quad, focusNode, theta)

        // Render again the node which the quadtree animation is focusing on, so it
        // appears on top
        renderCircle(canvas, focusNode, grey(1), 5)
      }

      quad.free()
      frame.current = window.requestAnimationFrame(renderLoop)
    }
    frame.current = window.requestAnimationFrame(renderLoop)
  }, [running, renderCalculatedQuads, theta])

  // useEffect(() => {
  //   if (canvasRef.current && !renderCalculatedQuads) clearImpermanentElements(pooledObjsRef.current)
  // }, [renderCalculatedQuads])

  // stop animation
  useEffect(() => {
    if (!running) {
      window.cancelAnimationFrame(frame.current - 1)
      window.cancelAnimationFrame(frame.current)
      const canvas = canvasRef.current?.getContext("2d")
      if (!canvas) return
      drawBodies(canvas, bodiesRef.current)
    }
  }, [running])

  // reset system
  useEffect(() => {
    const canvas = canvasRef.current?.getContext("2d")
    canvas?.clearRect(0, 0, X_MAX, Y_MAX)
    const bodies = GALAXY.slice(0, nodeCount).map<BodyGraphic>(body => ({
      ...body,
      color: body.mass > 2 ? "black" : "grey",
      size: body.mass > 2 ? 20 : body.mass * 4,
    }))
    bodiesRef.current = bodies
    if (canvas) drawBodies(canvas, bodies)
  }, [nodeCount])

  if (IS_DEV)
    return (
      <>
        <canvas {...props} ref={canvasRef} height={Y_MAX} width={X_MAX} />
        <p
          ref={fpsRef}
          style={{ zIndex: 100, position: "fixed", right: 10, top: 10, fontSize: "2rem" }}
        >
          FPS
        </p>
      </>
    )
  return <canvas {...props} ref={canvasRef} height={Y_MAX} width={X_MAX} />
}

function drawBodies(canvas: CanvasRenderingContext2D, bodies: BodyGraphic[]) {
  for (const body of bodies) {
    renderCircle(canvas, body, body.color, body.size)
  }
}

function updateBodies(bodies: BodyGraphic[], quad: Quad): BodyGraphic[] {
  // filter bodies then animate them
  return bodies.filter(eliminateOutliers(quad)).map(body => {
    const newBody = update(body, quad)
    return Object.assign(newBody, { size: body.size, color: body.color })
  })
}
