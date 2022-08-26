import { ParsedArgs } from 'minimist'

import { User } from './types'
import { UserController } from '../lib/controllers/user'

export const parseArgs = (argv: ParsedArgs) => {
  // Create user
  if (argv.createAdmin) {
    const controller = new UserController()
    const password = controller.generateSalt(8)
    controller
      .create({
        username: 'kit',
        displayName: 'KIT',
        password: password,
        roles: ['admin'],
      })
      .then((user: User) => {
        if (user.username) {
          console.log(
            `Account created with username '${user.username}' and password '${password}'`
          )
        } else {
          console.error('Account creation failed!')
        }
      })
      .catch((err: Error) => {
        console.error(err.message)
      })
      .then(() => {
        console.log('Exiting...')
        process.exit(0)
      })
  }
}

export const checkEnv = (array: string[], optional: boolean) => {
  const missing = []
  for (const variable of array) {
    if (!process.env[variable]) {
      missing.push(variable)
    }
  }
  if (missing.length > 0) {
    const many = missing.length > 1
    let warning = ''
    if (many) {
      for (const [i, variable] of missing.entries()) {
        if (i === missing.length - 1) {
          warning += 'and ' + variable + ' '
        } else {
          warning += variable + ', '
        }
      }
      warning += 'are not set! '
    } else {
      warning += `${missing[0]} is not set! `
    }
    if (optional) {
      warning += `Using default value${many ? 's' : ''}`
      console.warn(warning)
    } else {
      throw new Error(warning)
    }
  }
}

export const checkCredentials = () => {
  if (!process.env['GOOGLE_APPLICATION_CREDENTIALS']) {
    console.warn(
      'GOOGLE_APPLICATION_CREDENTIALS is not set. Push notifications will not work!'
    )
  }
}
