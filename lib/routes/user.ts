import { Router } from 'express'
import { Request as JWTRequest } from "express-jwt";

import { sendError } from '../../bin/errors'
import { UserController } from '../controllers/user'
import { User } from '../../bin/types'
import { projectionMap } from './base'

function userRouter() {
  const controller = new UserController()
  const path = 'user'
  const router = Router()

  // Gets user document matching JWT user ID
  router.get(`/${path}/me`, (req: JWTRequest, res) => {
    const user: User | undefined = req.auth
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
