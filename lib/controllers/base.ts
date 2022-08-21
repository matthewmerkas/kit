/**
 * base.ts
 *
 * This controller module implements base CRUD methods
 */

import mongoose, { Document, Model } from 'mongoose'

import { HttpError } from '../../bin/errors'
import { QueryParams, SoftDeletes, User } from '../../bin/types'
import { isAdmin, validateUser } from '../../bin/user'
import { io } from '../../api'

export class BaseController {
  Model: Model<any>
  populateKeys: string[]

  constructor(Model: mongoose.Model<any>, populateKeys: string[] = []) {
    this.Model = Model
    this.populateKeys = populateKeys
  }

  validateId = (id?: string) => {
    if (id) {
      if (this.Model.modelName === 'Rfid') {
        return true
      } else {
        return mongoose.isValidObjectId(id)
      }
    }
    return false
  }

  // Filter results based on user ID
  getFilter = (id?: string, user?: User) => {
    const exempt = ['Rfid']
    const filter: any = {}
    if (id) {
      if (this.Model.modelName === 'Rfid') {
        filter.tagId = id
      } else {
        filter._id = id
      }
    }
    if (
      !isAdmin(user) &&
      this.Model.schema.obj.user != null &&
      !exempt.includes(this.Model.modelName)
    ) {
      filter.user = user?._id
    }
    return filter
  }

  // Parses JSON in filter query parameter
  parseParams = (params: QueryParams) => {
    for (const [key, value] of Object.entries(params)) {
      try {
        params[key] = JSON.parse(value)
      } catch (e) {}
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
          if (doc == null) {
            return reject(new HttpError('Could not create document'))
          }
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
  get = (
    id?: string,
    projection?: Object | String | Array<String>,
    user?: User
  ) => {
    return new Promise((resolve, reject) => {
      validateUser(user)
      const filter = this.getFilter(id, user)
      if (this.validateId(id)) {
        const query = this.Model.findOne(filter, projection)
        for (const key of this.populateKeys) {
          query.populate(key, '-password')
        }
        query
          .exec()
          .then((doc: Document) => {
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
  getList = (
    params: QueryParams,
    projection?: Object | String | Array<String>,
    user?: User
  ) => {
    return new Promise((resolve, reject) => {
      validateUser(user)
      const filter = Object.assign(
        this.getFilter(undefined, user),
        this.parseParams(params),
        {
          sort: undefined,
        }
      )
      let query = this.Model.find(filter, projection).sort(params.sort)
      if (params.limit && !isNaN(params.limit)) {
        query = query.limit(params.limit)
      }
      // for (const key of this.populateKeys) {
      //   query.populate(key, '-password')
      // }
      query
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
  set = (id: string, data: any, user?: User) => {
    return new Promise((resolve, reject) => {
      validateUser(user)
      const filter = this.getFilter(id, user)
      if (data == null && typeof data !== 'object') {
        return reject(new HttpError('Data must be an object'))
      }
      if (this.validateId(id)) {
        const query = this.Model.findOneAndUpdate(filter, data, { new: true })
        for (const key of this.populateKeys) {
          query.populate(key, '-password')
        }
        query
          .exec()
          .then((doc: Document) => {
            if (doc == null) {
              return reject(
                new HttpError(`Could not update ${this.Model.modelName}`)
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
            if (this.Model.modelName === 'Rfid') {
              const tagId = doc.toObject().tagId
              io.emit('patch rfid', { tagId })
            }
            return resolve(this.set(id, { ...doc.toObject(), ...data }, user))
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
