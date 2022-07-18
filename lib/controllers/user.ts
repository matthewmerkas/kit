/**
 * user.ts
 *
 * This controller module implements CRUD methods for the user collection
 */

import * as crypto from 'crypto'
import * as jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

import { jwtSecret } from '../../api'
import { HttpError } from '../../bin/errors'
import { Hash, Login, User } from '../../bin/types'
import UserModel from '../models/user'
import { BaseController } from './base'
import { validateUser } from '../../bin/user'

const JWT_EXPIRY = process.env.JWT_EXPRIY ? process.env.JWT_EXPRIY : '1hr'
const MIN_PASSWORD_LENGTH = process.env.MIN_PASSWORD_LENGTH
  ? process.env.MIN_PASSWORD_LENGTH
  : 8

export class UserController extends BaseController {
  constructor() {
    super(UserModel)
  }

  /* Crypto (based on https://blog.logrocket.com/building-a-password-hasher-in-node-js/) */
  // Generates random hexadecimal string of specified length (16 by default)
  generateSalt = (length = 16) => {
    return crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length)
  }

  // Hashes password using sha512 and returns {salt, hash} object
  private createHash = (password: string | undefined, salt: string) => {
    if (password == null || salt == null) {
      throw new HttpError('Password and salt must not be null')
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new HttpError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      )
    }
    const hash = crypto.createHmac('sha512', salt)
    hash.update(password)
    const value = hash.digest('hex')
    return {
      salt: salt,
      hash: value,
    }
  }

  // Compares password with given hash object
  private compare = (password: string | undefined, hashObject: Hash) => {
    if (password == null || hashObject == null) {
      throw new HttpError('Password and hash must not be null')
    }
    const toCompare = this.createHash(password, hashObject.salt)
    return toCompare.hash === hashObject.hash
  }

  // Authenticates user with username and password
  login = (data: Login) => {
    return new Promise((resolve, reject) => {
      if (data == null) {
        return reject(new HttpError('Data must not be null'))
      }
      if (data.username == null) {
        return reject(new HttpError('Username must not be null'))
      }
      this.Model.findOne({ username: data.username })
        .exec()
        .then((user: { password: Hash; toObject: () => any }) => {
          if (user && this.compare(data.password, user.password)) {
            const payload = user.toObject()
            delete payload.password
            const token = jwt.sign(payload, jwtSecret, {
              expiresIn: JWT_EXPIRY,
            })
            return resolve({ token })
          } else {
            return reject(
              new HttpError('Username and password do not match', 401)
            )
          }
        })
        .catch((err: Error) => {
          return reject(err)
        })
    })
  }

  // Creates user with username and password
  create = (data: User): Promise<User | Error> => {
    return new Promise((resolve, reject) => {
      if (typeof data !== 'object') {
        return reject(new HttpError('Data must be an object'))
      }
      if (typeof data.username !== 'string') {
        return reject(new HttpError('Username must be a string'))
      }
      if (typeof data.displayName !== 'string') {
        return reject(new HttpError('Display name must be a string'))
      }
      if (typeof data.password !== 'string') {
        return reject(new HttpError('Password must be a string'))
      }
      if (!Object.prototype.hasOwnProperty.call(data, 'isDeleted')) {
        data.isDeleted = false
      }
      const password = this.createHash(data.password, this.generateSalt())
      const user = new this.Model({
        ...data,
        password,
      })
      return user
        .save()
        .then((user: User) => {
          user.password = undefined
          return resolve(user)
        })
        .catch((err: any) => {
          if (err.code === 11000) {
            return reject(
              new Error(`Username '${err.keyValue.username}' is unavailable`)
            )
          }
          return reject(err)
        })
    })
  }

  // Updates a user by ID
  update = (id: string, data: User, user?: User) => {
    return new Promise((resolve, reject) => {
      validateUser(user)
      const filter = this.getFilter(id, user)
      if (mongoose.isValidObjectId(id)) {
        if (typeof data !== 'object') {
          throw new HttpError('Data must be an object')
        }
        const user: NonNullable<User> = {
          ...data,
          password: data.password
            ? this.createHash(data.password, this.generateSalt())
            : undefined,
        }
        this.Model.findOneAndUpdate(filter, user, { new: true })
          .exec()
          .then((user: any) => {
            if (user == null) {
              return reject(new HttpError('Could not update user'))
            }
            user.password = undefined
            return resolve(user)
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
