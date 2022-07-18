import { model, Schema } from 'mongoose'

export const UserSchema = new Schema(
  {
    organisationId: Schema.Types.ObjectId, // For managers
    username: {
      type: String,
      required: true,
      unique: true,
      dropDups: true,
    },
    password: {
      salt: { type: String, required: true },
      hash: { type: String, required: true },
    },
    roles: {
      type: Array,
      required: true,
    },
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
