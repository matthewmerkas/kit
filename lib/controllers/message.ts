/**
 * message.ts
 *
 * This controller module implements CRUD methods for the message model
 */

import MessageModel from '../models/message'
import { BaseController } from './base'
import { Types } from 'mongoose'
import { validateUser } from '../../bin/user'
import { HttpError } from '../../bin/errors'
import { Message, User } from '../../bin/types'
import * as fs from 'fs'
import { DateTime } from 'luxon'
import path from 'path'

export class MessageController extends BaseController {
  constructor() {
    super(MessageModel)
  }

  create = (data: Message, user?: User) => {
    return new Promise((resolve, reject) => {
      validateUser(user)
      if (data == null && typeof data !== 'object') {
        return reject(new HttpError('Data must be an object'))
      }
      if (
        !data.audio?.recordDataBase64 ||
        !data.audio?.msDuration ||
        !data.audio?.mimeType
      ) {
        return reject(new HttpError('Malformed audio data'))
      }
      if (!Object.prototype.hasOwnProperty.call(data, 'isDeleted')) {
        data.isDeleted = false
      }
      data.duration = data.audio.msDuration
      // Store base64 audio data in file
      const date = DateTime.now().toFormat('yyMMdd-HHmmss')
      const rand = Math.random().toString(16).substr(2, 8)
      const fileName = `message_${date}_${rand}.opus`
      const filePath = path.normalize(`${require.main?.path}/public/audio/`)
      fs.writeFileSync(
        filePath + fileName,
        Buffer.from(data.audio?.recordDataBase64, 'base64')
      )
      delete data.audio
      data.audioUrl = `/audio/${fileName}`
      data.direction = 'send'

      const docSend = new this.Model(data)
      const userId = data.userId
      data.userId = data.peerId
      data.peerId = userId
      data.direction = 'receive'
      data.currentTime = 0
      const docReceive = new this.Model(data)

      return this.Model.insertMany([docSend, docReceive])
        .then((obj: Object[]) => {
          if (obj == null) {
            return reject(new HttpError('Could not create document'))
          }
          return resolve(obj[0])
        })
        .catch((err: any) => {
          return reject(err)
        })
    })
  }

  // Retrieves a list of the latest messages for the logged-in user
  getLatest = (userId: string) => {
    return new Promise((resolve, reject) => {
      this.Model.aggregate([
        { $match: { userId: new Types.ObjectId(userId) } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$peerId',
            doc: { $first: '$$ROOT' },
          },
        },
        { $replaceRoot: { newRoot: '$doc' } },
        {
          $lookup: {
            from: 'users',
            localField: 'peerId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $sort: { createdAt: -1 } },
      ])
        .unwind('user')
        .exec()
        .then((latest) => {
          return resolve(latest)
        })
        .catch((err: Error) => {
          return reject(err)
        })
    })
  }
}
