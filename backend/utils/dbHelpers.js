// utils/dbHelpers.js
const VendorData = require("../models/VendorData");
const CustData = require("../models/CustomerData");
const CompData = require("../models/CompanyData");

const updateUserTypeData = async (userType, updateFields) => {
  let Model;

  switch (userType.toLowerCase()) {
    case "vendor":
      Model = VendorData;
      break;
    case "customer":
      Model = CustData;
      break;
    case "company":
      Model = CompData;
      break;
    case "all":
      // In case you want to update all three
      await Promise.all([
        VendorData.updateMany({}, { $set: updateFields }),
        CustData.updateMany({}, { $set: updateFields }),
        CompData.updateMany({}, { $set: updateFields }),
      ]);
      return;
    default:
      throw new Error("Invalid userType");
  }

  await Model.updateMany({}, { $set: updateFields });
};

module.exports = { updateUserTypeData };
