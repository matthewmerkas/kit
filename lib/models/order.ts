import { model, Schema } from 'mongoose'
import { InfoSchema } from './info'
import { LocationSchema } from './location'

const OrderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    organisationId: { type: Schema.Types.ObjectId, required: true },
    user: {
      username: String,
    },
    location: LocationSchema,
    reference: { type: String, unique: true, dropDups: true }, // Order reference number
    status: {
      name: String,
      color: String,
      description: String,
    },
    items: [InfoSchema],
    notes: String,
    isDeleted: Boolean,
  },
  {
    timestamps: true,
  }
)

const OrderModel = model('Order', OrderSchema)
export default OrderModel
