/* eslint-disable @typescript-eslint/no-misused-promises */
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/router"
import { Predict } from "../components/Predict"
import { Questions } from "../components/Questions"
import { TrackRecord } from "../components/TrackRecord"

export default function HomePage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()

  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test" || router.query["preview"] || process.env.WEB_PREVIEW) {
    return (
      <div className="max-sm:flex-col gap-8 md:gap-12 flex justify-center px-4 pt-12 lg:pt-16 mx-auto max-w-6xl">
        <div className="prose mx-auto">
          {!session?.user?.id && sessionStatus !== "loading" && <>
            <h2 className="text-3xl mb-2 font-extrabold text-gray-900">
                  Fatebook
            </h2>
            <h3 className="text-gray-600">Track your predictions, make better decisions</h3>
          </>}

          <Predict />
          <Questions />

          <div className="py-12"/>

          <p><Link href="/for-slack"><b>Fatebook for Slack</b></Link>: out now.</p>

          <p>{"We'd love your feedback at"} <a href="mailto:hello@sage-future.org">hello@sage-future.org</a> or on <Link href="https://discord.gg/mt9YVB8VDE">Discord</Link>.</p>

          <h3 className="text-lg font-semibold mt-12">Check out Sage{"'"}s other tools on <Link href="https://www.quantifiedintuitions.org/">Quantified Intuitions</Link></h3>
        </div>
        <div className="pt-28">
          <TrackRecord />
        </div>
      </div>
    )
  } else {
    return (
      <div className="px-4 pt-12 lg:pt-16 mx-auto max-w-6xl">
        <div className="prose mx-auto">
          <h2 className="text-3xl mb-2 font-extrabold text-gray-900">
              Fatebook
          </h2>
          <h3 className="text-gray-600">Track your predictions, make better decisions</h3>

          <p><Link href="/for-slack"><b>Fatebook for Slack</b></Link>: out now.</p>

          <p><b>Fatebook for web</b>: coming soon. <Link href="https://forms.gle/SRAFPXndEkbd7F4h8">Join the waitlist for early access.</Link></p>

          <p>{"We'd love your feedback at"} <a href="mailto:hello@sage-future.org">hello@sage-future.org</a> or on <Link href="https://discord.gg/mt9YVB8VDE">Discord</Link>.</p>

          <h3 className="text-lg font-semibold mt-12">Check out Sage{"'"}s other tools on <Link href="https://www.quantifiedintuitions.org/">Quantified Intuitions</Link></h3>
        </div>
      </div>
    )
  }
}