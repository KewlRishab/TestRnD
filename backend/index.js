//External Dependencies:->
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const app = express();

//Internal Dependencies:->
const transporter = require("./config/transporter");
const PORT = 8000;
const connectDB = require("./db");
const VendorData = require("./models/VendorData");
const CustData = require("./models/CustomerData");
const CompData = require("./models/CompanyData");
const vendorRoutes = require("./routes/vendorRoutes");
const customerRoutes = require("./routes/customerRoutes");
const emailRoutes = require("./routes/emailRoutes");
const compRoutes = require("./routes/compRoutes");
const sendEmail = require("./utils/sendEmail");

app.use(express.json()); 

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

connectDB().then(async () => {
  await rescheduleEmailsOnStartup(); // Await this to ensure it's done before server is considered ready
});

app.get("/", async (req, res) => {
  res.send("Welcome to Rishab's Backend Server");
});

// API to get all vendor data
app.use("/api", vendorRoutes);

//API to get all customer data
app.use("/api", customerRoutes);

//API to get all Company Data
app.use("/api", compRoutes);

// API to schedule and send email to all vendors at a specific time
app.use("/api", emailRoutes);

async function rescheduleEmailsOnStartup() {
  try {
    await rescheduleForCollection(VendorData, "Vendor");
    await rescheduleForCollection(CustData, "Customer");
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
      scheduledDay,
      scheduledType,
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

    if (scheduledType === "daily") {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const [hourStr, minuteStr] = scheduledTime.split(":");
      const scheduledHour = parseInt(hourStr, 10);
      const scheduledMinute = parseInt(minuteStr, 10);

      const hasTimePassed =
        currentHour > scheduledHour ||
        (currentHour === scheduledHour && currentMinute >= scheduledMinute);

      const shouldSendNow = scheduled_req === "pending" && hasTimePassed;

      const cronTime = `${scheduledMinute} ${scheduledHour} * * *`; // Every day at HH:mm

      if (shouldSendNow) {
        // Missed daily email, send now
        try {
          await sendEmail(email, name, roleLabel, invoice, entry, transporter,CollectionModel);
          console.log(
            `(${roleLabel} Recovery) Missed daily email sent to ${email}`
          );
        } catch (err) {
          console.error(
            `(${roleLabel} Recovery) Failed to send email to ${email}:`,
            err
          );
        }
      }

      // Always schedule the daily cron
      cron.schedule(cronTime, async () => {
        const freshEntry = await CollectionModel.findById(entry._id);
        if (!freshEntry || freshEntry.scheduled_req === "sent") return;

        try {
          await sendEmail(email, name, roleLabel, invoice, entry, transporter, CollectionModel);
          console.log(`(${roleLabel} Daily Scheduled) Email sent to ${email}`);
        } catch (err) {
          console.error(
            `(${roleLabel} Recovery) Failed to send missed daily email to ${email}:`,
            err
          );
        }
      });
    } else if (scheduledType === "weekly") {
      const currentDay = new Date().getDay(); // Sunday=0, Monday=1, ..., Saturday=6
      const dayMap = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
      };
      const scheduledDayNum = dayMap[scheduledDay]; // scheduleDay from DB like "Monday"
      const [hourStr, minuteStr] = scheduledTime.split(":");
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      const cronTime = `${minute} ${hour} * * ${scheduledDayNum}`;
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const isToday = currentDay === scheduledDayNum;
      const hasTimePassed =
        currentHour > hour || (currentHour === hour && currentMinute >= minute);
      const isEarlierDay = currentDay > scheduledDayNum;

      const shouldSendNow =
        scheduled_req === "pending" &&
        (isEarlierDay || (isToday && hasTimePassed));

      if (shouldSendNow) {
        // Missed weekly email, send now
        try {
          await sendEmail(email, name, roleLabel, invoice, entry, transporter,CollectionModel);
          console.log(
            `(${roleLabel} Recovery) Missed weekly email sent to ${email}`
          );
        } catch (err) {
          console.error(
            `(${roleLabel} Recovery) Failed to send missed weekly email to ${email}:`,
            err
          );
        }
      }
      // Set up weekly cron to send on next scheduledDay
      cron.schedule(cronTime, async () => {
        const freshEntry = await CollectionModel.findById(entry._id);
        if (!freshEntry || freshEntry.scheduled_req === "sent") return;

        try {
          await sendEmail(email, name, roleLabel, invoice, entry, transporter,CollectionModel);
          console.log(`(${roleLabel} Weekly Scheduled) Email sent to ${email}`);
        } catch (err) {
          console.error(
            `(${roleLabel} Weekly Scheduled) Failed to send email to ${email}:`,
            err
          );
        }
      });
    } else if (scheduledType === "monthly") {
      const now = new Date();
      const currentDayOfMonth = now.getDate(); // 1 - 31
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const scheduledDayNum = parseInt(scheduledDay, 10); // e.g. "25" => 25
      const [hourStr, minuteStr] = scheduledTime.split(":");
      const scheduledHour = parseInt(hourStr, 10);
      const scheduledMinute = parseInt(minuteStr, 10);

      const cronTime = `${scheduledMinute} ${scheduledHour} ${scheduledDayNum} * *`;

      const isToday = currentDayOfMonth === scheduledDayNum;
      const hasTimePassed =
        currentHour > scheduledHour ||
        (currentHour === scheduledHour && currentMinute >= scheduledMinute);
      const isEarlierDay = currentDayOfMonth > scheduledDayNum;

      const shouldSendNow =
        scheduled_req === "pending" &&
        (isEarlierDay || (isToday && hasTimePassed));

      if (shouldSendNow) {
        // Missed monthly email, send now

        try {
          await sendEmail(email, name, roleLabel, invoice, entry, transporter,CollectionModel);
          console.log(
            `(${roleLabel} Recovery) Missed monthly email sent to ${email}`
          );
        } catch (err) {
          console.error(
            `(${roleLabel} Recovery) Failed to send missed monthly email to ${email}:`,
            err
          );
        }
      }

      // Set up monthly cron to send on scheduled day and time
      cron.schedule(cronTime, async () => {
        const freshEntry = await CollectionModel.findById(entry._id);
        if (!freshEntry || freshEntry.scheduled_req === "sent") return;

        try {
          await sendEmail(email, name, roleLabel, invoice, entry, transporter,CollectionModel);
          console.log(
            `(${roleLabel} Monthly Scheduled) Email sent to ${email}`
          );
        } catch (err) {
          console.error(
            `(${roleLabel} Monthly Scheduled) Failed to send email to ${email}:`,
            err
          );
        }
      });
    } else {
      const scheduleDate = new Date(scheduledTime);

      if (isNaN(scheduleDate)) {
        console.error(`Invalid scheduleDate for ${roleLabel} ${entry._id}`);
        continue;
      }

      if (scheduleDate <= now && scheduled_req === "pending") {
        try {
          await sendEmail(email, name, roleLabel, invoice, entry, transporter,CollectionModel);
          console.log(`(${roleLabel} Missed) Email sent to ${email}`);
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
        const delay = scheduleDate.getTime() - now.getTime();

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

        console.log(
          `(${roleLabel}) Scheduled email to ${email} in ${
            delay / 1000
          } seconds`
        );

        setTimeout(async () => {
          try {
            // Check if it wasn't already sent somehow (e.g., by crash recovery)
            const freshEntry = await CollectionModel.findById(entry._id);
            if (!freshEntry || freshEntry.scheduled_req === "sent") return;

            await transporter.sendMail(mailOptions);
            console.log(`(${roleLabel}) Email sent to ${email}`);
            await CollectionModel.updateOne(
              { _id: entry._id },
              { $set: { scheduled_req: "sent" } }
            );
          } catch (err) {
            console.error(
              `(${roleLabel}) Failed to send scheduled email to ${email}:`,
              err
            );
          }
        }, delay);
      }
    }
  }    
};

app.listen(PORT, (err) => {
  if (err) return console.log("Error encountered at starting server !");
  console.log(`Server running at http://localhost:${PORT}`);
});
