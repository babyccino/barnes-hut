import { useRef, useState } from "react"
import Head from "next/head"

import Simulation from "../components/simulation"
import styles from "../styles/Home.module.css"

export default function Home(): JSX.Element {
  const [simRunning, setSimRunning] = useState(true)
  const [theta, setTheta] = useState(0.5)
  const svgRef = useRef(null)

  return (
    <div className={styles.container}>
      <Head>
        <title>Barnes-Hut</title>
        <meta
          name="description"
          content="A visualisation of the Barnes-Hut algorithm"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <Simulation
          nodeCount={100}
          running={simRunning}
          renderCalculatedQuads={true}
          renderUncalcuatedQuads={true}
          theta={theta}
        />

        <input
          type="range"
          name="theta"
          min="0"
          max="2"
          defaultValue={0.5}
          step={0.1}
          onChange={(e) => setTheta(e.target.valueAsNumber)}
        ></input>
        <label htmlFor="theta">Theta</label>
        <button onClick={() => setSimRunning((state) => !state)}>
          Start/stop
        </button>
      </main>

      <footer className={styles.footer}>footer</footer>
    </div>
  )
}
