import { SessionProvider } from "next-auth/react"
import { AppProps } from "next/app"
import Head from "next/head"
import { GoogleAnalytics } from "nextjs-google-analytics"
import Meta from "../components/Meta"
import { api } from "../lib/web/trpc"
import "../styles/globals.css"
import { ReactElement, ReactNode } from "react"
import { NextPage } from "next"
import { Layout } from "../components/Layout"

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
}

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
function App({ Component, pageProps: {session, ...pageProps} }: AppPropsWithLayout) {
  const getLayout = Component.getLayout ?? ((page) => <Layout>{page}</Layout>)

  return <>
    <Meta />
    <Head>
      <link rel="shortcut icon" href="/favicon.ico" />
    </Head>
    <GoogleAnalytics trackPageViews />
    <SessionProvider session={session}>
      {getLayout(<Component {...pageProps} />)}
    </SessionProvider>
  </>
}

export default api.withTRPC(App)