import { Router } from 'express'

import { HttpError, sendError } from '../../bin/errors'
import { NicknameController } from '../controllers/nickname'
import { User } from '../../bin/types'
import { Request as JWTRequest } from 'express-jwt'

function nicknameRouter() {
  const controller = new NicknameController()
  const router = Router()

  // Retrieves a value by key
  router.post(`/nickname`, (req: JWTRequest, res) => {
    const user: User | undefined = req.auth
    if (user?._id) {
      controller
        .set(req.body, user)
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

export default nicknameRouter
