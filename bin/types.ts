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
  user?: string
}

export interface Hash {
  salt: string
  hash: string
}

export interface Login {
  username: string
  password: string
}

export interface Message {
  _id?: string
  user?: string
  peer?: string
  direction?: 'send' | 'receive'
  audioFileName?: string
  audio?: RecordingData
  currentTime?: number
  duration?: number
  text?: string
  isDeleted?: boolean
}

export interface RecordingData {
  recordDataBase64: string
  msDuration: number
  mimeType: string
}

export interface Rfid {
  tagId: string
  user: string
}

export interface Token {
  token?: string
  refreshToken?: string
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
