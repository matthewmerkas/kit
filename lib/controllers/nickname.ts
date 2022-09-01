/**
 * nickname.ts
 *
 * This controller module implements CRUD methods for the nickname model
 */

import NicknameModel from "../models/nickname";
import { BaseController } from './base'
import { User } from "../../bin/types";
import { validateUser } from "../../bin/user";
import { HttpError } from "../../bin/errors";

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
      if (data && this.validateId(data.userId) && this.validateId(data.peerId)) {
        const filter = {peerId: data.peerId, userId: data.userId}
        const query = this.Model.updateOne(filter, data, { new: true, upsert: true })
        query
          .exec()
          .then((value) => {
            if (value == null) {
              return reject(
                new HttpError(`Could not update ${this.Model.modelName}`)
              )
            }
            // TODO: Emit 'update nickname' event?
            return resolve(value)
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
