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
      EndDay,
      Iteration,
      lastSentDate,
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

      const isEndDayValid =
        EndDay && new Date().toISOString().split("T")[0] < EndDay.split("T")[0];

      const isIterationValid = Iteration && parseInt(Iteration, 10) > 0; // Ensure Iteration is parsed to a number

      const isNeverEnding = !EndDay && !Iteration;

      const shouldSendNow =
        scheduled_req === "pending" &&
        hasTimePassed &&
        (isNeverEnding ||
          isEndDayValid ||
          isIterationValid ||
          (EndDay && !isEndDayValid && lastSentDate !== EndDay));

      const cronTime = `${scheduledMinute} ${scheduledHour} * * *`; // Every day at HH:mm

      if (shouldSendNow) {
        try {
          await sendEmail(
            email,
            name,
            roleLabel,
            invoice,
            entry,
            transporter,
            CollectionModel
          );
          console.log(
            `(${roleLabel} Recovery) Missed daily email sent to ${email}`
          );
          if (Iteration && parseInt(Iteration, 10) > 0) {
            // Check if Iteration is a valid positive number
            const newIteration = parseInt(Iteration, 10) - 1; // Decrement the iteration as a number
            await CollectionModel.updateOne(
              { _id: entry._id },
              {
                // $inc: { Iteration: -1 }, // Decrementing by 1
                $set: {
                  scheduled_req: "sent",
                  Iteration: newIteration.toString(), // Store as string back to database
                },
              }
            );
          } else if (EndDay) {
            await CollectionModel.updateOne(
              { _id: entry._id },
              {
                $set: {
                  scheduled_req: "sent",
                  lastSentDate: new Date().toISOString().split("T")[0],
                },
              }
            );
          } else {
            await CollectionModel.updateOne(
              { _id: entry._id },
              { $set: { scheduled_req: "sent" } }
            );
          }
        } catch (err) {
          console.error(
            `(${roleLabel} Recovery) Failed to send missed daily email to ${email}:`,
            err
          );
        }
      }

      // Always schedule the daily cron
      cron.schedule(cronTime, async () => {
        const freshEntry = await CollectionModel.findById(entry._id);
        const freshEmail =
          freshEntry.vendor_email ||
          freshEntry.cust_email ||
          freshEntry.comp_email;
        const freshName =
          freshEntry.vendor_name ||
          freshEntry.cust_name ||
          freshEntry.comp_name;
        const freshInvoice =
          freshEntry.vendor_invoice ||
          freshEntry.cust_invoice ||
          freshEntry.comp_invoice;

        if (
          !freshEntry ||
          freshEntry.scheduled_req === "sent" ||
          (freshEntry.EndDay &&
            freshEntry.lastSentDate &&
            freshEntry.lastSentDate === freshEntry.EndDay)
        )
          return;

        const endDayValid =
          !freshEntry.EndDay ||
          new Date().toISOString().split("T")[0] <=
            freshEntry.EndDay.split("T")[0];
        const iterationValid =
          !freshEntry.Iteration || parseInt(freshEntry.Iteration) > 0; // Ensure Iteration is parsed to a number

        if (!endDayValid && !iterationValid) {
          console.log(
            `(${roleLabel} Cron) Skipped ${freshEntry.freshEmail} due to EndDay or Iteration limits`
          );
          return;
        }

        try {
          await sendEmail(
            freshEmail,
            freshName,
            roleLabel,
            freshInvoice,
            freshEntry,
            transporter,
            CollectionModel
          );
          console.log(
            `(${roleLabel} Daily Scheduled) Email sent to ${freshEmail}`
          );
          console.log("Email to be sent :", freshEmail);
          console.log("Name to be sent :", freshName);
          if (freshEntry.Iteration && parseInt(freshEntry.Iteration) > 0) {
            // Ensure Iteration is a valid positive number
            const newIteration = parseInt(freshEntry.Iteration) - 1; // Decrement Iteration as a number
            await CollectionModel.updateOne(
              { _id: freshEntry._id },
              {
                // $inc: { Iteration: -1 }, // Decrementing by 1
                $set: {
                  scheduled_req: "sent",
                  Iteration: newIteration.toString(), // Store back as string
                },
              }
            );
          } else if (EndDay) {
            await CollectionModel.updateOne(
              { _id: entry._id },
              {
                $set: {
                  scheduled_req: "sent",
                  lastSentDate: new Date().toISOString().split("T")[0],
                },
              }
            );
          } else {
            await CollectionModel.updateOne(
              { _id: freshEntry._id },
              { $set: { scheduled_req: "sent" } }
            );
          }
        } catch (err) {
          console.error(
            `(${roleLabel} Cron) Failed to send email to ${freshEmail}:`,
            err
          );
        }
      });
    } else if (scheduledType === "weekly") {
      const now = new Date();
      const currentDay = now.getDay(); // Sunday=0, Monday=1, ..., Saturday=6
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const dayMap = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
      };
      const scheduledDayNum = dayMap[scheduledDay]; // e.g. "Tuesday" -> 2

      const [hourStr, minuteStr] = scheduledTime.split(":");
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      const isToday = currentDay === scheduledDayNum;
      const hasTimePassed =
        currentHour > hour || (currentHour === hour && currentMinute >= minute);
      const isEarlierDay = currentDay > scheduledDayNum;

      const isEndDayValid =
        EndDay && now.toISOString().split("T")[0] < EndDay.split("T")[0];
      const isIterationValid = Iteration && parseInt(Iteration, 10) > 0; // Ensure Iteration is a number
      const isNeverEnding = !EndDay && !Iteration;

      const shouldSendNow =
        scheduled_req === "pending" &&
        (isEarlierDay || (isToday && hasTimePassed)) &&
        (isEndDayValid ||
          isIterationValid ||
          isNeverEnding ||
          (EndDay && !isEndDayValid && lastSentDate !== EndDay));

      const cronTime = `${minute} ${hour} * * ${scheduledDayNum}`;

      if (shouldSendNow) {
        try {
          await sendEmail(
            email,
            name,
            roleLabel,
            invoice,
            entry,
            transporter,
            CollectionModel
          );
          console.log(
            `(${roleLabel} Recovery) Missed weekly email sent to ${email}`
          );
          if (Iteration && parseInt(Iteration, 10) > 0) {
            // Ensure Iteration is a valid number
            const newIteration = parseInt(Iteration, 10) - 1; // Decrement Iteration as a number
            await CollectionModel.updateOne(
              { _id: entry._id },
              {
                $set: {
                  scheduled_req: "sent",
                  Iteration: newIteration.toString(), // Store back as string
                },
              }
            );
          } else if (EndDay) {
            await CollectionModel.updateOne(
              { _id: entry._id },
              {
                $set: {
                  scheduled_req: "sent",
                  lastSentDate: new Date().toISOString().split("T")[0],
                },
              }
            );
          } else {
            await CollectionModel.updateOne(
              { _id: entry._id },
              { $set: { scheduled_req: "sent" } }
            );
          }
        } catch (err) {
          console.error(
            `(${roleLabel} Recovery) Failed to send missed weekly email to ${email}:`,
            err
          );
        }
      }

      cron.schedule(cronTime, async () => {
        const freshEntry = await CollectionModel.findById(entry._id);
        const freshEmail =
          freshEntry.vendor_email ||
          freshEntry.cust_email ||
          freshEntry.comp_email;
        const freshName =
          freshEntry.vendor_name ||
          freshEntry.cust_name ||
          freshEntry.comp_name;
        const freshInvoice =
          freshEntry.vendor_invoice ||
          freshEntry.cust_invoice ||
          freshEntry.comp_invoice;
        if (
          !freshEntry ||
          freshEntry.scheduled_req === "sent" ||
          freshEntry.lastSentDate === EndDay
        )
          return;

        const validEndDay =
          !freshEntry.EndDay ||
          new Date().toISOString().split("T")[0] <=
            freshEntry.EndDay.split("T")[0];
        const validIteration =
          !freshEntry.Iteration || parseInt(freshEntry.Iteration) > 0; // Ensure Iteration is a number

        if (!validEndDay || !validIteration) {
          console.log(
            `(${roleLabel} Cron) Skipped ${freshEmail} due to EndDay or Iteration limits`
          );
          return;
        }

        try {
          await sendEmail(
            freshEmail,
            freshName,
            roleLabel,
            freshInvoice,
            freshEntry,
            transporter,
            CollectionModel
          );
          console.log(
            `(${roleLabel} Weekly Scheduled) Email sent to ${freshEmail}`
          );
          if (freshEntry.Iteration && parseInt(freshEntry.Iteration) > 0) {
            const newIteration = parseInt(freshEntry.Iteration) - 1;
            // Ensure Iteration is a valid number
            await CollectionModel.updateOne(
              { _id: freshEntry._id },
              {
                $set: { scheduled_req: "sent" },
                Iteration: newIteration.toString(), // Store back as string
              }
            );
          } else {
            await CollectionModel.updateOne(
              { _id: freshEntry._id },
              { $set: { scheduled_req: "sent" } }
            );
          }
        } catch (err) {
          console.error(
            `(${roleLabel} Weekly Scheduled) Failed to send email to ${freshEmail}:`,
            err
          );
        }
      });
    } else if (scheduledType === "monthly") {
      const now = new Date();
      const currentDayOfMonth = now.getDate();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const scheduledDayNum = parseInt(scheduledDay, 10);
      const [hourStr, minuteStr] = scheduledTime.split(":");
      const scheduledHour = parseInt(hourStr, 10);
      const scheduledMinute = parseInt(minuteStr, 10);

      const cronTime = `${scheduledMinute} ${scheduledHour} ${scheduledDayNum} * *`;

      const isToday = currentDayOfMonth === scheduledDayNum;
      const hasTimePassed =
        currentHour > scheduledHour ||
        (currentHour === scheduledHour && currentMinute >= scheduledMinute);
      const isEarlierDay = currentDayOfMonth > scheduledDayNum;

      const isEndDayValid =
        EndDay && now.toISOString().split("T")[0] < EndDay.split;
      const isIterationValid = Iteration && parseInt(Iteration, 10) > 0; // Ensure Iteration is a number
      const isNeverEnding = !EndDay && !Iteration;
      const shouldSendNow =
        scheduled_req === "pending" &&
        (isEarlierDay || (isToday && hasTimePassed)) &&
        (isNeverEnding ||
          isEndDayValid ||
          isIterationValid ||
          (EndDay && !isEndDayValid && lastSentDate !== EndDay));

      if (shouldSendNow) {
        try {
          await sendEmail(
            email,
            name,
            roleLabel,
            invoice,
            entry,
            transporter,
            CollectionModel
          );
          console.log(
            `(${roleLabel} Recovery) Missed monthly email sent to ${email}`
          );
          if (Iteration && parseInt(Iteration, 10) > 0) {
            const newIteration = parseInt(Iteration, 10) - 1;
            // Ensure Iteration is a valid number
            await CollectionModel.updateOne(
              { _id: entry._id },
              {
                $set: {
                  scheduled_req: "sent",
                  Iteration: newIteration.toString(),
                },
              }
            );
          } else if (EndDay) {
            await CollectionModel.updateOne(
              { _id: entry._id },
              {
                $set: {
                  scheduled_req: "sent",
                  lastSentDate: new Date().toISOString().split("T")[0],
                },
              }
            );
          } else {
            await CollectionModel.updateOne(
              { _id: entry._id },
              { $set: { scheduled_req: "sent" } }
            );
          }
        } catch (err) {
          console.error(
            `(${roleLabel} Recovery) Failed to send missed monthly email to ${email}:`,
            err
          );
        }
      }

      cron.schedule(cronTime, async () => {
        const freshEntry = await CollectionModel.findById(entry._id);
        const freshEmail =
          freshEntry.vendor_email ||
          freshEntry.cust_email ||
          freshEntry.comp_email;
        const freshName =
          freshEntry.vendor_name ||
          freshEntry.cust_name ||
          freshEntry.comp_name;
        const freshInvoice =
          freshEntry.vendor_invoice ||
          freshEntry.cust_invoice ||
          freshEntry.comp_invoice;
        if (!freshEntry || freshEntry.scheduled_req === "sent") return;

        const validEndDay =
          !freshEntry.EndDay ||
          new Date().toISOString().split("T")[0] <=
            freshEntry.EndDay.split("T")[0];
        const validIteration =
          !freshEntry.Iteration || parseInt(freshEntry.Iteration) > 0; // Ensure Iteration is a number

        if (!validEndDay || !validIteration) {
          console.log(
            `(${roleLabel} Cron) Skipped ${freshEmail} due to EndDay or Iteration limits`
          );
          return;
        }

        try {
          await sendEmail(
            freshEmail,
            freshName,
            roleLabel,
            freshInvoice,
            freshEntry,
            transporter,
            CollectionModel
          );
          console.log(
            `(${roleLabel} Monthly Scheduled) Email sent to ${freshEmail}`
          );
          if (freshEntry.Iteration && parseInt(freshEntry.Iteration) > 0) {
            const newIteration = parseInt(freshEntry.Iteration) - 1;
            // Ensure Iteration is a valid number
            await CollectionModel.updateOne(
              { _id: freshEntry._id },
              {
                $set: {
                  scheduled_req: "sent",
                  Iteration: newIteration.toString(),
                },
              }
            );
          } else {
            await CollectionModel.updateOne(
              { _id: freshEntry._id },
              { $set: { scheduled_req: "sent" } }
            );
          }
        } catch (err) {
          console.error(
            `(${roleLabel} Monthly Scheduled) Failed to send email to ${freshEmail}:`,
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
          await sendEmail(
            email,
            name,
            roleLabel,
            invoice,
            entry,
            transporter,
            CollectionModel
          );
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
