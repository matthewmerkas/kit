import { Router } from 'express'

import { sendError } from '../../bin/errors'
import { InfoController } from '../controllers/info'

function infoRouter() {
  const controller = new InfoController()
  const router = Router()

  // Retrieves a value by key
  router.get(`/info`, (req, res) => {
    controller
      .get()
      .then((data) => {
        res.json(data)
      })
      .catch((err) => {
        sendError(res, err)
      })
  })

  return router
}

export default infoRouter
