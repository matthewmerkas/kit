interface Iterable {
  [key: string]: any
}

export interface SoftDeletes {
  isDeleted?: boolean
}

export interface Error {
  status: number
  message: string
}

export interface Filter {
  _id?: string
  organisationId?: string
  userId?: string
}

export interface Hash {
  salt: string
  hash: string
}

export interface Login {
  username: string
  password: string
}

export interface QueryParams {
  organisationId?: string
  sort?: string
}

export interface User extends Iterable, SoftDeletes {
  _id?: string
  organisationId?: string
  username?: string
  roles?: string[]
}
