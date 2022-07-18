import { model, Schema } from 'mongoose'
import { InfoSchema } from './info'
import { OrderStatusSchema } from './orderStatus'

const OrganisationSchema = new Schema(
  {
    orderStatuses: [OrderStatusSchema],
    venues: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Venue',
      },
    ],
    ...InfoSchema.obj,
    isDeleted: Boolean,
  },
  {
    timestamps: true,
  }
).index({ name: 1 }, { unique: true, dropDups: true })

const OrganisationModel = model('Organisation', OrganisationSchema)
export default OrganisationModel
