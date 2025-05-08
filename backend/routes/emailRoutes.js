const express = require("express");
const cron = require("node-cron");
const transporter = require("../config/transporter");
const VendorData = require("../models/VendorData");
const CustData = require("../models/CustomerData");
const CompData = require("../models/CompanyData");
const { updateUserTypeData } = require("../utils/dbHelpers");
const sendEmail = require("../utils/sendEmail");

const router = express.Router();

const cronJobs = {};

const sendEmailAndUpdateIteration = async (
  userData,
  transporter,
  userType,
  Model
) => {
  const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

  for (let user of userData) {
    let email, name, invoice, scheduled_req, _id, Iteration, EndDay;

    // Extract dynamic fields
    if (user.vendor_email) { 
      ({
        vendor_email: email,
        vendor_name: name,
        vendor_invoice: invoice,
        scheduled_req,
        _id,
        Iteration,
        EndDay,
        lastSentDate
      } = user);
    } else if (user.cust_email) {
      ({
        cust_email: email,
        cust_name: name,
        cust_invoice: invoice,
        scheduled_req,
        _id,
        Iteration,
        EndDay,
        lastSentDate
      } = user);
    } else if (user.comp_email) {
      ({
        comp_email: email,
        comp_name: name,
        comp_invoice: invoice,
        scheduled_req,
        _id,
        Iteration,
        EndDay,
        lastSentDate
      } = user);
    } else {
      console.warn("Skipping unknown user type:", user);
      continue;
    }

    // Skip already processed
    if (scheduled_req !== "pending") {
      console.log(`Skipping ${email} — Already processed & not pending`);
      continue;
    }

    // Skip if Iteration is 0 and no EndDay
    if (Iteration === "0" && !EndDay) {
      console.log(`Skipping ${email} — Iteration is 0 and no EndDay`);
      continue;
    }

    // Skip if EndDay passed
    if (!Iteration && EndDay) {
      const endDateOnly = EndDay.split("T")[0];
      if (today > endDateOnly) {
        console.log(`Skipping ${email} — EndDay ${endDateOnly} already passed`);
        continue;
      }
    }

    try {
      // Send the email first
      await sendEmail(email, name, userType, invoice, user, transporter, Model);
      console.log(`✅ Email sent to ${email}`);

      // Only then update the DB
      if (Iteration && Iteration > 0) {
        await Model.updateOne(
          { _id },
          {
            $set: {
              scheduled_req: "sent",
              Iteration: Iteration - 1,
            },
          }
        );
        console.log(`Iteration decremented for ${email}`);
      }
      else if(EndDay){
        await Model.updateOne({ _id }, { $set: { scheduled_req: "sent", lastSentDate:new Date().toISOString().split("T")[0] } });
        console.log(`Marked as sent EndDay-based schedule`);
      }
       else {
        await Model.updateOne({ _id }, { $set: { scheduled_req: "sent" } });
        console.log(`Marked as sent for one-time or never ending `);
      }
    } catch (err) {
      console.error(`❌ Failed to send email to ${email}:`, err);
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
  const currDate = `monthly-${dayOfMonth}-${
    new Date().toISOString().split("T")[0]
  }`;
  return { status: true, cronTime, currDate };
};

router.post("/schedule-email", async (req, res) => {
  const {
    EndDay,
    Iteration,
    userType,
    scheduleTime,
    scheduleDay,
    scheduleType,
  } = req.body;

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
      lastSentDate:""  
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

    cronTime = `${scheduleDate.getMinutes()} ${scheduleDate.getHours()} ${scheduleDate.getDate()} ${
      scheduleDate.getMonth() + 1
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
        // Vendor emails  
        const vendorData = await VendorData.find(); 
        await sendEmailAndUpdateIteration(
          vendorData,
          transporter,
          "Vendor",
          VendorData
        );

        // Customer emails
        const custData = await CustData.find();
        await sendEmailAndUpdateIteration(
          custData,
          transporter,
          "Customer",
          CustData
        );

        // Company emails
        const compData = await CompData.find();
        await sendEmailAndUpdateIteration(
          compData,
          transporter,
          "Company",
          CompData
        );
      } catch (err) {
        console.error("Error sending invoices:", err);
      }
    });

    res.status(200).json({
      message: `Emails scheduled to be sent at ${scheduleTime}`,
    });
  } catch (err) {  
    console.error("Error scheduling email:", err);
    res.status(500).json({ message: "Error scheduling email" });
  }
});

module.exports = router;
