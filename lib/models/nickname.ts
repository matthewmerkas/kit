import { model, Schema } from 'mongoose'

export const NicknameSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    peerId: { type: Schema.Types.ObjectId, required: true },
    value: { type: String, required: true },
  },
  {
    timestamps: true,
  }
)

NicknameSchema.index({
  userId: 1,
  peerId: 1,
})

const NicknameModel = model('Nickname', NicknameSchema)
export default NicknameModel
