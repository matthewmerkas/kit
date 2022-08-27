import { Router } from 'express'
import { Request as JWTRequest } from 'express-jwt'

import { BaseController } from '../controllers/base'
import { BaseRequests } from '../../bin/requests'

export const projectionMap = new Map([['user', { fcmToken: 0, password: 0 }]])

function baseRouter(controller: BaseController, path: string) {
  const router = Router()
  const requests = new BaseRequests(controller, path)

  // Creates a document
  router.post(`/${path}`, (req: JWTRequest, res) => {
    requests.create(req, res)
  })

  // Retrieves a list of documents
  router.get(`/${path}`, (req: JWTRequest, res) => {
    requests.getList(req, res)
  })

  // Retrieves a document by ID
  router.get(`/${path}/:id`, (req: JWTRequest, res) => {
    requests.getOne(req, res)
  })

  // Updates a document by ID
  router.put(`/${path}/:id`, (req: JWTRequest, res) => {
    requests.set(req, res)
  })

  // Updates a document by ID without removing missing fields
  router.put(`/${path}/:id/patch`, (req: JWTRequest, res) => {
    requests.patch(req, res)
  })

  // Deletes a document by ID
  router.delete(`/${path}/:id`, (req: JWTRequest, res) => {
    requests.delete(req, res)
  })

  return router
}

export default baseRouter
