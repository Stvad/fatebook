import { CheckCircleIcon } from "@heroicons/react/24/outline"
import clsx from "clsx"
import { useSession } from "next-auth/react"
import React, { ReactNode, useState } from 'react'
import { LoaderIcon } from "react-hot-toast"
import { InView } from "react-intersection-observer"
import { ExtraFilters } from "../lib/web/question_router"
import { api } from "../lib/web/trpc"
import { ifEmpty } from "../lib/web/utils"
import { Question } from "./Question"
import { AnimatePresence, motion } from "framer-motion"

export function Questions({
  title,
  filterClientSide,
  noQuestionsText = "Make your first forecast to see it here.",
  filterTagIds = undefined,
  showAllPublic = false,
  theirUserId = undefined,
}: {
  title?: string | ReactNode,
  filterClientSide?: (question: any) => boolean
  noQuestionsText?: string,
  filterTagIds?: string[],
  showAllPublic?: boolean,
  theirUserId?: string,
}) {
  const session = useSession()

  const [extraFilters, setExtraFilters] = useState<ExtraFilters>({
    resolved: false,
    readyToResolve: false,
    resolvingSoon: false,
  })
  const filtersApplied = Object.values(extraFilters).some(f => f)

  const questionsQ = api.question.getQuestionsUserCreatedOrForecastedOnOrIsSharedWith.useInfiniteQuery(
    {
      limit: 10,
      extraFilters: {
        ...extraFilters,
        filterTagIds,
        showAllPublic,
        theirUserId,
      },
    },
    {
      initialCursor: 0, // NB: "cursor" language comes from TRPC, but we use take/skip method in Prisma
      getNextPageParam: (lastPage) => lastPage?.nextCursor,
      keepPreviousData: true,
    }
  )
  const orderedBy = extraFilters?.resolvingSoon ? "resolveBy" : "createdAt"

  if (
    (!session.data?.user.id || !questionsQ.data || questionsQ.data.pages.length === 0)
    && !filtersApplied // don't hide everything if user applied a filter
    && !showAllPublic // don't hide for logged out users if showing all public
    && !theirUserId // don't hide for logged out users if showing a user page
  ) {
    return <></>
  }

  const questionsUnfiltered = questionsQ.data?.pages.flatMap(p => p?.items).filter(q => !!q) || []
  // some edge cases cause duplicates, e.g. when a filter is applied and a question stops matching the filter
  // then the question cursor logic will cause it to be duplicated in the next page
  const questionsNoDuplicates = questionsUnfiltered.filter((question, index) => {
    const questionIds = questionsUnfiltered.map(q => q!.id)
    return questionIds.indexOf(question!.id) === index
  })
  const questions = questionsNoDuplicates
    .filter(question => (!filterClientSide || filterClientSide(question)) && question)

  return (
    <div>
      <div className="flex max-sm:flex-col justify-between pt-6 pb-4">
        <h3 className="select-none flex gap-4 my-auto">
          {title || "Your forecasts"}
          {(questionsQ.isLoading) && <div className="mt-2.5"><LoaderIcon /></div>}
        </h3>
        {(questions?.length > 0 || filtersApplied) && <FilterControls
          extraFilters={extraFilters}
          setExtraFilters={setExtraFilters}
        />}
      </div>
      <motion.div className="grid gap-6">
        <AnimatePresence initial={false} mode="popLayout">
          {ifEmpty(
            questions
              .map((question, index, array) => (
                question ?
                  <React.Fragment key={question.id}>
                    <DateSeparator
                      key={question.id + "header"}
                      header={groupDatesByBuckets(question[orderedBy], array[index - 1]?.[orderedBy])}
                    />
                    <Question
                      question={question}
                      key={question.id}
                      startExpanded={(index === 0 && question.userId === session.data?.user.id)}
                      zIndex={questions?.length ? (questions?.length - index) : undefined}
                    />
                  </React.Fragment>
                  :
                  <></>
              )),
            <div className="italic text-neutral-500 text-sm">
              {filtersApplied ?
                "No questions match your filters."
                :
                noQuestionsText
              }
            </div>
          )}
        </AnimatePresence>
        <InView>
          {({ inView, ref }) => {
            if (inView && questionsQ.hasNextPage) {
              void questionsQ.fetchNextPage()
            }
            return (
              <div ref={ref} />
            )
          }}
        </InView>
        {(questionsQ.isFetchingNextPage || questionsQ.isRefetching) && <LoaderIcon className="mx-auto" />}
      </motion.div>
    </div>
  )
}

function DateSeparator({ header } : { header: string | undefined }) {
  if (!header) return <></>

  return (
    <div className="flex gap-4 -mb-2 text-neutral-400 text-sm text-center select-none mx-auto px-4 w-full">
      <div className="border-b border-neutral-200 opacity-70 inline-block grow my-auto" />
      {header}
      <div className="border-b border-neutral-200 opacity-70 inline-block grow my-auto" />
    </div>
  )
}

function FilterControls({
  extraFilters,
  setExtraFilters,
}: {
  extraFilters: ExtraFilters,
  setExtraFilters: (extraFilters: ExtraFilters) => void,
}) {
  return (
    <div className="flex flex-row flex-wrap gap-2" id="filters">
      <button
        onClick={() => setExtraFilters({
          ...extraFilters,
          resolved: false,
          readyToResolve: false,
          resolvingSoon: !extraFilters.resolvingSoon,
        })}
        className={clsx(
          "btn",
          extraFilters.resolvingSoon ? "btn-primary" : "text-neutral-500",
        )}
      >
        {extraFilters.resolvingSoon && <CheckCircleIcon height={16} />}
        Resolving soon
      </button>

      <button
        onClick={() => setExtraFilters({
          ...extraFilters,
          resolved: false,
          resolvingSoon: false,
          readyToResolve: !extraFilters.readyToResolve,
        })}
        className={clsx(
          "btn",
          extraFilters.readyToResolve ? "btn-primary" : "text-neutral-500",
        )}
      >
        {extraFilters.readyToResolve && <CheckCircleIcon height={16} />}
        Ready to resolve
      </button>

      <button
        onClick={() => setExtraFilters({
          ...extraFilters,
          readyToResolve: false,
          resolvingSoon: false,
          resolved: !extraFilters.resolved,
        })}
        className={clsx(
          "btn",
          extraFilters.resolved ? "btn-primary" : "text-neutral-500",
        )}
      >
        {extraFilters.resolved && <CheckCircleIcon height={16} />}
        Resolved
      </button>
    </div>
  )
}

function groupDatesByBuckets(thisDate: Date, prevDate: Date | undefined) {
  // only show it if it's a different bucket to the previous one
  return bucketDate(thisDate) !== bucketDate(prevDate) ? bucketDate(thisDate) : undefined
}

function bucketDate(date: Date | undefined) {
  if (!date) return undefined

  const now = new Date()
  const daysSince = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24))

  if (daysSince >= 0) {
    if (daysSince < 1 && daysSince > -1) {
      return undefined
    }
    if (date.getDay() < now.getDay() && daysSince < 7) {
      return "Earlier this week"
    }

    if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
      return "Earlier this month"
    }

    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleString('default', { month: 'long' })
    }

    if (date.getFullYear() < now.getFullYear()) {
      return date.toLocaleString('default', { month: 'long', year: 'numeric' })
    }
  }

  // future dates
  if (daysSince < 0) {
    const daysUntil = Math.floor((date.getTime() - now.getTime()) / (1000 * 3600 * 24))
    if (date.getDay() > now.getDay() && daysUntil < 7) {
      return "Later this week"
    }

    if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
      return "Later this month"
    }

    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleString('default', { month: 'long' })
    }

    if (date.getFullYear() > now.getFullYear()) {
      return date.toLocaleString('default', { month: 'long', year: 'numeric' })
    }
  }
}