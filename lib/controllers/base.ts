/**
 * base.ts
 *
 * This controller module implements base CRUD methods
 */

import mongoose, { Model } from 'mongoose'

import { HttpError } from '../../bin/errors'
import { Filter, QueryParams, SoftDeletes, User } from '../../bin/types'
import { validateUser } from '../../bin/user'

export class BaseController {
  Model: Model<any>
  populateKeys: string[]

  constructor(Model: mongoose.Model<any>, populateKeys: string[] = []) {
    this.Model = Model
    this.populateKeys = populateKeys
  }

  // Filter results based on user ID
  getFilter = (id?: string, user?: User) => {
    const filter: Filter = id ? { _id: id } : {}
    if (this.Model.schema.obj.userId != null) {
      filter.userId = user?._id
    }
    return filter
  }

  // Creates a document
  create = (data: any, user?: User) => {
    return new Promise((resolve, reject) => {
      validateUser(user)
      if (data == null && typeof data !== 'object') {
        return reject(new HttpError('Data must be an object'))
      }
      if (!Object.prototype.hasOwnProperty.call(data, 'isDeleted')) {
        data.isDeleted = false
      }
      const doc = new this.Model(data)
      return doc
        .save()
        .then((obj: Object) => {
          if (obj == null) {
            return reject(new HttpError('Could not create document'))
          }
          return resolve(doc)
        })
        .catch((err: any) => {
          if (err.code === 11000) {
            const article = [
              'Item',
              'Order',
              'OrderStatus',
              'Organisation',
            ].includes(this.Model.modelName)
              ? 'An'
              : 'A'
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
  get = (
    id?: string,
    projection?: Object | String | Array<String>,
    user?: User
  ) => {
    return new Promise((resolve, reject) => {
      validateUser(user)
      const filter = this.getFilter(id, user)
      if (id != null && mongoose.isValidObjectId(id)) {
        const query = this.Model.findOne(filter, projection)
        for (const key of this.populateKeys) {
          query.populate(key)
        }
        query
          .exec()
          .then((obj: Object) => {
            if (obj == null) {
              return reject(
                new HttpError(`Cannot find ${this.Model.modelName}`)
              )
            }
            return resolve(obj)
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
  getList = (
    params: QueryParams,
    projection?: Object | String | Array<String>,
    user?: User
  ) => {
    return new Promise((resolve, reject) => {
      validateUser(user)
      const filter = Object.assign(this.getFilter(undefined, user), params, {
        sort: undefined,
      })
      const query = this.Model.find(filter, projection).sort(params.sort)
      for (const key of this.populateKeys) {
        query.populate(key)
      }
      query
        .exec()
        .then((objs: Object[]) => {
          return resolve(objs)
        })
        .catch((err: Error) => {
          return reject(err)
        })
    })
  }

  // Updates a document by ID
  update = (id: string, data: any, user?: User) => {
    return new Promise((resolve, reject) => {
      validateUser(user)
      const filter = this.getFilter(id, user)
      if (data == null && typeof data !== 'object') {
        return reject(new HttpError('Data must be an object'))
      }
      if (id != null && mongoose.isValidObjectId(id)) {
        this.Model.findOneAndUpdate(filter, data, { new: true })
          .exec()
          .then((obj: Object) => {
            if (obj == null) {
              return reject(
                new HttpError(`Could not update ${this.Model.modelName}`)
              )
            }
            return resolve(obj)
          })
          .catch((err: Error) => {
            return reject(err)
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
      if (id != null && mongoose.isValidObjectId(id)) {
        this.Model.findOne(filter)
          .exec()
          .then((obj: SoftDeletes) => {
            if (obj == null) {
              return reject(
                new HttpError(`Could not find ${this.Model.modelName}`)
              )
            }
            if (obj.isDeleted) {
              return this.Model.findByIdAndDelete(id)
                .exec()
                .then((obj: Object) => {
                  return resolve(obj)
                })
                .catch((err: Error) => {
                  return reject(err)
                })
            }
            return resolve(this.update(id, { isDeleted: true }, user))
          })
      } else {
        return reject(new HttpError('Invalid ID'))
      }
    })
  }

  // Retrieves the timestamp of the last updated document
  lastUpdated = (user?: User) => {
    const filter = this.getFilter(undefined, user)
    return new Promise((resolve) => {
      this.Model.findOne(filter, { updatedAt: 1 }).then(
        (obj: { updatedAt: Date }) => {
          return resolve(obj.updatedAt)
        }
      )
    })
  }
}
