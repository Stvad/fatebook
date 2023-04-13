import { Resolution } from '@prisma/client'
import { QuestionWithAuthorAndSlackMessages } from '../../prisma/additional'
import { markdownBlock, textBlock, divider, feedbackOverflow, getQuestionTitleLink } from './_block_utils.js'
import type { Blocks } from './_block_utils.js'
import { resolutionToString } from '../_utils.js'

type ResolveQuestionDetails = {
  brierScore: number
  rBrierScore: number
  ranking: number
  totalParticipants: number
  lastForecast: number
  lastForecastDate: string
  overallBrierScore: number
  overallRBrierScore: number
}

export async function buildQuestionResolvedBlocks(teamId: string, question: QuestionWithAuthorAndSlackMessages, details : ResolveQuestionDetails) {
  const questionResolution = resolutionToString(question.resolution!)
  const questionTitle      = question.title + ' Resolved ' + questionResolution
  const questionLink       = await getQuestionTitleLink(teamId, question)
  return [
    {
      'type': 'header',
      'text': textBlock(questionTitle)
    },
    {
      'type': 'section',
      'text': markdownBlock(`A question you forecasted on has been resolved!\n ${question.profile.user.name} resolved: ${questionLink} as *${questionResolution}*`),
      'accessory': feedbackOverflow()
    },
    divider(),
    ...(((question.resolution!) != Resolution.AMBIGUOUS) ? generateNonAmbiguousResolution(details) : generateAmbiguousResolution()),
    divider(),
    {
      'type': 'section',
      'text': markdownBlock(`_Are you enjoying using this bot? Let us know <https://www.quantifiedintuitions.org/|here>_`)
    }
  ]
}

function generateNonAmbiguousResolution(details : ResolveQuestionDetails) : Blocks {
  return [
    {
      'type': 'section',
      'fields': [
        markdownBlock(`*Brier score:*\n ${details.brierScore}`),
        markdownBlock(`*Relative Brier score:*\n ${details.rBrierScore}`),
        markdownBlock(`*Ranking:*\n *${details.ranking}*/${details.totalParticipants}`),
        markdownBlock(`*Last forecast:*\n ${details.lastForecast} on ${details.lastForecastDate}`)
      ]
    },
    divider(),
    {
      'type': 'section',
      'fields': [
        markdownBlock(`*Brier score across all questions:*\n ${details.overallBrierScore}`),
        markdownBlock(`*Relative Brier score across all questions:*\n ${details.overallRBrierScore}`)
      ]
    }
  ]
}

function generateAmbiguousResolution() : Blocks {
  return [
    {
      'type': 'section',
      'text': markdownBlock(`No scoring due to ambiguous resolution!`),
    }
  ]
}