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
  try {
    return res.status(err.status ?? 422).json({ message: err.message })
  } catch (err) {
    console.error(err)
  }
}
