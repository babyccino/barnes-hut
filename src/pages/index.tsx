import { ChangeEventHandler, InputHTMLAttributes, useState } from "react"
import Head from "next/head"

import Simulation from "../components/simulation"
import { MAX_GALAXY_SIZE } from "../lib/galaxy"

const Math = ({ children }: { children: any }) => (
  <span className="italic font-serif">{children}</span>
)

export default function Home(): JSX.Element {
  const [simRunning, setSimRunning] = useState(true)
  const [theta, setTheta] = useState(0.5)
  const [renderCalculatedQuads, setRenderCalculatedQuads] = useState(false)
  const [renderUncalcuatedQuads, setRenderUncalcuatedQuads] = useState(false)
  const [nodeCount, setNodeCount] = useState(MAX_GALAXY_SIZE)
  const onNodeCount: ChangeEventHandler<HTMLInputElement> = (e) => {
    setNodeCount(e.target.valueAsNumber)
    setSimRunning(false)
    setRenderCalculatedQuads(false)
    setRenderUncalcuatedQuads(true)
  }
  const onTheta: ChangeEventHandler<HTMLInputElement> = (e) => {
    setTheta(e.target.valueAsNumber)
  }

  return (
    <div>
      <Head>
        <title>Barnes-Hut Simulation</title>
        <meta
          name="description"
          content="A visualisation of the Barnes-Hut simulation for n-body systems"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex justify-end w-1/2">
        <Simulation
          className="fixed left-1/2 top-1/2 -translate-y-1/2 w-full h-full max-w-[50%] 
            max-h-full"
          nodeCount={nodeCount}
          running={simRunning}
          renderCalculatedQuads={renderCalculatedQuads}
          renderUncalcuatedQuads={renderUncalcuatedQuads}
          theta={theta}
        />

        <div className="relative right-0 w-full max-w-xl">
          <h1 className="text-3xl font-bold">The Barnes-Hut Simulation</h1>
          <p>
            The Barnes-Hut simulation is an algorithm for estimating the forces in an n-body system.
            While the brute force method is a quintessential example of an&nbsp;
            <Math>
              O(n<sup>2</sup>)
            </Math>
            &nbsp;algorithm, the Barnes-Hut simulation, using a quadtree (or octree for a 3d
            simulation), can estimate the system with low error at&nbsp;
            <Math>O(n*log(n))</Math>.
          </p>
          <p>
            The main idea in the estimation is that a group of far away bodies can be approximated
            using a combined body with the total mass and centre of mass of the system.
          </p>
          <input
            className="block"
            type="range"
            name="nodeCount"
            min="1"
            max={MAX_GALAXY_SIZE}
            defaultValue={MAX_GALAXY_SIZE}
            step={1}
            onChange={onNodeCount}
          />
          <label htmlFor="nodeCount">Number of bodies</label>
          <p>
            The main idea in the estimation is that a group of far away bodies can be approximated
            using a combined body with the total mass and centre of mass of the system.
          </p>
          <input
            className="block"
            type="range"
            name="theta"
            min="0"
            max="2"
            defaultValue={0.5}
            step={0.1}
            onChange={onTheta}
          />
          <label htmlFor="theta">Theta</label>
          <button onClick={() => setSimRunning((state) => !state)}>Start/stop</button>
        </div>
      </main>
    </div>
  )
}
