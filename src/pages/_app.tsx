import "../styles/globals.scss"
import type { AppProps } from "next/app"
import Head from "next/head"

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>The Barnes-Hut Simulation</title>
        <meta
          name="description"
          content="A visualisation of the Barnes-Hut simulation for n-body systems"
        />
        <link rel="icon" href="/favicon.svg" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
