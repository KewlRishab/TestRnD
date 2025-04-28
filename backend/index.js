const express = require("express");
const nodemailer = require("nodemailer");
const app = express();
const PORT = 8000;
const cron = require("node-cron");
const cors = require("cors");
const connectDB = require("./db");
const VendorData = require("./models/VendorData");
const CustData = require("./models/CustomerData");
const CustomerData = require("./models/CustomerData");
const CompData = require("./models/CompanyData");
let cronJobs = {};

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

connectDB().then(async () => {
  await rescheduleEmailsOnStartup(); // Await this to ensure it's done before server is considered ready
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
    console.error("Error getting vendor data:", err);
    res.status(500).json({ message: "Error getting vendor data" });
  }
});

//API to get all customer data
app.get("/api/getCustData", async (req, res) => {
  try {
    const custData = await CustData.find();
    res.status(200).json(custData);
  } catch (err) {
    console.error("Error getting customer data:", err);
    res.status(500).json({ message: "Error getting customer data" });
  }
});

//API to get all Company Data
app.get("/api/getCompData", async (req, res) => {
  try {
    const compData = await CompData.find();
    res.status(200).json(compData);
  } catch (err) {
    console.error("Error getting Company data:", err);
    res.status(500).json({ message: "Error getting Company data" });
  }
});

// API to schedule and send email to all vendors at a specific time
app.post("/api/schedule-email", async (req, res) => {
  const { scheduleTime } = req.body;

  if (!scheduleTime) {
    return res.status(400).json({ message: "scheduleTime is required" });
  }

  let cronTime;
  let timeToStore;
  let currDate;
  if (scheduleTime.indexOf("T") === -1) {
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

        // Company Email Logic
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

async function rescheduleEmailsOnStartup() {
  try {
    await rescheduleForCollection(VendorData, "Vendor");
    await rescheduleForCollection(CustomerData, "Customer");
    await rescheduleForCollection(CompData, "Company");
  } catch (err) {
    console.error("Error during full rescheduling:", err);
  }
}

const rescheduleForCollection = async (
  CollectionModel,
  roleLabel = "Vendor"
) => {
  const now = new Date();
  const allEntries = await CollectionModel.find({});

  for (let entry of allEntries) {
    const {
      scheduledTime,
      scheduled_req,
      vendor_name,
      vendor_email,
      vendor_invoice,
      cust_name,
      cust_email,
      cust_invoice,
      comp_name,
      comp_email,
      comp_invoice,
    } = entry;

    if (!scheduledTime || scheduledTime.trim() === "") {
      console.log(
        `Skipping ${roleLabel} ${entry._id} due to missing or empty scheduledTime`
      );
      continue;
    }

    const name = vendor_name || cust_name || comp_name;
    const email = vendor_email || cust_email || comp_email;
    const invoice = vendor_invoice || cust_invoice || comp_invoice;

    const isTimeOnly =
      typeof scheduledTime === "string" && /^\d{2}:\d{2}$/.test(scheduledTime);
    const today = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().slice(0, 5);

    if (isTimeOnly) {
      const [hourStr, minuteStr] = scheduledTime.split(":");
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      const cronTime = `${minute} ${hour} * * *`;

      if (scheduled_req === "pending" && scheduledTime <= currentTime) {
        const mailOptions = {
          from: "remorsivemate@gmail.com",
          to: email,
          subject: `📄 Invoice from ${name}`,
          text: `Dear ${
            roleLabel === "Customer"
              ? "Customer"
              : roleLabel === "Company"
              ? "Company"
              : "Vendor"
          }  ${name},\n\nPlease find your invoice PDF file at the following link: ${invoice}\n\nBest regards,\nXYZ Company`,
        };

        try {
          await transporter.sendMail(mailOptions);
          console.log(`(${roleLabel} Recovery) Missed Email sent to ${email}`);
          await CollectionModel.updateOne(
            { _id: entry._id },
            { $set: { scheduled_req: "sent" } }
          );

          // After sending the missed email, schedule for the next day
          cron.schedule(cronTime, async () => {
            // Check if the request is still pending before sending again
            const freshEntry = await CollectionModel.findById(entry._id);
            if (freshEntry.scheduled_req === "pending") {
              // Now send the email
              const mailOptions = {
                from: "remorsivemate@gmail.com",
                to: email,
                subject: `📄 Invoice from ${name}`,
                text: `Dear ${
                  roleLabel === "Customer"
                    ? "Customer"
                    : roleLabel === "Company"
                    ? "Company"
                    : "Vendor"
                } ${name},\n\nPlease find your invoice PDF file at the following link: ${invoice}\n\nBest regards,\nXYZ Company`,
              };

              try {
                await transporter.sendMail(mailOptions);
                console.log(`(${roleLabel} Future) Email sent to ${email}`);
                await CollectionModel.updateOne(
                  { _id: entry._id },
                  { $set: { scheduled_req: "sent" } }
                );
              } catch (err) {
                console.error(
                  `(${roleLabel} Future) Failed to send email to ${email}:`,
                  err
                );
              }
            }
          });
        } catch (err) {
          console.error(
            `(${roleLabel} Recovery) Failed to send email to ${email}:`,
            err
          );
        }
      } else {
        cron.schedule(cronTime, async () => {
          const latestEntry = await CollectionModel.findById(entry._id); // 🛑 Fetch fresh data!!
          if (!latestEntry || latestEntry.scheduled_req === "sent") return;
          const mailOptions = {
            from: "remorsivemate@gmail.com",
            to: email,
            subject: `📄 Invoice from ${name}`,
            text: `Dear ${
              roleLabel === "Customer"
                ? "Customer"
                : roleLabel === "Company"
                ? "Company"
                : "Vendor"
            }  ${name},\n\nPlease find your invoice PDF file at the following link: ${invoice}\n\nBest regards,\nXYZ Company`,
          };

          try {
            await transporter.sendMail(mailOptions);
            console.log(`(${roleLabel} Scheduled) Email sent to ${email}`);
            await CollectionModel.updateOne(
              { _id: entry._id },
              { $set: { scheduled_req: "sent" } }
            );
          } catch (err) {
            console.error(
              `(${roleLabel} Scheduled) Failed to send email to ${email}:`,
              err
            );
          }
        });
      }
    } else {
      const scheduleDate = new Date(scheduledTime);

      if (isNaN(scheduleDate)) {
        console.error(`Invalid scheduleDate for ${roleLabel} ${entry._id}`);
        continue;
      }

      if (scheduleDate <= now && scheduled_req === "scheduled") {
        const mailOptions = {
          from: "remorsivemate@gmail.com",
          to: email,
          subject: `📄 Invoice from ${name}`,
          text: `Dear ${
            roleLabel === "Customer"
              ? "Customer"
              : roleLabel === "Company"
              ? "Company"
              : "Vendor"
          } ${name},\n\nPlease find your invoice PDF file at the following link: ${invoice}\n\nBest regards,\nXYZ Company`,
        };

        try {
          await transporter.sendMail(mailOptions);
          console.log(`(${roleLabel} Missed) Email sent to ${email}`);
          await CollectionModel.updateOne(
            { _id: entry._id },
            { $set: { scheduled_req: "sent" } }
          );
        } catch (err) {
          console.error(
            `(${roleLabel} Missed) Failed to send email to ${email}:`,
            err
          );
          await CollectionModel.updateOne(
            { _id: entry._id },
            { $set: { scheduled_req: "pending" } }
          );
        }
      } else if (scheduleDate > now && scheduled_req === "pending") {
        const cronTime = `${scheduleDate.getMinutes()} ${scheduleDate.getHours()} ${scheduleDate.getDate()} ${
          scheduleDate.getMonth() + 1
        } *`;

        cron.schedule(cronTime, async () => {
          const mailOptions = {
            from: "remorsivemate@gmail.com",
            to: email,
            subject: `📄 Invoice from ${name}`,
            text: `Dear beloved ${
              roleLabel === "Customer"
                ? "Customer"
                : roleLabel === "Company"
                ? "Company"
                : "Vendor"
            } ${name},\n\nPlease find your invoice PDF file at the following link: ${invoice}\n\nBest regards,\nXYZ Company`,
          };

          try {
            await transporter.sendMail(mailOptions);
            console.log(`(${roleLabel} Future) Email sent to ${email}`);
            await CollectionModel.updateOne(
              { _id: entry._id },
              { $set: { scheduled_req: "sent" } }
            );
          } catch (err) {
            console.error(
              `(${roleLabel} Future) Failed to send email to ${email}:`,
              err
            );
            await CollectionModel.updateOne(
              { _id: entry._id },
              { $set: { scheduled_req: "pending" } }
            );
          }
        });
      }
    }
  }
};

app.listen(PORT, (err) => {
  if (err) return console.log("Error encountered at starting server !");
  console.log(`Server running at http://localhost:${PORT}`);
});
