import { Router } from 'express'
import { Request as JWTRequest } from 'express-jwt'

import { sendError } from '../../bin/errors'
import { BaseController } from '../controllers/base'

export const projectionMap = new Map([['user', { password: 0 }]])

function baseRouter(controller: BaseController, path: string) {
  const router = Router()

  // Creates a document
  router.post(`/${path}`, (req: JWTRequest, res) => {
    controller
      .create(req.body, req.auth)
      .then((data) => {
        res.json(data)
      })
      .catch((err) => {
        sendError(res, err)
      })
  })

  // Retrieves a list of documents
  router.get(`/${path}`, (req: JWTRequest, res) => {
    console.log(req.auth)
    controller
      .getList(req.query, projectionMap.get(path), req.auth)
      .then((data) => {
        res.json(data)
      })
      .catch((err) => {
        sendError(res, err)
      })
  })

  // Retrieves a document by ID
  router.get(`/${path}/:id`, (req: JWTRequest, res) => {
    controller
      .get(req.params.id, projectionMap.get(path), req.auth)
      .then((data) => {
        res.json(data)
      })
      .catch((err) => {
        sendError(res, err)
      })
  })

  // Updates a document by ID
  router.put(`/${path}/:id`, (req: JWTRequest, res) => {
    controller
      .update(req.params.id, req.body, req.auth)
      .then((data) => {
        res.json(data)
      })
      .catch((err) => {
        sendError(res, err)
      })
  })

  // Deletes a document by ID
  router.delete(`/${path}/:id`, (req: JWTRequest, res) => {
    controller
      .delete(req.params.id, req.auth)
      .then((data) => {
        res.json(data)
      })
      .catch((err) => {
        sendError(res, err)
      })
  })

  return router
}

export default baseRouter
