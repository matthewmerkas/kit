import { Router } from 'express'
import { Request as JWTRequest } from 'express-jwt'

import { User } from '../../bin/types'
import { MessageController } from '../controllers/message'
import { HttpError, sendError } from '../../bin/errors'

function messageRouter() {
  const controller = new MessageController()
  const path = 'message'
  const router = Router()

  // Retrieves a list of the latest messages for the logged-in user
  router.get(`/${path}/latest`, (req: JWTRequest, res) => {
    const user: User = req.auth!
    if (user?._id) {
      controller
        .getLatest(user._id)
        .then((data) => {
          res.json(data)
        })
        .catch((err) => {
          sendError(res, err)
        })
    } else {
      throw new HttpError('Could not find User ID')
    }
  })

  return router
}

export default messageRouter
