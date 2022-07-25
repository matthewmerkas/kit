import { Router } from 'express'
import { Request as JWTRequest } from 'express-jwt'

import { User } from '../../bin/types'
import { MessageController } from '../controllers/message'
import { HttpError, sendError } from '../../bin/errors'
import { BaseRequests } from '../../bin/requests'

function messageRouter() {
  const controller = new MessageController()
  const path = 'message'
  const router = Router()
  const requests = new BaseRequests(controller, path)

  router.post(`/${path}`, (req: JWTRequest, res) => {
    requests.create(req, res)
  })

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
