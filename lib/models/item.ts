import { model, Schema } from 'mongoose'
import { InfoSchema } from './info'

export const ItemSchema = new Schema(
  {
    organisationId: { type: Schema.Types.ObjectId, required: true },
    menu: {
      type: Schema.Types.ObjectId,
      ref: 'Menu',
    },
    ...InfoSchema.obj,
    recipe: String,
    tags: [String],
    isDeleted: Boolean,
  },
  {
    timestamps: true,
  }
).index({ name: 1, organisationId: 1 }, { unique: true, dropDups: true })

const ItemModel = model('Item', ItemSchema)
export default ItemModel
