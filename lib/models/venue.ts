import { model, Schema } from 'mongoose'
import { InfoSchema } from './info'

export const VenueSchema = new Schema(
  {
    organisation: {
      type: Schema.Types.ObjectId,
      ref: 'Organisation',
    },
    locations: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Location',
      },
    ],
    menus: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Menu',
      },
    ],
    ...InfoSchema.obj,
    isDeleted: Boolean,
  },
  {
    timestamps: true,
  }
).index({ name: 1, organisation: 1 }, { unique: true, dropDups: true })

const VenueModel = model('Venue', VenueSchema)
export default VenueModel
