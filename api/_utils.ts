import { VercelResponse } from '@vercel/node';
import { PrismaClient, GroupType, Profile } from '@prisma/client'

import { token } from './_constants.js'

const prisma = new PrismaClient()
export default prisma

// tokenize a string into an array by splitting on sections
// in the following syntax, with two strings and one number:
// "forecast" "date" 0.8
export function tokenizeForecastString(instring : string) : string[] | null {
  const regex = /([a-zA-Z]+)\s?(\"[^"]*\")?\s?(\"?[^"\s]*\"?)?\s?([\d.]*)?/
  const array : string[] | null = instring.match(regex)
  console.log('Tokenized version:', array)
  return array
}

export async function getSlackWorkspaceName() {
  try {
    const url = 'https://slack.com/api/team.info'
    const response = await fetch(url, {
      method: 'get',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token}`,
      }
    })
    const data = await response.json()
    console.log('data from team fetch:', data)
    return data.team.name
  } catch (err) {
    console.log('fetch email Error:', err)
    throw err
  }
}

export async function getSlackProfileFromSlackId(slackId : string) {
  let data
  try {
    const url = 'https://slack.com/api/users.info'
    const response = await fetch(url+`?user=${slackId}`, {
      method: 'get',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token}`,
      }
    })
    data = await response.json()
    console.log('data from user fetch:', data)
  } catch (err) {
    console.log('fetch email Error:', err)
    throw err
  }

  const slackProfile = data.user.profile
  if( slackProfile === undefined) {
    throw new Error('slackProfile not found')
  }
  console.log('slackUser found:', slackProfile)
  return slackProfile
}

export async function createProfileID(slackId : string) : Promise<Profile>{
  // check if the user exists
  let slackUser = (await getSlackProfileFromSlackId(slackId))
  let user = await prisma.user.findUnique({
    where: {
      email: slackUser.email
    },
  })

  // find the group id, create group if doesn't exist for workspace
  let groupId = await getGroupIDFromSlack(slackUser.team, true)

  // if the user doesn't exist in our db, create them
  //   and create a profile for them
  if (!user) {
    await prisma.user.create({
      data: {
        email: slackUser.email,
        name: slackUser.real_name,
        profiles: {
          create: {
            slackId: slackId,
            groups: {
              connect: {
                id: groupId
              }
            }
          }
        }
      },
    })
  }else{
    // create the profile if they don't exist
    await prisma.profile.create({
      data: {
        slackId: slackId,
        userId: user.id,
        groups: {
          connect: {
            id: groupId
          }
        }
      },
    })
  }
  // see above for why findFirst is used
  //   we now have a profile, so we can return it
  let profile = await prisma.profile.findFirst({
    where: {
      slackId: slackId
    },
  })
  if(profile === undefined) {
    throw new Error(`db error, failed to find created profile with slackId: ${slackId}`)
  }
  return profile!
}

export async function getGroupIDFromSlack(workspaceId : string, createGroupIfNotExists : boolean = false) : Promise<number | undefined>{
  // query the database for the group
  //   see above for why findFirst is used
  let group = await prisma.group.findFirst({
    where: {
      workspaceId: workspaceId
    },
  })
  if (createGroupIfNotExists && !group) {
    // get workspace name for nice labelling of new group
    let slackWorkspaceName
    try {
      slackWorkspaceName = (await getSlackWorkspaceName())
      if(slackWorkspaceName === undefined) {
        throw new Error('slackWorkspace not found')
      }
    } catch (err) {
      console.log('Error getting workspace')
      return undefined
    }

    // create the group if they don't exist
    await prisma.group.create({
      data: {
        workspaceId: workspaceId,
        type: GroupType.SLACK,
        name: slackWorkspaceName,
      },
    })
    // we now have a group, so we can return it
    group = await prisma.group.findFirst({
      where: {
        workspaceId: workspaceId
      },
    })
  } else {
    return undefined
  }

  return group?.id
}

export function tokenizeString(instring : string) {
  const array : string[] = instring.split(' ').filter((element) => {
    return element !== ''
  })
  console.log('Tokenized version:', array)
  return array
}

export async function postToChannel(channel : string, res : VercelResponse, payload : string) {
  console.log('channel:', channel)
  const channelId = await channelNameToId(channel)

  console.log('ID:', channelId)

  const message = {
    channel: channelId,
    text: payload,
  }

  try {
    const url = 'https://slack.com/api/chat.postMessage'
    const response = await fetch(url, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(message),
    })
    const data = await response.json()

    console.log('data from fetch:', data)
    res.json({ ok: true })
  } catch (err) {
    console.log('fetch Error:', err)
    res.send({
      response_type: 'ephemeral',
      text: `${err}`,
    })
  }
}

async function channelNameToId(channelName : string) {
  let generalId
  let id

  try {
    const url = 'https://slack.com/api/conversations.list'
    const response = await fetch(url, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await response.json()

    data.channels.forEach((element : any) => {
      if (element.name === channelName) {
        id = element.id
      }
      if (element.name === 'general') generalId = element.id
    })
    if (id) {
      return id
    } else return generalId
  } catch (err) {
    console.log('fetch Error:', err)
  }
  return id
}
