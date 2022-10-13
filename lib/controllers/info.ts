/**
 * info.ts
 *
 * This controller module implements CRUD methods for retrieving information about the system
 */

import { appName } from '../../api'

export class InfoController {
  info = {
    name: appName,
  }

  // Retrieves info object
  get = () => {
    return new Promise((resolve) => {
      return resolve(this.info)
    })
  }
}
