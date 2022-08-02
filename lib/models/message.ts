import { model, Schema } from 'mongoose'

const MessageSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    peer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    direction: {
      type: String,
      enum: ['send', 'receive'],
    },
    audioFileName: String,
    currentTime: Number,
    duration: Number,
    text: String,
    isDeleted: Boolean,
  },
  {
    timestamps: true,
  }
)

const MessageModel = model('Message', MessageSchema)
export default MessageModel
