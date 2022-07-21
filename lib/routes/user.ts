import { Router } from 'express'
import { Request as JWTRequest } from 'express-jwt'

import { HttpError, sendError } from "../../bin/errors";
import { UserController } from '../controllers/user'
import { User } from '../../bin/types'
import { projectionMap } from './base'
import { isAdmin } from '../../bin/user'
import { BaseRequests } from "../../bin/requests";

function userRouter() {
  const controller = new UserController()
  const path = 'user'
  const router = Router()
  const requests = new BaseRequests(controller, path)

  // Creates a user
  router.post(`/${path}/signup`, (req: JWTRequest, res) => {
    const user: User = req.auth!
    if (!isAdmin(user)) {
      delete req.body.roles
    }
    requests.create(req, res)
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

  // Refreshes a JWT
  router.post(`/${path}/refresh`, (req, res) => {
    controller
      .refresh(req.body)
      .then((jwt) => {
        res.send(jwt)
      })
      .catch((err) => {
        sendError(res, err)
      })
  })

  // Retrieves a user by ID in JWT
  router.get(`/${path}/me`, (req: JWTRequest, res) => {
    const user: User | undefined = req.auth
    console.log(user)
    if (user?._id) {
      controller
        .get(user._id, projectionMap.get('user'), user)
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

  // Updates a user by ID in JWT
  router.put(`/${path}/me`, (req: JWTRequest, res) => {
    const user: User | undefined = req.auth
    if (user?._id) {
      controller
        .update(user._id, req.body, req.auth)
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

  // Retrieves a list of users
  router.get(`/${path}`, (req: JWTRequest, res) => {
    requests.getList(req, res)
  })

  // Retrieves a user by ID
  router.get(`/${path}/:id`, (req: JWTRequest, res) => {
    requests.getOne(req, res)
  })

  return router
}

export default userRouter
