import { model, Schema } from 'mongoose'
import { InfoSchema } from './info'

export const MenuSchema = new Schema(
  {
    organisationId: { type: Schema.Types.ObjectId, required: true },
    venue: {
      type: Schema.Types.ObjectId,
      ref: 'Venue',
    },
    items: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Item',
      },
    ],
    ...InfoSchema.obj,
    isDeleted: Boolean,
  },
  {
    timestamps: true,
  }
).index({ name: 1, organisationId: 1 }, { unique: true, dropDups: true })

const MenuModel = model('Menu', MenuSchema)
export default MenuModel
