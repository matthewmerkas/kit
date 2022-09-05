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
import { FcmToken, Message, User } from '../../bin/types'
import fs from 'fs/promises'
import { DateTime } from 'luxon'
import path from 'path'
import { firebaseApp, io } from '../../api'
import UserModel from '../models/user'
import NicknameModel from '../models/nickname'

// TODO: Uncomment x86/64 line before committing
const normalize = require('ffmpeg-normalize') // Uncomment this line for x86/64
// const normalize: any = null // Uncomment this line for ARM

export class MessageController extends BaseController {
  constructor() {
    super(MessageModel)
  }

  create = (data: Message, user?: User) => {
    return new Promise(async (resolve, reject) => {
      validateUser(user)
      if (!user) return
      if (!data && typeof data !== 'object') {
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
      const inputFileName = `input_message_${date}_${rand}.opus`
      const outputFileName = `message_${date}_${rand}.opus`
      const filePath = path.normalize(`${require.main?.path}/public/audio/`)
      await fs.writeFile(
        filePath + inputFileName,
        Buffer.from(data.audio.recordDataBase64, 'base64')
      )
      delete data.audio
      // Normalise audio volume
      let normaliseError = true
      try {
        await normalize({
          input: filePath + inputFileName,
          output: filePath + outputFileName,
          loudness: {
            normalization: 'ebuR128',
            target: {
              input_i: -23,
              input_lra: 7.0,
              input_tp: -2.0,
            },
          },
        })
        normaliseError = false
      } catch (err) {
        console.log(err)
        console.log('Normalisation failed. Falling back to original input file')
        await fs
          .unlink(filePath + outputFileName)
          .catch((err) => console.log(err))
        await fs
          .rename(filePath + inputFileName, filePath + outputFileName)
          .catch((err) => console.log(err))
      }
      if (!normaliseError) {
        await fs
          .unlink(filePath + inputFileName)
          .catch((err) => console.log(err))
      }
      data.audioFileName = outputFileName
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
              .then(async (doc: any) => {
                const peer: User = doc.toObject()
                const nickname = await NicknameModel.findOne({
                  userId: docReceive.peer,
                  peerId: docReceive.user,
                })
                  .exec()
                  .then((doc) => {
                    return doc?.value as string
                  })
                const message = {
                  data: {
                    peerId: user._id?.toString() || '',
                    peerDisplayName: nickname || user.displayName || '',
                  },
                  notification: {
                    title: user?.displayName,
                    body: 'New message',
                  },
                }
                if (peer.fcmTokens) {
                  const ids = peer.fcmTokens.map((token: FcmToken) => token.id)
                  return firebaseApp
                    .messaging()
                    .sendToDevice(ids, message)
                    .then(() => {
                      return resolve(docSend)
                    })
                    .catch((err) => {
                      console.log(err)
                    })
                    .finally(() => {
                      return resolve(docSend)
                    })
                } else {
                  console.log('No FCM token for @' + peer.username)
                  return resolve(docSend)
                }
              })
          })
          .catch(async (err: any) => {
            await fs
              .unlink(filePath + inputFileName)
              .catch((err) => console.log(err))
            await fs
              .unlink(filePath + outputFileName)
              .catch((err) => console.log(err))
            return reject(err)
          })
      } else {
        return docSend
          .save()
          .then(() => {
            return resolve(docSend)
          })
          .catch(async (err: any) => {
            await fs
              .unlink(filePath + inputFileName)
              .catch((err) => console.log(err))
            await fs
              .unlink(filePath + outputFileName)
              .catch((err) => console.log(err))
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
          $lookup: {
            from: 'nicknames',
            let: { peerId: '$peer._id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$peerId', '$$peerId'] },
                      { $eq: ['$userId', new Types.ObjectId(userId)] },
                    ],
                  },
                },
              },
            ],
            as: 'peer.nickname',
          },
        },
        {
          $unwind: { path: '$peer.nickname', preserveNullAndEmptyArrays: true },
        },
        {
          $project: {
            createdAt: true,
            currentTime: true,
            peer: {
              _id: true,
              avatarFileName: true,
              displayName: true,
              nickname: '$peer.nickname.value',
            },
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
