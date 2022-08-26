import { model, Schema } from 'mongoose'

export const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      dropDups: true,
    },
    avatarFileName: String,
    displayName: { type: String, required: true },
    fcmToken: String,
    password: {
      salt: { type: String, required: true },
      hash: { type: String, required: true },
    },
    roles: { type: Array },
    isDeleted: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

const UserModel = model('User', UserSchema)
export default UserModel
