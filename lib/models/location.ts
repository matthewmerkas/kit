import { model, Schema } from 'mongoose'
import { InfoSchema } from './info'

export const LocationSchema = new Schema(
  {
    organisationId: { type: Schema.Types.ObjectId, required: true },
    venue: {
      type: Schema.Types.ObjectId,
      ref: 'Venue',
    },
    ...InfoSchema.obj,
    isDeleted: Boolean,
  },
  {
    timestamps: true,
  }
).index({ name: 1, organisationId: 1 }, { unique: true, dropDups: true })

const LocationModel = model('Location', LocationSchema)
export default LocationModel
