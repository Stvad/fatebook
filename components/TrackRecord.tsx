import { Transition } from "@headlessui/react"
import {
  AdjustmentsHorizontalIcon,
  TrophyIcon,
} from "@heroicons/react/24/solid"
import clsx from "clsx"
import Link from "next/link"
import { useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import GitHubCalendar from "react-github-contribution-calendar"
import {
  getDateYYYYMMDD,
  joinWithOr,
  populateDetails,
  showSignificantFigures,
} from "../lib/_utils_common"
import { api } from "../lib/web/trpc"
import { transitionProps, useUserId } from "../lib/web/utils"
import { CalibrationChart } from "./CalibrationChart"
import { InfoButton } from "./InfoButton"
import { TagsSelect } from "./TagsSelect"

export function TrackRecord({
  trackRecordUserId,
}: {
  trackRecordUserId: string
}) {
  const thisUserId = useUserId()

  const isThisUser = trackRecordUserId === thisUserId

  const userName = api.getUserInfo.useQuery(
    {
      userId: trackRecordUserId,
    },
    {
      enabled: !isThisUser,
    },
  )

  const [tags, setTags] = useState<string[]>([])
  const allScoresQuery = api.question.getQuestionScores.useQuery({
    userId: trackRecordUserId,
    tags: tags,
  })
  const scoreDetails =
    allScoresQuery?.data && populateDetails(allScoresQuery?.data)

  const [showFilters, setShowFilters] = useState<boolean>(false)

  const percentileQ = api.question.getBrierScorePercentile.useQuery({
    userId: trackRecordUserId,
  })

  if (!trackRecordUserId) return <></>

  return (
    <div className="max-w-xs prose flex flex-col mx-auto">
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <h2 className="select-none relative">
          {isThisUser
            ? "Your track record"
            : userName.data?.name
              ? `${userName.data?.name}'s track record`
              : " "}
          {isThisUser && (
            <button
              className={clsx(
                "btn btn-circle aspect-square absolute right-3 -bottom-2 hover:opacity-100",
                showFilters || tags.length > 0 ? "btn-active" : "btn-ghost",
              )}
              onClick={(e) => {
                setShowFilters(!showFilters)
                e.preventDefault()
              }}
            >
              <AdjustmentsHorizontalIcon height={16} width={16} />
            </button>
          )}
        </h2>
        <Transition
          {...transitionProps()}
          show={showFilters || tags.length > 0}
        >
          <div className="text-sm pb-4">
            <TagsSelect
              tags={tags}
              setTags={(tags) => setTags(tags)}
              placeholder="Filter by tags..."
            />
          </div>
        </Transition>
        <CalibrationChart tags={tags} userId={trackRecordUserId} />

        {isThisUser && (
          <div className="text-sm flex gap-2 text-gray-500 text-center mx-auto">
            <Link
              className=""
              href="https://quantifiedintuitions.org/calibration"
            >
              <button className="btn">
                <TrophyIcon
                  width={16}
                  height={16}
                  className="text-indigo-600"
                />
                Train your calibration skills
              </button>
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-4 pt-6">
          {[
            { details: scoreDetails?.recentDetails, title: "Last 3 months" },
            { details: scoreDetails?.overallDetails, title: "All time" },
          ].map(({ details, title }) => (
            <div key={title} className="stats shadow overflow-x-clip">
              <div className="stat">
                <div className="stat-title flex flex-row gap-0.5 md:gap-1">
                  Brier score
                  <InfoButton
                    tooltip="Lower is better!"
                    className="tooltip-bottom"
                  />
                </div>
                <div
                  className={clsx(
                    "stat-value",
                    !details?.brierScore && "text-neutral-500",
                  )}
                >
                  {details?.brierScore
                    ? showSignificantFigures(details.brierScore, 2)
                    : "..."}
                </div>
                <div className="stat-desc">
                  {title}
                  {title === "All time" &&
                    percentileQ.data &&
                    percentileQ.data.absoluteScorePercentile !== null && (
                      <div className="ml-1 badge badge-sm badge-ghost bg-green-100 border-none">
                        {`Top ${Math.round(
                          (percentileQ.data.absoluteScorePercentile || 0.01) *
                            100,
                        )}%`}
                      </div>
                    )}
                </div>
              </div>

              {
                <div className="stat">
                  <div className="stat-title flex flex-row gap-0.5 md:gap-1">
                    Relative Brier
                    <InfoButton
                      tooltip="Relative to the median on each question"
                      className="tooltip-left"
                    />
                  </div>
                  <div
                    className={clsx(
                      "stat-value",
                      !details?.rBrierScore && "text-neutral-500",
                    )}
                  >
                    {details?.rBrierScore
                      ? showSignificantFigures(details.rBrierScore, 2)
                      : "..."}
                  </div>
                  <div className="stat-desc">
                    {title}
                    {title === "All time" &&
                      percentileQ.data &&
                      percentileQ.data.relativeScorePercentile && (
                        <div className="ml-1 badge badge-sm badge-ghost bg-green-100 border-none">
                          {`Top ${Math.round(
                            percentileQ.data.relativeScorePercentile * 100,
                          )}%`}
                        </div>
                      )}
                  </div>
                </div>
              }
            </div>
          ))}
        </div>
        <ForecastsCalendarHeatmap tags={tags} userId={trackRecordUserId} />
      </ErrorBoundary>
    </div>
  )
}

export function ForecastsCalendarHeatmap({
  tags,
  userId,
}: {
  tags: string[]
  userId: string
}) {
  const forecasts = api.question.getForecastCountByDate.useQuery({
    tags: tags,
    userId,
  })
  const thisUserId = useUserId()

  return (
    <div className="pt-12">
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <GitHubCalendar
          values={forecasts.data?.dateCounts || {}}
          panelColors={[
            "#f0f0f0", // background
            "#86efac", // count=1
            "#4ade80", // count=2
            "#22c55e", // count=3+
          ]}
          until={getDateYYYYMMDD(new Date())}
          monthLabelAttributes={{}}
          panelAttributes={{}}
          weekLabelAttributes={{}}
        />
        <div className="ml-3">
          {userId === thisUserId ? "You" : "They"}
          {"'ve made "}
          <span className="font-semibold">{forecasts.data?.total}</span>
          {" forecasts"}
          {tags.length > 0 &&
            ` tagged ${joinWithOr(tags.map((tag) => `"${tag}"`))}`}
        </div>
      </ErrorBoundary>
    </div>
  )
}
