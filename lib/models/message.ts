import { model, Schema } from 'mongoose'

const MessageSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    recipientId: { type: Schema.Types.ObjectId, required: true },
    senderId: { type: Schema.Types.ObjectId, required: true },
    audioUrl: String,
    text: String,
    isDeleted: Boolean,
  },
  {
    timestamps: true,
  }
)

const MessageModel = model('Message', MessageSchema)
export default MessageModel
