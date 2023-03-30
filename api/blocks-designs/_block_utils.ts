import { Block, KnownBlock } from "@slack/types"

export interface ResolveQuestionActionParts {
  action: 'resolve'
  questionId: number
  answer: 'yes' | 'no' | 'ambiguous'
}

export interface SubmitTextForecastActionParts {
  action: 'submitTextForecast'
  questionId: number
}

export type ActionIdParts = ResolveQuestionActionParts | SubmitTextForecastActionParts

export type Blocks = (KnownBlock | Block)[]

export function toActionId(parts: ActionIdParts) {
  const stringified = JSON.stringify(parts)
  if (stringified.length > 255) {
    throw new Error(`ActionIdParts too long - Slack limits actionId to 255 chars. ${parts}`)
  }
  return stringified
}

export function unpackBlockActionId(actionId: string) {
  try {
    return JSON.parse(actionId) as ActionIdParts
  } catch (e) {
    throw new Error("Could not parse actionId: " + actionId)
  }
}

export function textBlock(content: string, emoji = true) {
  return {
    'type': "plain_text" as "plain_text",
    'emoji': emoji,
    'text': content,
  }
}

export function markdownBlock(content: string) {
  return {
    'type': "mrkdwn" as "mrkdwn",
    'text': content,
  }
}