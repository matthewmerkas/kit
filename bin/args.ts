import { ParsedArgs } from 'minimist'

import { User } from './types'
import { UserController } from '../lib/controllers/user'

export const parseArgs = (argv: ParsedArgs) => {
  // Create user
  if (argv.createUser) {
    const controller = new UserController()
    const password = controller.generateSalt(8)
    controller
      .create({ username: 'kit', displayName: 'KIT', password: password })
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
