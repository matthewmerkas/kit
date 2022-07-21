interface Iterable {
  [key: string]: any
}

export interface SoftDeletes {
  isDeleted?: boolean
}

export interface Error {
  code: string
  status: number
  message: string
}

export interface Filter {
  _id?: string
  displayName?: string
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

export interface QueryParams extends Iterable {
  sort?: string
}

export interface User extends Iterable, SoftDeletes {
  _id?: string
  username?: string
  displayName?: string
  roles?: string[]
}
