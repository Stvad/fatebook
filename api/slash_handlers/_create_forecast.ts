import { VercelRequest, VercelResponse } from '@vercel/node';

import { createProfileID, getGroupIDFromSlack } from '../_utils.js'
import prisma from '../_utils.js'


export async function createForecast(res : VercelResponse, commandArray : string[], slack_userID : string) {
  let question : string = commandArray[2]
  let date_str : string = commandArray[3]
  let forecast : string = commandArray[4]
  console.log(`question: ${question}, date: ${date_str}, forecast: ${forecast}`)

  let createUserIfNotExists : boolean = true
  // query the database for the user
  //   we use findFirst because we expect only one result
  //   cannot get unique because we don't have a unique on
  //   uncertain field
  let profile = await prisma.profile.findFirst({
    where: {
      slackId: slack_userID
    },
  })

  // if no profile, create one
  if(!profile) {
    try{
      profile = await createProfileID(slack_userID)
    } catch(err){
      console.log(`Error: couldn't find or create userID for slack_userID: ${slack_userID}\n Underlying error:\n`)
      console.log(err)
      res.send({
        response_type: 'ephemeral',
        text: `I couldn't create an account for your userID`,
      })
      return
    }
  }

  // get group ID
  let groupId = await getGroupIDFromSlack(slack_userID, true)
  if(groupId === undefined) {
    console.log(`Error: couldn't find slack group`)
    res.send({
      response_type: 'ephemeral',
      text: `I couldn't find your group! So I don't know what forecasts to show you.`,
    })
    return
  }


  let forecast_num : number = Number(forecast)

  //parse the date string
  let date : Date = new Date(date_str)

  await prisma.question.create({
    data: {
          title     : question,
          resolve_at: date,
          authorId  : profile!.id,
          groups    : {
            connect: {
              id: groupId
            }
          },
          forecasts : {
            create: {
              authorId : profile!.id,
              forecast : forecast_num
            }
          }
    },
  })

  try {
    res.send({
      response_type: 'in_channel',
      text: `I made a forecast for ${question} on ${date.toDateString()} with the forecast ${forecast} likelihood`,
    })
  } catch (err) {
    console.log('fetch Error:', err)
    res.send({
      response_type: 'ephemeral',
      text: `${err}`,
    })
  }
}
