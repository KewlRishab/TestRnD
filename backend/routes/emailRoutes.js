const express = require("express");
const cron = require("node-cron");
const transporter = require("../config/transporter");
const VendorData = require("../models/VendorData");
const CustData = require("../models/CustomerData");
const CompData = require("../models/CompanyData");

const router = express.Router();

const cronJobs = {}; 

router.post("/schedule-email", async (req, res) => {
  const { scheduleTime, scheduleDay, scheduleType } = req.body;

  if (!scheduleTime) {
    return res.status(400).json({ message: "scheduleTime is required" });
  }
  console.log("Schedule Type---------->", scheduleType);
  let cronTime;
  let timeToStore;
  let currDate;
  await VendorData.updateMany({}, { $set: { scheduledType: scheduleType } });
  await CustData.updateMany({}, { $set: { scheduledType: scheduleType } });
  await CompData.updateMany({}, { $set: { scheduledType: scheduleType } });

  if (scheduleType === "daily") {
    // Time-only format like "18:10"
    const [hourStr, minuteStr] = scheduleTime.split(":");
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    if (isNaN(hour) || isNaN(minute)) {
      return res.status(400).json({ message: "Invalid time format" });
    }

    cronTime = `${minute} ${hour} * * *`; // Daily at this time
    timeToStore = scheduleTime; // store "18:10" directly
    const now = new Date();
    currDate = now.toISOString().split("T")[0]; // Get current date
  } else if (scheduleType === "weekly") {
    await VendorData.updateMany({}, { $set: { scheduledDay: scheduleDay } });
    await CustData.updateMany({}, { $set: { scheduledDay: scheduleDay } });
    await CompData.updateMany({}, { $set: { scheduledDay: scheduleDay } });
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
      return res.status(400).json({ message: "Invalid scheduleDay" });
    }
    cronTime = `${minute} ${hour} * * ${dayNum}`;
    timeToStore = scheduleTime;
    const now = new Date();
    currDate = `${scheduleDay}-${now.toISOString().split("T")[0]}`;
  } else if (scheduleType === "monthly") {
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
      return res
        .status(400)
        .json({ message: "Invalid scheduleTime or scheduleDay" });
    }

    cronTime = `${minute} ${hour} ${dayOfMonth} * *`; // Runs on specified day every month
    timeToStore = scheduleTime;
    const now = new Date();
    currDate = `monthly-${dayOfMonth}-${now.toISOString().split("T")[0]}`;

    console.log("📅 Monthly Cron Configured:", cronTime);

    // Save day for reference (optional)
    await VendorData.updateMany({}, { $set: { scheduledDay: scheduleDay } });
    await CustData.updateMany({}, { $set: { scheduledDay: scheduleDay } });
    await CompData.updateMany({}, { $set: { scheduledDay: scheduleDay } });
  } else {
    // Full datetime format like "2025-04-24T10:36"
    const scheduleDate = new Date(scheduleTime);
    if (isNaN(scheduleDate)) {
      return res.status(400).json({ message: "Invalid datetime format" });
    }

    cronTime = `${scheduleDate.getMinutes()} ${scheduleDate.getHours()} ${scheduleDate.getDate()} ${
      scheduleDate.getMonth() + 1
    } *`;
    timeToStore = scheduleDate; // store actual Date object
    currDate = scheduleDate.toISOString().split("T")[0]; // Store date in "YYYY-MM-DD" format
  }

  try {
    // Store the new time in the DB for all the tables
    await VendorData.updateMany({}, { $set: { scheduledTime: timeToStore } });
    await CustData.updateMany({}, { $set: { scheduledTime: timeToStore } });
    await CompData.updateMany({}, { $set: { scheduledTime: timeToStore } });

    // Stop the previous cron job if it exists
    if (cronJobs[currDate]) {
      console.log(`Stopping existing job for ${currDate}`);
      cronJobs[currDate].stop(); // Stop the existing cron job
    }

    // Schedule a new job
    cronJobs[currDate] = cron.schedule(cronTime, async () => {
      try {
        // VENDOR EMAIL LOGIC
        const vendorData = await VendorData.find();

        for (let vendor of vendorData) {
          const { vendor_email, vendor_invoice, vendor_name } = vendor;
          if (vendor.scheduled_req !== "pending") {
            console.log(
              `Skipping ${vendor.vendor_email} — Already processed & not pending`
            );
            continue;
          }

          const mailOptions = {
            from: "remorsivemate@gmail.com",
            to: vendor_email,
            subject: `📄 Invoice from ${vendor_name}`,
            text: `Dear beloved vendor ${vendor_name},\n\nPlease find your invoice PDF file at the following link: ${vendor_invoice}\n\nBest regards,\nXYZ Company`,
          };

          try {
            await transporter.sendMail(mailOptions);
            console.log(`Email sent to ${vendor_email}`);

            await VendorData.updateOne(
              { _id: vendor._id },
              { $set: { scheduled_req: "sent" } }
            );
          } catch (err) {
            console.error(`Failed to send email to ${vendor_email}:`, err);
            await VendorData.updateOne(
              { _id: vendor._id },
              { $set: { scheduled_req: "pending" } }
            );
          }
        }

        // CUSTOMER EMAIL LOGIC
        const custData = await CustData.find();

        for (let cust of custData) {
          const { cust_email, cust_invoice, cust_name } = cust;
          if (cust.scheduled_req !== "pending") {
            console.log(
              `Skipping ${cust.cust_email} — Already processed & not pending`
            );
            continue;
          }

          const mailOptions = {
            from: "remorsivemate@gmail.com",
            to: cust_email,
            subject: `📄 Invoice from ${cust_name}`,
            text: `Dear beloved Customer ${cust_name},\n\nPlease find your invoice PDF file at the following link: ${cust_invoice}\n\nBest regards,\nXYZ Company`,
          };

          try {
            await transporter.sendMail(mailOptions);
            console.log(`Email sent to ${cust_email}`);

            await CustData.updateOne(
              { _id: cust._id },
              { $set: { scheduled_req: "sent" } }
            );
          } catch (err) {
            console.error(`Failed to send email to ${cust_email}:`, err);
            await CustData.updateOne(
              { _id: cust._id },
              { $set: { scheduled_req: "pending" } }
            );
          }
        }

        // Company Email Logics
        const compData = await CompData.find();

        for (let comp of compData) {
          const { comp_email, comp_invoice, comp_name } = comp;
          if (comp.scheduled_req !== "pending") {
            console.log(
              `Skipping ${comp.comp_email} — Already processed & not pending`
            );
            continue;
          }
          const mailOptions = {
            from: "remorsivemate@gmail.com",
            to: comp_email,
            subject: `📄 Invoice from ${comp_name}`,
            text: `Dear beloved Company Person ${comp_name},\n\nPlease find your invoice PDF file at the following link: ${comp_invoice}\n\nBest regards,\nXYZ Company`,
          };

          try {
            await transporter.sendMail(mailOptions);
            console.log(`Email sent to ${comp_email}`);

            await CompData.updateOne(
              { _id: comp._id },
              { $set: { scheduled_req: "sent" } }
            );
          } catch (err) {
            console.error(`Failed to send email to ${comp_email}:`, err);
            await CompData.updateOne(
              { _id: comp._id },
              { $set: { scheduled_req: "pending" } }
            );
          }
        }
      } catch (err) {
        console.error("Error sending invoices:", err);
      }
    });

    res.status(200).json({
      message: `Emails scheduled to be sent to all vendors and customers at ${scheduleTime}`,
    });
  } catch (err) {
    console.error("Error scheduling email:", err);
    res.status(500).json({ message: "Error scheduling email" });
  }
});

module.exports = router;