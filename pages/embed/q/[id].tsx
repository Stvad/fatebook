import React, { useEffect, useRef } from "react"
import { QuestionOrSignIn } from "../../../components/QuestionOrSignIn"
import { sendToHost } from "../../../lib/web/embed"


export default function QuestionEmbed() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const resizeObserver = new ResizeObserver(() => {
      sendToHost('resize_iframe', {box: ref.current!.getBoundingClientRect()})
    })

    resizeObserver.observe(ref.current)

    return () => resizeObserver.disconnect()
  }, [])

  return <div ref={ref}>
    <QuestionOrSignIn embedded={true} alwaysExpand={false}></QuestionOrSignIn>
  </div>
}

// Strips away the header and footer
QuestionEmbed.getLayout = function getLayout(page: React.ReactElement) {
  return page
}