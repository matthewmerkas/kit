import mongoose from 'mongoose'

export const InfoSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    photos: [String],
  },
  { _id: false }
)
