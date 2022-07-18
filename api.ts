import * as bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import csrf from 'csurf'
import * as dotenv from 'dotenv'
import express, { ErrorRequestHandler } from 'express'
import { expressjwt } from 'express-jwt'
import minimist from 'minimist'
import mongoose from 'mongoose'

import { parseArgs } from './bin/args'
import { sendError } from './bin/errors'
import { BaseController } from './lib/controllers/base'
import { UserController } from './lib/controllers/user'
import MessageModel from './lib/models/message'
import baseRouter from './lib/routes/base'
import infoRouter from './lib/routes/info'
import userRouter from './lib/routes/user'

const argv = minimist(process.argv.slice(2))
export const jwtSecret = process.env.JWT_SECRET
  ? process.env.JWT_SECRET
  : 'secret'

// dotenv
const env = dotenv.config()
if (env.error) {
  throw env.error
}
if (!process.env.MONGO_URI) {
  console.error('MONGO_URI environment variable is required!')
  process.exit()
}
const optional = ['HOSTNAME', 'PORT', 'JWT_SECRET']
for (const variable of optional) {
  if (!process.env[variable]) {
    console.warn(`${variable} is not set! Using default value`)
  }
}

// Mongoose
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to database!')
  })
  .catch((err) => {
    console.error('DB ERROR: ' + err.message)
    process.exit()
  })

// Express
const app = express()
const prefix = process.env.PREFIX ? process.env.PREFIX : '/api'
const exemptRoutes = [`${prefix}/user/login`, `${prefix}/info`] // Don't guard these routes
const port = process.env.PORT ? +process.env.PORT : 3000
const hostname = process.env.HOSTNAME ? process.env.HOSTNAME : '127.0.0.1'

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // TODO: Better logging with ip, pino/winston+morgan (https://sematext.com/blog/node-js-logging/)
  console.error(err)
  if (err.code === 'credentials_required') {
    sendError(res, {
      status: 401,
      message: 'Please log-in to access this resource',
    })
  } else if (err.code === 'invalid_token') {
    sendError(res, {
      status: 401,
      message: 'Please log-in again to access this resource',
    })
  }
  sendError(res, err)
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
  infoRouter(),
  userRouter(),
  baseRouter(new UserController(), 'user'),
])
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
