const express = require("express");
const nodemailer = require("nodemailer");
// const path = require("path");
const app = express();
const PORT = 8000;
const cron = require("node-cron");
const cors = require("cors");
const connectDB = require("./db");
const VendorData = require("./models/VendorData");

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

connectDB().then(() => {
  rescheduleEmailsOnStartup(); // Restore scheduled jobs + send missed ones
});

// Transporter for Email
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "remorsivemate@gmail.com",
    pass: "tmkl ukon xvbh gvuf",
  },
});

app.get("/", async (req, res) => {
  res.send("Welcome to Rishab's Backend Server");
});

// API to get all vendor data
app.get("/api/getVendorData", async (req, res) => {
  try {
    const vendorData = await VendorData.find();
    res.status(200).json(vendorData);
  } catch (err) {
    console.error("Error fetching vendor data:", err);
    res.status(500).json({ message: "Error fetching vendor data" });
  }
});

// API to schedule and send email to all vendors at a specific time
app.post("/api/schedule-email", async (req, res) => {
  const { scheduleTime } = req.body;

  if (!scheduleTime) {
    return res.status(400).json({ message: "scheduleTime is required" });
  }

  const scheduleDate = new Date(scheduleTime);
  if (isNaN(scheduleDate)) {
    return res.status(400).json({ message: "Invalid date format" });
  }

  const cronTime = `${scheduleDate.getMinutes()} ${scheduleDate.getHours()} ${scheduleDate.getDate()} ${scheduleDate.getMonth() + 1} *`;

  try {
    await VendorData.updateMany(
      {},
      {
        $set: {
          scheduled_req: "scheduled",
          scheduledTime: scheduleDate,
        },
      }
    );

    cron.schedule(cronTime, async () => {
      try {
        const vendorData = await VendorData.find();

        for (let vendor of vendorData) {
          const { vendor_name, vendor_email, vendor_invoice } = vendor;

          const mailOptions = {
            from: "remorsivemate@gmail.com",
            to: vendor_email,
            subject: `📄 Invoice from ${vendor_name}`,
            text: `Dear ${vendor_name},\n
            \nPlease find your invoice PDF file at the following link: ${vendor_invoice}\n
            \nBest regards, \nXYZ Company`,
          };

          try {
            await transporter.sendMail(mailOptions);
            console.log(`Email sent to ${vendor_email}`);

            // Mark as sent if successfully sent
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
      } catch (err) {
        console.error("Error sending invoices:", err);
      }
    });

    res.status(200).json({
      message: `Emails scheduled to be sent to all vendors at ${scheduleTime}`,
    });
  } catch (err) {
    console.error("Error scheduling email:", err);
    res.status(500).json({ message: "Error scheduling email" });
  }
});

async function rescheduleEmailsOnStartup() {
  try {
    const now = new Date();

    //  missed emails immediately if scheduled time already passed and status is still "scheduled"
    const missedVendors = await VendorData.find({
      scheduled_req: "scheduled",
      scheduledTime: { $lte: now },
    });

    for (let vendor of missedVendors) {
      try {
        const { vendor_name, vendor_email, vendor_invoice } = vendor;

        const mailOptions = {
          from: "remorsivemate@gmail.com",
          to: vendor_email,
          subject: `📄 Invoice from ${vendor_name}`,
          text: `Dear ${vendor_name},\n
          \nPlease find your invoice PDF file at the following link: ${vendor_invoice}\n
          \nBest regards, \nXYZ Company`,
        };

        await transporter.sendMail(mailOptions);
        console.log(`(Missed) Immediate email sent to ${vendor_email}`);

        await VendorData.updateOne(
          { _id: vendor._id },
          { $set: { scheduled_req: "sent" } }
        );

      } catch (err) {
        console.error(`(Missed) Failed to send email to ${vendor.vendor_email}:`, err);
        await VendorData.updateOne(
          { _id: vendor._id },
          { $set: { scheduled_req: "pending" } }
        );
      }
    }

    //Reschedule future emails
    const futureVendors = await VendorData.find({
      scheduled_req: "scheduled",
      scheduledTime: { $gt: now },
    });

    futureVendors.forEach((vendor) => {
      const scheduleDate = new Date(vendor.scheduledTime);
      const cronTime = `${scheduleDate.getMinutes()} ${scheduleDate.getHours()} ${scheduleDate.getDate()} ${scheduleDate.getMonth() + 1} *`;

      cron.schedule(cronTime, async () => {
        try {
          const { vendor_name, vendor_email, vendor_invoice } = vendor;

          const mailOptions = {
            from: "remorsivemate@gmail.com",
            to: vendor_email,
            subject: `📄 Invoice from ${vendor_name}`,
            text: `Dear ${vendor_name},\n
            \nPlease find your invoice PDF file at the following link: ${vendor_invoice}\n
            \nBest regards, \nXYZ Company`,
          };

          await transporter.sendMail(mailOptions);
          console.log(`(Restored) Email sent to ${vendor_email}`);

          //Mark as sent
          await VendorData.updateOne(
            { _id: vendor._id },
            { $set: { scheduled_req: "sent" } }
          );

        } catch (err) {
          console.error(`(Restored) Failed to send email to ${vendor.vendor_email}:`, err);
          await VendorData.updateOne(
            { _id: vendor._id },
            { $set: { scheduled_req: "pending" } }
          );
        }
      });
    });
  } catch (err) {
    console.error("Error during rescheduling on server start:", err);
  }
}

app.listen(PORT, (err) => {
  if (err) return console.log("Error encountered at starting server !");
  console.log(`Server running at http://localhost:${PORT}`);
});
