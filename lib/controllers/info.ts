/**
 * info.ts
 *
 * This controller module implements CRUD methods for retrieving information about the system
 */

export class InfoController {
  info = {
    name: 'KIT',
  }

  // Retrieves info object
  get = () => {
    return new Promise((resolve) => {
      return resolve(this.info)
    })
  }
}
