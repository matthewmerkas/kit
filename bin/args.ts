import { ParsedArgs } from 'minimist'

import { User } from './types'
import { UserController } from '../lib/controllers/user'

export const parseArgs = (argv: ParsedArgs) => {
  // Create admin user
  if (argv.createAdmin) {
    const controller = new UserController()
    const password = controller.generateSalt(8)
    controller
      .create({ username: 'admin', password: password, roles: ['admin'] })
      .then((user: User) => {
        if (user.username) {
          console.log(
            `Admin account created with username '${user.username}' and password '${password}'`
          )
        } else {
          console.error('Admin account creation failed!')
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
