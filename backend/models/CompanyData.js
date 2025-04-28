const mongoose = require("mongoose");

// Define the schema for comp data
const compSchema = new mongoose.Schema(
  {
    comp_name: {
      type: String,
      required: true,
    },
    comp_address: {
      type: String,
      required: true,
    },
    comp_phoneNo: {
      type: String,
      required: true,
    },
    comp_email: {
      type: String,
      required: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    comp_invoice: {
      type: String,
      required: true,
    },
    scheduled_req: {
      type: String,
      enum: ["pending", "sent"],
      default: "pending",
    },
    scheduledTime: {
      type: String,
      default: null,
    },
    // lastSentData: {
    //   date: {
    //     type: String, // Stores the date as a string, e.g., "2025-04-24"
    //     default: null,
    //   },
    //   time: {
    //     type: String, // Stores the time as a string, e.g., "10:10"
    //     default: null,
    //   },
    // },
  },
  {
    timestamps: true,
    collection: "compData",
  }
);

// Create the comp model from the schema
module.exports = mongoose.model("comp", compSchema);
