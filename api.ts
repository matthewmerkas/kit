import * as bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import * as dotenv from 'dotenv'
import express, { ErrorRequestHandler } from 'express'
import { expressjwt } from 'express-jwt'
import * as fs from 'fs'
import * as http from 'http'
import minimist from 'minimist'
import mongoose from 'mongoose'
import { Server } from 'socket.io'

import { checkCredentials, checkEnv, parseArgs } from './bin/args'
import { sendError } from './bin/errors'
import { BaseController } from './lib/controllers/base'
import MessageModel from './lib/models/message'
import baseRouter from './lib/routes/base'
import infoRouter from './lib/routes/info'
import messageRouter from './lib/routes/message'
import nicknameRouter from './lib/routes/nickname'
import userRouter from './lib/routes/user'
import UserModel from './lib/models/user'
import RfidModel from './lib/models/rfid'
import admin, { credential } from 'firebase-admin'
import applicationDefault = credential.applicationDefault

const argv = minimist(process.argv.slice(2))
const guard = require('express-jwt-permissions')({
  requestProperty: 'auth',
  permissionsProperty: 'roles',
})

// dotenv
const env = dotenv.config()
if (env.error) {
  throw env.error
}
checkEnv(['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'], false)
checkCredentials()
checkEnv(
  [
    'EXTERNAL_URL',
    'HOSTNAME',
    'PORT',
    'PREFIX',
    'JWT_EXPIRY',
    'JWT_SECRET_EXPIRY',
    'MIN_PASSWORD_LENGTH',
  ],
  true
)
export const externalUrl = process.env.EXTERNAL_URL
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
const exemptRoutes = [
  `${prefix}/info`,
  `${prefix}/user/login`,
  `${prefix}/user/refresh`,
  `${prefix}/user/signup`,
] // Don't check JWT for these routes
const port = Number(process.env.PORT) || 3000
const hostname = process.env.HOSTNAME || '127.0.0.1'

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // TODO: Better logging with ip, pino/winston+morgan (https://sematext.com/blog/node-js-logging/)
  console.error(err)
  return sendError(res, err)
}

fs.mkdir(`public/audio`, { recursive: true }, (err) => {
  if (err) throw err
})
fs.mkdir(`public/avatars`, { recursive: true }, (err) => {
  if (err) throw err
})
app.use('/public', express.static('public'))

app.use(bodyParser.json({ limit: '64mb' }))
app.use(cookieParser())
app.use(cors())
app.use(
  expressjwt({ secret: jwtSecret, algorithms: ['HS256'] }).unless({
    path: exemptRoutes,
  })
)
app.use(`${prefix}/admin`, guard.check(['admin']))
app.use(prefix, [
  baseRouter(new BaseController(UserModel, ['nicknames']), 'admin/user'),
  infoRouter(),
  messageRouter(),
  nicknameRouter(),
  baseRouter(new BaseController(MessageModel, ['peer']), 'message'),
  baseRouter(new BaseController(RfidModel, ['user']), 'rfid'),
  userRouter(),
])

// Firebase
export const firebaseApp = admin.initializeApp({
  credential: applicationDefault(),
})
module.exports.firebaseApp = firebaseApp
//

// Socket.IO
const server = http.createServer(app)
export const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
  },
})
module.exports.io = io
//

app.use(errorHandler)

parseArgs(argv).then(() => {
  server
    .listen(port, hostname, () => {
      console.log(`Server running at http://${hostname}:${port}/`)
    })
    .on('error', (err) => {
      console.error('APP ERROR: ' + err.message)
      process.exit()
    })
})
