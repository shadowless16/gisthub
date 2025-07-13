import mongoose, { Schema, models, model } from "mongoose"

const NotificationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["like", "comment", "follow", "mention"],
    required: true,
  },
  fromUser: {
    name: String,
    avatar: String,
    _id: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  message: String,
  link: String,
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export default models.Notification || model("Notification", NotificationSchema)
