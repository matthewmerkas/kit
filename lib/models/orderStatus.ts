import { Schema } from 'mongoose'

export const OrderStatusSchema = new Schema(
  {
    organisationId: { type: Schema.Types.ObjectId, required: true },
    name: String,
    color: String,
    position: {
      x: Number,
      y: Number,
    }, //  Position in order status flow/interface
    description: String,
    isDeleted: Boolean,
  },
  {
    timestamps: true,
  }
).index({ name: 1, organisationId: 1 }, { unique: true, dropDups: true })
