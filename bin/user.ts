import mongoose from 'mongoose'

import { HttpError } from './errors'
import { User } from './types'

export const isAdmin = (user: User | undefined) => {
  return user?.roles != null && user.roles.indexOf('admin') > -1
}

export const isManager = (user: User | undefined) => {
  return user?.roles != null && user.roles.indexOf('manager') > -1
}

export const validateUser = (user?: User) => {
  if (user == null) {
    throw new HttpError('User must not be null')
  }
  if (typeof user !== 'object') {
    throw new HttpError('User must be an object')
  }
  if (!Array.isArray(user.roles)) {
    throw new HttpError('User roles must be an array')
  }
  if (
    'manager' in user.roles &&
    !mongoose.isValidObjectId(user.organisationId)
  ) {
    throw new HttpError('User organisation ID is invalid')
  }
}
