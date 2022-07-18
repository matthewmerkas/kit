import { Router } from 'express'

import { sendError } from '../../bin/errors'
import { BaseController } from '../controllers/base'

export const projectionMap = new Map([['user', { password: 0 }]])

function baseRouter(controller: BaseController, path: string) {
  const router = Router()

  // Creates a document
  router.post(`/${path}`, (req, res) => {
    controller
      .create(req.body, req.user)
      .then((data) => {
        res.json(data)
      })
      .catch((err) => {
        sendError(res, err)
      })
  })

  // Retrieves a list of documents
  router.get(`/${path}`, (req, res) => {
    controller
      .getList(req.query, projectionMap.get(path), req.user)
      .then((data) => {
        res.json(data)
      })
      .catch((err) => {
        sendError(res, err)
      })
  })

  // Retrieves the timestamp of the last updated document. Used for change detection
  router.get(`/${path}/lastUpdated`, (req, res) => {
    controller
      .lastUpdated(req.user)
      .then((data) => {
        res.json(data)
      })
      .catch((err) => {
        sendError(res, err)
      })
  })

  // Retrieves a document by ID
  router.get(`/${path}/:id`, (req, res) => {
    controller
      .get(req.params.id, projectionMap.get(path), req.user)
      .then((data) => {
        res.json(data)
      })
      .catch((err) => {
        sendError(res, err)
      })
  })

  // Updates a document by ID
  router.put(`/${path}/:id`, (req, res) => {
    controller
      .update(req.params.id, req.body, req.user)
      .then((data) => {
        res.json(data)
      })
      .catch((err) => {
        sendError(res, err)
      })
  })

  // Deletes a document by ID
  router.delete(`/${path}/:id`, (req, res) => {
    controller
      .delete(req.params.id, req.user)
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
