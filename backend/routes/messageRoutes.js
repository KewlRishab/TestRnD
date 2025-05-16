const express = require("express");
const cron = require("node-cron");
const VendorData = require("../models/VendorData");
const CustData = require("../models/CustomerData");
const CompData = require("../models/CompanyData");
const { updateUserTypeData } = require("../utils/dbHelpers");
const { loginAPI } = require("../API/loginAPI");
const { sendTxtMsg } = require("../API/sendTxtMsg");

const router = express.Router();

const cronJobs = {};

const sendMessageAndUpdateAccordingly = async (
  userData,
  userType,
  Model
) => {
  const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

  for (let user of userData) {
    let email, phoneNo, name, invoice, scheduled_req, _id, Iteration, EndDay;

    // Extract dynamic fields
    if (user.vendor_email) {
      ({
        vendor_name: name,
        vendor_invoice: invoice,
        vendor_phoneNo: phoneNo,
        scheduled_req,
        _id,
        Iteration,
        EndDay,
        lastSentDate,
      } = user);
    } else if (user.cust_email) {
      ({
        cust_name: name,
        cust_invoice: invoice,
        cust_phoneNo: phoneNo,
        scheduled_req,
        _id,
        Iteration,
        EndDay,
        lastSentDate,
      } = user);
    } else if (user.comp_email) {
      ({
        comp_name: name,
        comp_invoice: invoice,
        comp_phoneNo: phoneNo,
        scheduled_req,
        _id,
        Iteration,
        EndDay,
        lastSentDate,
      } = user);
    } else {
      console.warn("Skipping unknown user type:", user);
      continue;
    }

    // Skip already processed
    if (scheduled_req !== "pending") {
      console.log(`Skipping ${name} — Already processed & not pending`);
      continue;
    }

    // Skip if Iteration is 0 and no EndDay
    if (Iteration === "0" && !EndDay) {
      console.log(`Skipping ${name} — Iteration is 0 and no EndDay`);
      continue;
    }

    // Skip if EndDay passed
    if (!Iteration && EndDay) {
      const endDateOnly = EndDay.split("T")[0];
      if (today > endDateOnly) {
        console.log(`Skipping ${name} — EndDay ${endDateOnly} already passed`);
        continue;
      }
    }

    try {
      // Send the message first
      const loginRes = await loginAPI(); // returns the object you just showed
      console.log("loginRes's id :", loginRes.iid);
      if (!loginRes || !loginRes.token || !loginRes.iid) {
        throw new Error("Failed to get auth token or instance ID");
      }

      const { token, iid, apikey } = loginRes;

      let payload = {
        iid,
        to:phoneNo , // Without country code only 10 digit
        templateId: "3624221127877570",
        header: [userType],
        body:["Invoice",invoice]
      };

      // Step 2: Send WhatsApp message
      const msgResponse = await sendTxtMsg(payload,token,apikey);

      if (!msgResponse) throw new Error("Failed to send WhatsApp message");

      console.log(`WhatsApp message sent to ${phoneNo}`);

      // Only then update the DB
      const numericIteration = parseInt(Iteration, 10); // safely parses strings like "0", "1", or even "01"

      if (!isNaN(numericIteration) && numericIteration > 0) {
        await Model.updateOne(
          { _id },
          {
            $set: {
              scheduled_req: "sent",
              Iteration: (numericIteration - 1).toString(), // store as string again
            },
          }
        );
        console.log(`Iteration decremented for ${phoneNo}`);
      } else if (EndDay) {
        await Model.updateOne(
          { _id },
          {
            $set: {
              scheduled_req: "sent",
              lastSentDate: new Date().toISOString().split("T")[0],
            },
          }
        );
        console.log(`Marked as sent EndDay-based schedule`);
      } else {
        await Model.updateOne({ _id }, { $set: { scheduled_req: "sent" } });
        console.log(`Marked as sent for one-time or never ending `);
      }
    } catch (err) {
      console.error(`Failed to send message to  ${phoneNo}:`, err);
      // Keep it pending for retry
      await Model.updateOne({ _id }, { $set: { scheduled_req: "pending" } });
    }
  }
};

const configureDailySchedule = (scheduleTime) => {
  const [hourStr, minuteStr] = scheduleTime.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (isNaN(hour) || isNaN(minute)) {
    return { status: false, message: "Invalid time format" };
  }

  const cronTime = `${minute} ${hour} * * *`;
  const currDate = new Date().toISOString().split("T")[0]; // Get current date
  return { status: true, cronTime, currDate };
};

const configureWeeklySchedule = (scheduleTime, scheduleDay) => {
  const [hour, minute] = scheduleTime.split(":");
  const dayOfWeekMap = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const dayNum = dayOfWeekMap[scheduleDay];

  if (dayNum === undefined) {
    return { status: false, message: "Invalid scheduleDay" };
  }

  const cronTime = `${minute} ${hour} * * ${dayNum}`;
  const currDate = `${scheduleDay}-${new Date().toISOString().split("T")[0]}`;
  return { status: true, cronTime, currDate };
};

const configureMonthlySchedule = (scheduleTime, scheduleDay) => {
  const [hourStr, minuteStr] = scheduleTime.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  const dayOfMonth = parseInt(scheduleDay, 10);

  if (
    isNaN(hour) ||
    isNaN(minute) ||
    isNaN(dayOfMonth) ||
    dayOfMonth < 1 ||
    dayOfMonth > 31
  ) {
    return { status: false, message: "Invalid scheduleTime or scheduleDay" };
  }

  const cronTime = `${minute} ${hour} ${dayOfMonth} * *`;
  const currDate = `monthly-${dayOfMonth}-${new Date().toISOString().split("T")[0]
    }`;
  return { status: true, cronTime, currDate };
};

router.post("/schedule-message", async (req, res) => {
  const {
    EndDay,
    Iteration,
    userType,
    scheduleTime,
    scheduleDay,
    scheduleType,
  } = req.body;

  // loginAPI();

  if (!scheduleTime) {
    return res.status(400).json({ message: "scheduleTime is required" });
  }

  console.log("Schedule Type---------->", scheduleType);
  let cronTime, timeToStore, currDate;

  // Common logic for updating user type data
  const updateUser = async (userType) => {
    await updateUserTypeData(userType, {
      scheduledType: scheduleType,
      Iteration: Iteration,
      EndDay,
      lastSentDate: "",
    });
  };

  if (userType === "Vendor" || userType === "All") {
    await updateUser("Vendor");
  }
  if (userType === "Customer" || userType === "All") {
    await updateUser("Customer");
  }
  if (userType === "Company" || userType === "All") {
    await updateUser("Company");
  }

  if (scheduleType === "daily") {
    const result = configureDailySchedule(scheduleTime);
    if (!result.status)
      return res.status(400).json({ message: result.message });

    cronTime = result.cronTime;
    timeToStore = scheduleTime;
    currDate = result.currDate;
  } else if (scheduleType === "weekly") {
    const result = configureWeeklySchedule(scheduleTime, scheduleDay);
    if (!result.status)
      return res.status(400).json({ message: result.message });

    cronTime = result.cronTime;
    timeToStore = scheduleTime;
    currDate = result.currDate;
  } else if (scheduleType === "monthly") {
    const result = configureMonthlySchedule(scheduleTime, scheduleDay);
    if (!result.status)
      return res.status(400).json({ message: result.message });

    cronTime = result.cronTime;
    timeToStore = scheduleTime;
    currDate = result.currDate;
  } else {
    // Full datetime format like "2025-04-24T10:36"
    const scheduleDate = new Date(scheduleTime);
    if (isNaN(scheduleDate)) {
      return res.status(400).json({ message: "Invalid datetime format" });
    }

    cronTime = `${scheduleDate.getMinutes()} ${scheduleDate.getHours()} ${scheduleDate.getDate()} ${scheduleDate.getMonth() + 1
      } *`;
    timeToStore = scheduleDate;
    currDate = scheduleDate.toISOString().split("T")[0];
  }

  try {
    // Store the new time in DB for all tables
    if (userType === "Vendor" || userType === "All") {
      await VendorData.updateMany({}, { $set: { scheduledTime: timeToStore } });
    }
    if (userType === "Customer" || userType === "All") {
      await CustData.updateMany({}, { $set: { scheduledTime: timeToStore } });
    }
    if (userType === "Company" || userType === "All") {
      await CompData.updateMany({}, { $set: { scheduledTime: timeToStore } });
    }

    // Stop previous cron job if exists
    if (cronJobs[currDate]) {
      console.log(`Stopping existing job for ${currDate}`);
      cronJobs[currDate].stop();
    }

    // Schedule a new job
    cronJobs[currDate] = cron.schedule(cronTime, async () => {
      try {
        // Vendor Messages
        const vendorData = await VendorData.find();
        await sendMessageAndUpdateAccordingly(
          vendorData,
          "Vendor",
          VendorData
        );

        // Customer Messages
        const custData = await CustData.find();
        await sendMessageAndUpdateAccordingly(
          custData,
          "Customer",
          CustData
        );

        // Company Messages
        const compData = await CompData.find();
        await sendMessageAndUpdateAccordingly(
          compData,
          "Company",
          CompData
        );
      } catch (err) {
        console.error("Error sending invoices:", err);
      }
    }); 

    res.status(200).json({
      message: `Messages scheduled to be sent at ${scheduleTime}`,
    });
  } catch (err) {
    console.error("Error scheduling message :", err);
    res.status(500).json({ message: "Error scheduling message" });
  }
});

module.exports = router;
