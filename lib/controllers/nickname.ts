/**
 * nickname.ts
 *
 * This controller module implements CRUD methods for the nickname model
 */

import NicknameModel from '../models/nickname'
import { BaseController } from './base'
import { User } from '../../bin/types'
import { validateUser } from '../../bin/user'
import { HttpError } from '../../bin/errors'
import { startSession } from 'mongoose'
import UserModel from '../models/user'

export class NicknameController extends BaseController {
  constructor() {
    super(NicknameModel)
  }

  // Updates a nickname by userId & peerId
  set = (data: any, user?: User) => {
    return new Promise((resolve, reject) => {
      validateUser(user)
      if (data == null && typeof data !== 'object') {
        return reject(new HttpError('Data must be an object'))
      }
      if (
        data &&
        this.validateId(data.userId) &&
        this.validateId(data.peerId)
      ) {
        const filter = { peerId: data.peerId, userId: data.userId }
        startSession()
          .then((session) => {
            return session.withTransaction(async () => {
              const newNickname = await this.Model.findOneAndUpdate(
                filter,
                data,
                { new: true, upsert: true }
              ).exec()
              const user = await UserModel.findById(newNickname.peerId).exec()
              if (user == null) {
                return reject(
                  new HttpError(`Could not update ${this.Model.modelName}`)
                )
              }
              let toPush = true
              for (const [i, nickname] of user.nicknames.entries()) {
                if (newNickname._id.equals(nickname)) {
                  user.nicknames[i] = newNickname
                  toPush = false
                  break
                }
              }
              if (toPush) {
                user.nicknames.push(newNickname)
              }
              return user.save()
            })
          })
          .then(() => {
            // TODO: Emit 'update nickname' event?
            return resolve(data)
          })
          .catch((err: Error) => {
            return reject(err)
          })
      } else {
        return reject(new HttpError('Invalid ID'))
      }
    })
  }
}
