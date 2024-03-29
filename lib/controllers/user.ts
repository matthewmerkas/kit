/**
 * user.ts
 *
 * This controller module implements CRUD methods for authorisation and the user model
 */

import * as crypto from 'crypto'
import * as jwt from 'jsonwebtoken'
import { Document, isObjectIdOrHexString } from 'mongoose'

import { jwtSecret, jwtRefreshSecret } from '../../api'
import { HttpError } from '../../bin/errors'
import { Hash, Login, Logout, Token, User } from '../../bin/types'
import UserModel from '../models/user'
import { BaseController } from './base'
import { isAdmin, validateUser } from '../../bin/user'
import { DateTime } from 'luxon'
import path from 'path'
import fs from 'fs/promises'
import NicknameModel from '../models/nickname'

const JWT_EXPIRY = process.env.JWT_EXPRIY ? process.env.JWT_EXPRIY : '1hr'
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPRIY
  ? process.env.JWT_REFRESH_EXPRIY
  : '30d'
const MIN_PASSWORD_LENGTH = process.env.MIN_PASSWORD_LENGTH
  ? process.env.MIN_PASSWORD_LENGTH
  : 8

export class UserController extends BaseController {
  private path = `${require.main?.path}/public/avatars/`

  constructor() {
    super(UserModel, ['nicknames'])
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

  // Store base64 image data in file
  private writeToFile = async (data: User) => {
    if (data.avatar) {
      const date = DateTime.now().toFormat('yyMMdd-HHmmss')
      const rand = Math.random().toString(16).substr(2, 8)
      const fileName = `avatar_${date}_${rand}.${data.avatar.extension}`
      const filePath = path.normalize(this.path)
      await fs.writeFile(
        filePath + fileName,
        Buffer.from(data.avatar.base64, 'base64')
      )
      delete data.avatar
      data.avatarFileName = fileName
      return fileName
    }
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
            const refreshToken = jwt.sign(payload, jwtRefreshSecret, {
              expiresIn: JWT_REFRESH_EXPIRY,
            })
            return resolve({ token, refreshToken })
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

  logout = (data: Logout, user?: User) => {
    return new Promise((resolve, reject) => {
      validateUser(user)
      if (data == null) {
        return reject(new HttpError('Data must not be null'))
      }
      if (data.fcmToken) {
        this.Model.findOne({ username: user?.username })
          .exec()
          .then((doc: Document) => {
            // Disassociate FCM token on logout
            const fcmTokens = doc.toObject().fcmTokens || []
            for (const [i, t] of fcmTokens.entries()) {
              if (t.id === data.fcmToken) {
                delete fcmTokens[i]
              }
            }
            this.Model.updateOne({ username: user?.username }, { fcmTokens })
              .exec()
              .then(() => {
                return resolve('Logged-out successfully')
              })
              .catch((err: Error) => {
                return reject(err)
              })
          })
          .catch((err: Error) => {
            return reject(err)
          })
      }
      return resolve('Logged-out successfully')
    })
  }

  refresh = (data: Token) => {
    return new Promise((resolve, reject) => {
      // https://gist.github.com/ziluvatar/a3feb505c4c0ec37059054537b38fc48
      const payload = jwt.verify(
        data.refreshToken!,
        jwtRefreshSecret
      ) as jwt.JwtPayload
      delete payload.iat
      delete payload.exp
      delete payload.nbf
      delete payload.jti // We are generating a new token
      const token = jwt.sign(payload, jwtSecret, {
        expiresIn: JWT_EXPIRY,
      })
      return resolve({ token })
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
      const fileName = this.writeToFile(data)
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
        .catch(async (err: any) => {
          if (err.code === 11000) {
            return reject(
              new HttpError(
                `Username '${err.keyValue.username}' is unavailable`
              )
            )
          }
          await fs.unlink(this.path + fileName).catch((err) => console.log(err))
          return reject(err)
        })
    })
  }

  // Updates a user by ID
  set = (id: string, data: User, user?: User) => {
    return new Promise(async (resolve, reject) => {
      validateUser(user)
      const filter = this.getFilter(id, user)
      if (!isAdmin(user)) {
        delete data.roles
      }
      if (isObjectIdOrHexString(id)) {
        if (typeof data !== 'object') {
          throw new HttpError('Data must be an object')
        }
        const oldFileName = data.avatarFileName
        const fileName = await this.writeToFile(data)
        const user: NonNullable<User> = {
          ...data,
          password:
            data.password && typeof data.password === 'string'
              ? this.createHash(data.password, this.generateSalt())
              : undefined,
        }
        this.Model.findOneAndUpdate(filter, user, { new: true })
          .select(['-fcmTokens'])
          .exec()
          .then(async (doc: Document) => {
            const user = doc.toObject()
            if (user == null) {
              return reject(new HttpError('Could not find User'))
            }
            if (fileName && oldFileName && fileName !== oldFileName) {
              await fs
                .unlink(this.path + oldFileName)
                .catch((err) => console.log(err))
            }
            user.nickname = await NicknameModel.findOne({
              userId: user._id,
              peerId: id,
            })
              .exec()
              .then((doc) => {
                return doc?.value as string
              })
            delete user.nicknames
            delete user.password
            return resolve(user)
          })
          .catch(async (err: any) => {
            await fs
              .unlink(this.path + fileName)
              .catch((err) => console.log(err))
            if (err.code === 11000) {
              return reject(
                new HttpError(
                  `Username '${err.keyValue.username}' is unavailable`
                )
              )
            }
            return reject(err)
          })
      } else {
        return reject(new HttpError('Invalid ID'))
      }
    })
  }
}
