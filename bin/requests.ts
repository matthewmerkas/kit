import { sendError } from './errors'
import { BaseController } from '../lib/controllers/base'
import { Request as JWTRequest } from 'express-jwt'
import { Response } from 'express'
import { projectionMap } from '../lib/routes/base'

export class BaseRequests {
  controller: BaseController
  path: string

  constructor(controller: BaseController, path: string) {
    this.controller = controller
    this.path = path
  }

  create = (req: JWTRequest, res: Response<any, Record<string, any>>) => {
    this.controller
      .create(req.body, req.auth)
      .then((data) => {
        res.json(data)
      })
      .catch((err) => {
        sendError(res, err)
      })
  }

  getList = (req: JWTRequest, res: Response<any, Record<string, any>>) => {
    this.controller
      .getList(req.query, projectionMap.get(this.path), req.auth)
      .then((data) => {
        res.json(data)
      })
      .catch((err) => {
        sendError(res, err)
      })
  }

  getOne = (req: JWTRequest, res: Response<any, Record<string, any>>) => {
    this.controller
      .get(req.params.id, projectionMap.get(this.path), req.auth)
      .then((data) => {
        res.json(data)
      })
      .catch((err) => {
        sendError(res, err)
      })
  }

  set = (req: JWTRequest, res: Response<any, Record<string, any>>) => {
    this.controller
      .set(req.params.id, req.body, req.auth)
      .then((data) => {
        res.json(data)
      })
      .catch((err) => {
        sendError(res, err)
      })
  }

  patch = (req: JWTRequest, res: Response<any, Record<string, any>>) => {
    this.controller
      .patch(req.params.id, req.body, req.auth)
      .then((data) => {
        res.json(data)
      })
      .catch((err) => {
        sendError(res, err)
      })
  }

  delete = (req: JWTRequest, res: Response<any, Record<string, any>>) => {
    this.controller
      .delete(req.params.id, req.auth)
      .then((data) => {
        res.json(data)
      })
      .catch((err) => {
        sendError(res, err)
      })
  }
}
