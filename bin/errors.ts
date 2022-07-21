import { Response } from 'express'

import { Error } from './types'

export const HttpError = class HttpError extends Error {
  private status: number

  constructor(message: string, status = 422) {
    super(message)
    this.status = status
  }
}

export const sendError = (res: Response, err: Error) => {
  let message = err.message
  switch (err.code) {
    case 'credentials_required':
      message = 'Please log in to access this resource'
      break
    case 'invalid_token':
      message = 'Please log in again to access this resource'
      break
  }
  const json = Object.assign({ message }, err)
  return res.status(json.status ?? 422).json(json)
}
