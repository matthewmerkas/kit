import { model, Schema } from 'mongoose'

const MessageSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    peerId: { type: Schema.Types.ObjectId, required: true },
    direction: {
      type: String,
      enum: ['send', 'receive'],
    },
    audioUrl: String,
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
