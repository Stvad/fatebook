import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import prisma, { backendAnalyticsEvent } from '../_utils_server'
import { emailNewlySharedWithUsers, getQuestionAssertAuthor } from './question_router'
import { publicProcedure, router } from './trpc_base'

export const userListRouter = router({
  getUserLists: publicProcedure
    .query(async ({ ctx }) => {
      if (!ctx.userId) {
        return null
      }

      return await prisma.userList.findMany({
        where: {
          OR: [
            {authorId: ctx.userId},
            {users: {
              some: {
                id: ctx.userId,
              }
            }}
          ]
        },
        include: {
          author: true,
          users: true,
        }
      })
    }),

  get: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userList = await prisma.userList.findUnique({
        where: {
          id: input.id,
        },
        include: {
          users: true,
          author: true,
        }
      })
      if (!userList) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User list not found" })
      }
      if (!ctx.userId || (userList.authorId !== ctx.userId && !userList.users.find(u => u.id === ctx.userId))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "You don't have access to this user list" })
      }

      return userList
    }
  ),

  createList: publicProcedure
    .input(
      z.object({
        name: z.string(),
        userEmails: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({input, ctx}) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be logged in to create a list" })
      }

      const userList = await prisma.userList.create({
        data: {
          name: input.name,
          author: {
            connect: {
              id: ctx.userId
            }
          },
          users: {
            connect: input.userEmails?.map(email => ({ email }))
          }
        },
        include: {
          users: true,
        }
      })

      await backendAnalyticsEvent("create_user_list", {
        user: ctx.userId,
        platform: "web",
      })

      return userList
    }),

  updateList: publicProcedure
    .input(
      z.object({
        listId: z.string(),
        name: z.string().optional(),
        userEmails: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({input, ctx}) => {
      const oldList = await prisma.userList.findUnique({
        where: {
          id: input.listId,
        }
      })
      if (!oldList || !ctx.userId || oldList.authorId !== ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "" })
      }

      // create users if they don't exist
      if (input.userEmails) {
        const existingUsers = await prisma.user.findMany({
          where: {
            email: {
              in: input.userEmails,
            },
          },
        })

        const nonExistingUsers = input.userEmails.filter(
          (email) => !existingUsers.some((u) => u.email === email)
        )

        if (nonExistingUsers.length > 0) {
          await prisma.user.createMany({
            data: nonExistingUsers.map((email) => ({ email })),
          })
        }
      }

      await prisma.userList.update({
        where: {
          id: input.listId,
        },
        data: {
          name: input?.name,
          users: {
            set: input.userEmails?.map(email => ({ email }))
          }
        }
      })

      await backendAnalyticsEvent("update_user_list", {
        user: ctx.userId,
        platform: "web",
      })
    }),

  deleteList: publicProcedure
    .input(
      z.object({
        listId: z.string(),
      })
    )
    .mutation(async ({input, ctx}) => {
      const oldList = await prisma.userList.findUnique({
        where: {
          id: input.listId,
        }
      })
      if (!oldList || !ctx.userId || oldList.authorId !== ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "" })
      }

      // remove from questions that are shared with this list
      const connectedQuestions = await prisma.question.findMany({
        where: {
          sharedWithLists: {
            some: {
              id: input.listId,
            },
          },
        },
      })
      for (const question of connectedQuestions) {
        await prisma.question.update({
          where: {
            id: question.id,
          },
          data: {
            sharedWithLists: {
              disconnect: {
                id: input.listId,
              },
            },
          },
        })
      }

      await prisma.userList.delete({
        where: {
          id: input.listId,
        },
      })

      await backendAnalyticsEvent("delete_user_list", {
        user: ctx.userId,
        platform: "web",
      })
    }),

  setQuestionLists: publicProcedure
    .input(
      z.object({
        questionId: z.string(),
        listIds: z.array(z.string()),
      })
    )
    .mutation(async ({input, ctx}) => {
      await getQuestionAssertAuthor(ctx, input.questionId)

      const oldLists = (await prisma.question.findUnique({
        where: {
          id: input.questionId,
        },
        include: {
          sharedWithLists: true,
        }
      }))?.sharedWithLists

      const question = await prisma.question.update({
        where: {
          id: input.questionId,
        },
        data: {
          sharedWithLists: {
            set: input.listIds.map(id => ({ id }))
          },
        },
        include: {
          user: {
            include: {
              profiles: true,
            }
          },
          sharedWithLists: {
            include: {
              users: true,
            }
          },
          sharedWith: true,
        }
      })

      // email only people newly shared with
      // todo - could track everyone we've emailed and only email new people
      const newListIds = input.listIds.filter(id => !(oldLists?.map(l => l.id) || []).includes(id))
      const newUsersSharedWith = Array.from(new Set(question.sharedWithLists
        .filter(l => newListIds.includes(l.id))
        .flatMap(l => l.users)
        .filter(u => u.id !== ctx.userId
          && !(question.sharedWith?.map(u => u.id) || []).includes(u.id)
        )
        .map(u => u.email)
      ))

      await emailNewlySharedWithUsers(newUsersSharedWith, question)

      await backendAnalyticsEvent("set_question_lists", {
        user: ctx.userId,
        platform: "web",
      })
    }),
})