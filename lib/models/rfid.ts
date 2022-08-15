import { model, Schema } from 'mongoose'

export const RfidSchema = new Schema(
  {
    tagId: {
      type: String,
    },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  }
)

const RfidModel = model('Rfid', RfidSchema)
export default RfidModel
