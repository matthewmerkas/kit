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
import { firebaseApp, io } from '../../api'
import UserModel from '../models/user'

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
      data.audioFileName = fileName
      data.direction = 'send'
      const docSend = new this.Model(data)

      if (data.user !== data.peer) {
        const peerId = data.user
        data.user = data.peer
        data.peer = peerId
        data.direction = 'receive'
        data.currentTime = 0
        const docReceive = new this.Model(data)
        return this.Model.insertMany([docSend, docReceive])
          .then(() => {
            io.emit('create message', {
              _id: docReceive._id,
              user: docReceive.user,
            })
            return UserModel.findById(docReceive.user)
              .exec()
              .then((doc: any) => {
                const peer: User = doc.toObject()
                const message = {
                  data: {
                    peerId: user?._id?.toString() || '',
                    peerDisplayName: user?.displayName || '',
                  },
                  notification: {
                    title: user?.displayName,
                    body: 'New message',
                  },
                }
                if (peer.fcmToken) {
                  return firebaseApp
                    .messaging()
                    .sendToDevice(peer.fcmToken, message)
                    .then(() => {
                      return resolve(docSend)
                    })
                    .catch((err) => {
                      console.log(err)
                    }).finally(() => {
                      return resolve(docSend)
                    })
                } else {
                  console.log('No FCM token for @' + peer.username)
                  return resolve(docSend)
                }
              })
          })
          .catch((err: any) => {
            fs.unlink(filePath + fileName, (err) => {
              console.log(err)
            })
            return reject(err)
          })
      } else {
        return docSend
          .save()
          .then(() => {
            return resolve(docSend)
          })
          .catch((err: any) => {
            fs.unlink(filePath + fileName, (err) => {
              console.log(err)
            })
            return reject(err)
          })
      }
    })
  }

  // Retrieves a list of the latest messages for the logged-in user
  getLatest = (userId: string) => {
    return new Promise((resolve, reject) => {
      this.Model.aggregate([
        { $match: { user: new Types.ObjectId(userId) } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: { peer: '$peer' },
            doc: { $first: '$$ROOT' },
          },
        },
        { $replaceRoot: { newRoot: '$doc' } },
        {
          $lookup: {
            from: 'users',
            localField: 'peer',
            foreignField: '_id',
            as: 'peer',
          },
        },
        { $unwind: '$peer' },
        {
          $project: {
            createdAt: true,
            currentTime: true,
            peer: { _id: true, avatarFileName: true, displayName: true },
          },
        },
        { $sort: { createdAt: -1 } },
      ])
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
