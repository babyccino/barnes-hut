import { SVGProps, useEffect, useRef, useState } from "react"
import styles from "./quadtreeAnimation.module.scss"

import { GALAXY } from "../../lib/galaxy"
import { Boundaries, BoundariesInterface, CentreOfMass } from "../../lib/interface"
import { newLines } from "../../lib/render"
import { createQuadAndInsertBodies, Empty, Quad } from "../../lib/simulation"

const X_MAX = 2500
const Y_MAX = 2500

const padding = 15
const boundaries = new Boundaries(padding, padding, X_MAX - padding, Y_MAX - padding)

const bodyAnimationDuration = 0.7
const delayBetweenBodyAndLines = 0.3
const lineAnimationDuration = 1
const delayBeforeNextLoop = 0.5

type QuadAndDelay = BoundariesInterface & { delay: number }

export default function QuadtreeAnimation({
  stop,
  ...props
}: { stop?: boolean } & SVGProps<SVGSVGElement>): JSX.Element {
  const [bodies, setBodies] = useState<CentreOfMass[]>([])
  const [quads, setQuads] = useState<QuadAndDelay[]>([])
  const lastQuadRef = useRef<Quad>(new Empty(0, 0, 0))
  const timeoutRef = useRef<NodeJS.Timeout>()

  // animation loop
  useEffect(() => {
    // render first box
    const renderLoop = (i: number) => {
      if (i === GALAXY.length) return

      const bodies = GALAXY.slice(0, i + 1)
      const body = GALAXY[i]

      const newQuad = createQuadAndInsertBodies(
        boundaries.centerX,
        boundaries.centerY,
        boundaries.size,
        bodies
      )

      const addedQuads = newLines(body, newQuad, lastQuadRef.current, 4).map<QuadAndDelay>(
        (q, index) => ({
          ...q,
          delay: bodyAnimationDuration + delayBetweenBodyAndLines + index * lineAnimationDuration,
        })
      )

      setBodies(prev => [...prev, body])
      setQuads(prev => [...prev, ...addedQuads])

      lastQuadRef.current = newQuad
      const totalLoopTime =
        bodyAnimationDuration +
        delayBetweenBodyAndLines +
        addedQuads.length * lineAnimationDuration +
        delayBeforeNextLoop
      timeoutRef.current = setTimeout(() => renderLoop(i + 1), totalLoopTime * 1000)
    }

    !stop && renderLoop(0)

    return () => clearTimeout(timeoutRef.current)
  }, [stop])

  return (
    <svg {...props} viewBox={`0 0 ${X_MAX} ${Y_MAX}`}>
      <rect
        className={styles.rect}
        x={boundaries.centerX - boundaries.size / 2}
        y={boundaries.centerY - boundaries.size / 2}
        height={boundaries.size}
        width={boundaries.size}
      />
      <g>{quads.map(Cross)}</g>
      <g>
        {bodies.map(({ massX: x, massY: y, mass }, index) => (
          <circle
            style={{ scale: index < bodies.length - 1 || stop ? "1" : "4" }}
            className={styles.body + " fadeIn"}
            r={Math.min(mass * 4, 8)}
            key={`${x}:${y}`}
            cx={x}
            cy={y}
            fill={index < bodies.length - 1 || stop ? "grey" : "red"}
          />
        ))}
      </g>
    </svg>
  )
}

const Cross = ({ centerX, centerY, size, delay }: QuadAndDelay) => (
  <g key={`${centerX}:${centerY}`}>
    <line
      style={{ animationDelay: delay + "s" }}
      className={styles.rect}
      x1={centerX - size / 2}
      x2={centerX + size / 2}
      y1={centerY}
      y2={centerY}
    />
    <line
      style={{ animationDelay: delay + "s" }}
      className={styles.rect}
      x1={centerX}
      x2={centerX}
      y1={centerY - size / 2}
      y2={centerY + size / 2}
    />
  </g>
)
