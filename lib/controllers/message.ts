/**
 * message.ts
 *
 * This controller module implements CRUD methods for the message model
 */

import MessageModel from '../models/message'
import { BaseController } from './base'
import { Types } from "mongoose";

export class MessageController extends BaseController {
  constructor() {
    super(MessageModel)
  }

  // Retrieves a list of the latest messages for the logged-in user
  getLatest = (userId: string) => {
    // TODO: Exclude logged-in userId from peerId results
    return new Promise((resolve, reject) => {
      this.Model.aggregate([
        { $match: { userId: new Types.ObjectId(userId) } },
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
