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
      enum: ["pending", "scheduled"], 
      default: "pending",
    },
    scheduledTime: {
      type: String, 
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "vendorData",
  }
); 

// Create the Vendor model from the schema
module.exports = mongoose.model("Vendor", vendorSchema);
