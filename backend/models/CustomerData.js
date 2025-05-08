const mongoose = require("mongoose");

// Define the schema for cust data
const custSchema = new mongoose.Schema(
  {
    cust_name: {
      type: String,
      required: true,
    },
    
    cust_address: {
      type: String,
      required: true,
    },
    cust_phoneNo: {
      type: String,
      required: true,
    },
    cust_email: {
      type: String,
      required: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    cust_invoice: {
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
    scheduledType: {
      type: String,
      default: null,
      enum: ["weekly", "single", "monthly", "daily"],
    },
    scheduledDay: {
      type: String,
      default: null,
    },
    EndDay: {
      type: String,
      default: null,
    },
    Iteration: {
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
    collection: "custData",
  }
);

// Create the cust model from the schema
module.exports = mongoose.model("cust", custSchema);
