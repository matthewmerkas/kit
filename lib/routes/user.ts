import { Router } from 'express'

import { sendError } from '../../bin/errors'
import { UserController } from '../controllers/user'
import { User } from '../../bin/types'
import { projectionMap } from './base'

function userRouter() {
  const controller = new UserController()
  const path = 'user'
  const router = Router()

  // Retrieves a document by ID
  router.get(`/${path}/me`, (req, res) => {
    const user: User | undefined = req?.user
    controller
      .get(user?._id, projectionMap.get('user'), user)
      .then((data) => {
        res.json(data)
      })
      .catch((err) => {
        sendError(res, err)
      })
  })

  // Authenticates user with username and password. Returns JWT
  router.post(`/${path}/login`, (req, res) => {
    controller
      .login(req.body)
      .then((jwt) => {
        res.send(jwt)
      })
      .catch((err) => {
        sendError(res, err)
      })
  })

  return router
}

export default userRouter
