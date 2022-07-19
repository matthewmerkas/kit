import * as bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import csrf from 'csurf'
import * as dotenv from 'dotenv'
import express, { ErrorRequestHandler } from 'express'
import { expressjwt } from 'express-jwt'
import * as http from 'http'
import minimist from 'minimist'
import mongoose from 'mongoose'
import { Server } from 'socket.io'

import { checkEnv, parseArgs } from './bin/args'
import { sendError } from './bin/errors'
import { BaseController } from './lib/controllers/base'
import { AuthController } from './lib/controllers/auth'
import MessageModel from './lib/models/message'
import baseRouter from './lib/routes/base'
import infoRouter from './lib/routes/info'
import authRouter from './lib/routes/auth'

const argv = minimist(process.argv.slice(2))

// dotenv
const env = dotenv.config()
if (env.error) {
  throw env.error
}
checkEnv(['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'], false)
checkEnv(
  [
    'HOSTNAME',
    'PORT',
    'PREFIX',
    'JWT_EXPIRY',
    'JWT_SECRET_EXPIRY',
    'MIN_PASSWORD_LENGTH',
  ],
  true
)
export const jwtSecret = process.env.JWT_SECRET!
export const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET!

// Mongoose
mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => {
    console.log('Connected to database!')
  })
  .catch((err) => {
    console.error('DB ERROR: ' + err.message)
    process.exit()
  })

// Express
const app = express()
const prefix = process.env.PREFIX || '/api'
const exemptRoutes = [`${prefix}/auth/login`, `${prefix}/info`] // Don't guard these routes
const port = Number(process.env.PORT) || 3000
const hostname = process.env.HOSTNAME || '127.0.0.1'

// Socket.IO
const server = http.createServer(app)
const io = new Server(server)
//

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // TODO: Better logging with ip, pino/winston+morgan (https://sematext.com/blog/node-js-logging/)
  console.error(err)
  if (err.code === 'credentials_required') {
    return sendError(res, {
      status: 401,
      message: 'Please log-in to access this resource',
    })
  } else if (err.code === 'invalid_token') {
    return sendError(res, {
      status: 401,
      message: 'Please log-in again to access this resource',
    })
  }
  return sendError(res, err)
}

app.use(bodyParser.json())
app.use(cookieParser())
app.use(cors())
app.use(
  expressjwt({ secret: jwtSecret, algorithms: ['HS256'] }).unless({
    path: exemptRoutes,
  })
)
app.use(prefix, [
  baseRouter(new BaseController(MessageModel), 'message'),
  baseRouter(new AuthController(), 'auth'),
  infoRouter(),
  authRouter(),
])
io.on('connection', (socket) => {
  console.log('A socket connected!')
})
app.use(csrf({ cookie: true }))
app.all('*', function (req, res) {
  res.cookie('XSRF-TOKEN', req.csrfToken())
  res.render('index')
})
app.use(errorHandler)

parseArgs(argv)

app
  .listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`)
  })
  .on('error', (err) => {
    console.error('APP ERROR: ' + err.message)
    process.exit()
  })
