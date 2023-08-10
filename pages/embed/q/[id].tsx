import React from "react"
import { QuestionOrSignIn } from "../../../components/QuestionOrSignIn"


export default function QuestionEmbed() {
  return <QuestionOrSignIn embedded={true} alwaysExpand={false}></QuestionOrSignIn>
}

// Strips away the header and footer
QuestionEmbed.getLayout = function getLayout(page: React.ReactElement) {
  return page
}