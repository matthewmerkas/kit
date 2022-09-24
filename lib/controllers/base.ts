/**
 * base.ts
 *
 * This controller module implements base CRUD methods
 */

import {
  Document,
  isObjectIdOrHexString,
  Model,
  PipelineStage,
  Types,
} from 'mongoose'

import { HttpError } from '../../bin/errors'
import { QueryParams, SoftDeletes, User } from '../../bin/types'
import { isAdmin, validateUser } from '../../bin/user'
import { io } from '../../api'

export class BaseController {
  Model: Model<any>
  populateKeys: string[]

  constructor(Model: Model<any>, populateKeys: string[] = []) {
    this.Model = Model
    this.populateKeys = populateKeys
  }

  validateId = (id?: string) => {
    if (id) {
      if (this.Model.modelName === 'Rfid') {
        return true
      } else {
        return isObjectIdOrHexString(id)
      }
    }
    return false
  }

  // Filter results based on user ID
  getFilter = (id?: string, user?: User, objectIds = false) => {
    const exempt = ['Rfid']
    const filter: any = {}
    if (id) {
      if (this.Model.modelName === 'Rfid') {
        filter.tagId = objectIds ? new Types.ObjectId(id) : id
      } else {
        filter._id = objectIds ? new Types.ObjectId(id) : id
      }
    }
    if (
      user &&
      !isAdmin(user) &&
      this.Model.schema.obj.user != null &&
      !exempt.includes(this.Model.modelName)
    ) {
      filter.user = objectIds ? new Types.ObjectId(user._id) : user._id
    }
    return filter
  }

  getNicknamePipeline(userId: string) {
    return [
      {
        $lookup: {
          from: 'nicknames',
          let: { peerId: '$_id' },
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
          as: 'nickname',
        },
      },
      {
        $unwind: {
          path: '$nickname',
          preserveNullAndEmptyArrays: true,
        },
      },
      { $addFields: { nickname: '$nickname.value' } },
      {
        $project: {
          nicknames: false,
        },
      },
    ]
  }

  // Parses JSON in filter query parameter
  parseParams = (params: QueryParams) => {
    const reviver = (key: string, value: any) => {
      if (isObjectIdOrHexString(value)) {
        return new Types.ObjectId(value)
      }
      return value
    }

    for (const [key, text] of Object.entries(params)) {
      try {
        params[key] = JSON.parse(text, reviver)
      } catch (e) {
        params[key] = isObjectIdOrHexString(text)
          ? new Types.ObjectId(text)
          : text
      }

      // Cast ISO strings to Date objects for aggregation pipeline
      if (key === 'createdAt' || key === 'updatedAt') {
        const castDate = (key: string, value: any) => {
          if (
            typeof value === 'object' &&
            !Array.isArray(value) &&
            value !== null
          ) {
            for (const [k, v] of Object.entries(value)) {
              value[k] = castDate(k, v)
            }
            return value
          } else {
            try {
              return new Date(value)
            } catch (e) {
              return value
            }
          }
        }
        params = castDate(key, params)
      }
    }
    return params
  }

  // Creates a document
  create = (data: any, user?: User) => {
    return new Promise((resolve, reject) => {
      validateUser(user)
      if (data == null && typeof data !== 'object') {
        return reject(new HttpError('Data must be an object'))
      }
      if (
        this.Model.schema.obj.isDeleted != null &&
        !Object.prototype.hasOwnProperty.call(data, 'isDeleted')
      ) {
        data.isDeleted = false
      }
      const doc = new this.Model(data)
      return doc
        .save()
        .then((doc: Document) => {
          if (this.Model.modelName === 'Rfid') {
            const tagId = doc.toObject().tagId
            io.emit('create rfid', { tagId })
          }
          return resolve(doc)
        })
        .catch((err: any) => {
          if (err.code === 11000) {
            const article = ['Rfid'].includes(this.Model.modelName) ? 'An' : 'A'
            return reject(
              new Error(
                `${article} ${this.Model.modelName} already exists with name '${err.keyValue.name}'`
              )
            )
          }
          return reject(err)
        })
    })
  }

  // Retrieves a document by ID
  get = (id?: string, projection?: Object, user?: User) => {
    return new Promise((resolve, reject) => {
      validateUser(user)
      if (!user || !user._id) return

      const filter = this.getFilter(id, user, true)
      if (this.validateId(id)) {
        const pipeline: PipelineStage[] = []
        for (const key of this.populateKeys) {
          if (key === 'nicknames') {
            pipeline.push(...this.getNicknamePipeline(user._id))
          } else {
            const obj = this.Model.schema.obj[key] as any
            if (typeof obj?.ref === 'string') {
              const from = obj.ref.toLowerCase() + 's'
              pipeline.push({
                $lookup: {
                  from,
                  localField: key,
                  foreignField: '_id',
                  as: key,
                },
              })
              pipeline.push({ $unwind: '$' + key })
              pipeline.push({
                $project: {
                  [key]: {
                    fcmTokens: false,
                    nicknames: false,
                    password: false,
                    roles: false,
                  },
                },
              },)
            }
          }
        }
        if (filter) {
          pipeline.push({ $match: filter })
        }
        if (projection) {
          pipeline.push({ $project: projection })
        }

        this.Model.aggregate(pipeline)
          .exec()
          .then((docs: Document[]) => {
            const doc = docs[0]
            if (doc == null && this.Model.modelName !== 'Rfid') {
              return reject(
                new HttpError(`Could not find ${this.Model.modelName}`)
              )
            }
            return resolve(doc)
          })
          .catch((err: Error) => {
            return reject(err)
          })
      } else {
        return reject(new HttpError('Invalid ID'))
      }
    })
  }

  // Retrieves a list of documents
  getList = (params: QueryParams, projection?: Object, user?: User) => {
    return new Promise((resolve, reject) => {
      const limit = Number(params.limit)
      delete params.limit
      const sort = params.sort
      delete params.sort
      const filter = Object.assign(
        this.getFilter(undefined, user, true),
        this.parseParams(params)
      )
      const pipeline: PipelineStage[] = []
      if (user?._id != null && this.populateKeys.includes('nicknames')) {
        pipeline.push(...this.getNicknamePipeline(user._id))
      }
      if (filter) {
        pipeline.push({ $match: filter })
      }
      if (projection) {
        pipeline.push({ $project: projection })
      }
      if (sort) {
        const direction = sort.charAt(0) === '-' ? -1 : 1
        const key = sort.replace('-', '')
        pipeline.push({ $sort: { [key]: direction } })
      }
      if (limit && !isNaN(limit)) {
        pipeline.push({ $limit: limit })
      }

      this.Model.aggregate(pipeline)
        .exec()
        .then((docs: Document[]) => {
          return resolve(docs)
        })
        .catch((err: Error) => {
          return reject(err)
        })
    })
  }

  // Updates a document by ID
  set = (id: string, data: any, user?: User, emitEvent = true) => {
    return new Promise((resolve, reject) => {
      validateUser(user)
      const filter = this.getFilter(id, user)
      if (data == null && typeof data !== 'object') {
        return reject(new HttpError('Data must be an object'))
      }
      if (this.validateId(id)) {
        const query = this.Model.findOneAndUpdate(filter, data, { new: true })
        for (const key of this.populateKeys) {
          query.populate(key, ['-fcmTokens', '-password'])
        }
        query
          .exec()
          .then((doc: Document) => {
            if (doc == null) {
              return reject(
                new HttpError(`Could not update ${this.Model.modelName}`)
              )
            }
            if (this.Model.modelName === 'Rfid') {
              const tagId = doc.toObject().tagId
              io.emit('update rfid', { tagId })
            } else if (emitEvent) {
              io.emit(`update ${this.Model.modelName.toLowerCase()}`, {
                _id: doc.toObject()._id,
              })
            }
            return resolve(doc)
          })
          .catch((err: Error) => {
            return reject(err)
          })
      } else {
        return reject(new HttpError('Invalid ID'))
      }
    })
  }

  // Updates a document by ID without removing missing fields
  patch = (id: string, data: any, user?: User) => {
    return new Promise((resolve, reject) => {
      if (this.validateId(id)) {
        const filter = this.getFilter(id, user)
        this.Model.findOne(filter)
          .exec()
          .then((doc: Document) => {
            if (doc == null) {
              return reject(
                new HttpError(`Could not update ${this.Model.modelName}`)
              )
            }
            let emitEvent = true
            if (this.Model.modelName === 'User' && 'fcmToken' in data) {
              // Don't emit events if we're just updating FCM tokens
              if (Object.keys(data).length === 1) {
                emitEvent = false
              }
              // Update fcmTokens array
              let found = false
              const now = Date.now()
              const pruneAge = 60 * 24 * 60 * 60 * 1000 // 60 days
              data.fcmTokens = doc.toObject().fcmTokens || []
              for (const [i, t] of data.fcmTokens.entries()) {
                if (t.id === data.fcmToken) {
                  found = true
                  data.fcmTokens[i].timestamp = now
                } else if (now - t.timestamp >= pruneAge) {
                  data.fcmTokens.splice(i, 1)
                }
              }
              if (!found) {
                data.fcmTokens.push({ id: data.fcmToken, timestamp: now })
              }
            }
            return resolve(
              this.set(id, { ...doc.toObject(), ...data }, user, emitEvent)
            )
          })
      } else {
        return reject(new HttpError('Invalid ID'))
      }
    })
  }

  // Deletes a document by ID
  delete = (id: string, user?: User) => {
    return new Promise((resolve, reject) => {
      validateUser(user)
      const filter = this.getFilter(id, user)
      if (this.validateId(id)) {
        this.Model.findOne(filter)
          .exec()
          .then((doc: SoftDeletes) => {
            if (doc == null) {
              return reject(
                new HttpError(`Could not find ${this.Model.modelName}`)
              )
            }
            if (doc.isDeleted) {
              return this.Model.findByIdAndDelete(id)
                .exec()
                .then((doc: Document) => {
                  return resolve(doc)
                })
                .catch((err: Error) => {
                  return reject(err)
                })
            }
            return resolve(this.set(id, { isDeleted: true }, user))
          })
      } else {
        return reject(new HttpError('Invalid ID'))
      }
    })
  }
}
