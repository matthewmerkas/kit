import { HttpError } from './errors'
import { User } from './types'

export const isAdmin = (user: User | undefined) => {
  return user?.roles != null && user.roles.indexOf('admin') > -1
}

export const validateUser = (user?: User) => {
  if (user == null) {
    throw new HttpError('User must not be null')
  }
  if (typeof user !== 'object') {
    throw new HttpError('User must be an object')
  }
}
