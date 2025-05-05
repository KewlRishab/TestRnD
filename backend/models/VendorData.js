const mongoose = require("mongoose");

// Define the schema for vendor data
const vendorSchema = new mongoose.Schema(
  {
    vendor_name: {
      type: String,
      required: true,
    },
    vendor_address: {
      type: String,
      required: true,
    },
    vendor_phoneNo: {
      type: String,
      required: true,
    },
    vendor_email: {
      type: String,
      required: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    vendor_invoice: {
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
    lastSentDate:{
      type:String,
      default:null
    }
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
    collection: "vendorData",
  }
);

// Create the Vendor model from the schema
module.exports = mongoose.model("Vendor", vendorSchema);
