import { useEffect, useRef, useState } from "react"
import Head from "next/head"

import Simulation from "../components/simulation"
import styles from "../styles/Home.module.css"

export default function Home(): JSX.Element {
  const [simRunning, setSimRunning] = useState(true)
  const svgRef = useRef(null)

  useEffect(() => {}, [])

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
        <Simulation nodeCount={30} running={simRunning} />
        <button onClick={() => setSimRunning((state) => !state)}>
          Start/stop
        </button>
      </main>

      <footer className={styles.footer}>footer</footer>
    </div>
  )
}
