import { ParsedArgs } from 'minimist'

import { User } from './types'
import { UserController } from '../lib/controllers/user'
import MessageModel from '../lib/models/message'
import RfidModel from '../lib/models/rfid'
import UserModel from '../lib/models/user'
import fs from 'fs'
import path from 'path'

const deleteFiles = async (filePath: string) => {
  try {
    fs.readdirSync(filePath).forEach((f) => fs.rmSync(path.join(filePath, f)))
  } catch (err: any) {
    if (err.code !== 'ERR_FS_EISDIR') {
      console.log(err)
    }
  }
}

export const parseArgs = async (argv: ParsedArgs) => {
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
      .finally(() => {
        console.log('Exiting...')
        process.exit(0)
      })
  }
  // Wipe database and delete user-generated public files
  if (argv.reset) {
    const prompt = require('prompt-sync')({ sigint: true })
    console.log() // Add newline
    const shouldContinue = prompt(
      'This will drop all database collections and delete all user-' +
        'generated public files (audio messages & profile pictures). Are you ' +
        'sure you want to continue (y/N)? '
    )
    if (shouldContinue.toLowerCase() !== 'y') {
      console.log('Exiting...')
      process.exit(0)
    }

    await MessageModel.collection.drop().catch((err) => {
      if (err.code === 'NamespaceNotFound') {
        console.log("'messages' doesn't exist")
      }
    })
    await RfidModel.collection.drop().catch((err) => {
      if (err.codeName === 'NamespaceNotFound') {
        console.log("'rfids' doesn't exist")
      }
    })
    await UserModel.collection.drop().catch((err) => {
      if (err.codeName === 'NamespaceNotFound') {
        console.log("'users' doesn't exist")
      }
    })
    const filePath = `${require.main?.path}/public/`
    await deleteFiles(filePath + 'audio/')
    await deleteFiles(filePath + 'avatars/')
    console.log('Exiting...')
    process.exit(0)
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
