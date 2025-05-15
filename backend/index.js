//External Dependencies:->
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const app = express();

//Internal Dependencies:->
const PORT = 8000;
const connectDB = require("./db");
const VendorData = require("./models/VendorData");
const CustData = require("./models/CustomerData");
const CompData = require("./models/CompanyData");
const vendorRoutes = require("./routes/vendorRoutes");
const customerRoutes = require("./routes/customerRoutes");
const messageRoutes = require("./routes/messageRoutes");
const compRoutes = require("./routes/compRoutes");
const sendImmediately = require("./utils/sendImmediately");
const handleScheduledSend = require("./utils/cronSchedule");


app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

connectDB().then(async () => {
  await rescheduleMessagesOnStartup();  // Await this to ensure it's done before server is considered ready
  // loginAPI();
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

// API to schedule and send whatsApp message to all vendors at a specific time
app.use("/api", messageRoutes);

async function rescheduleMessagesOnStartup() {
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
      vendor_invoice,
      vendor_phoneNo,
      cust_name,
      cust_invoice,
      cust_phoneNo,
      comp_name,
      comp_invoice,
      comp_phoneNo,
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
    const invoice = vendor_invoice || cust_invoice || comp_invoice;
    const phoneNo = vendor_phoneNo || cust_phoneNo || comp_phoneNo;

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

      const isNeverEnding = !EndDay && Iteration === "";

      const shouldSendNow =
        scheduled_req === "pending" &&
        hasTimePassed &&
        (isNeverEnding ||
          isEndDayValid ||
          isIterationValid ||
          (EndDay && !isEndDayValid && lastSentDate !== EndDay));

      const cronTime = `${scheduledMinute} ${scheduledHour} * * *`; // Every day at HH:mm

      if (shouldSendNow) {
        await sendImmediately({ entry, phoneNo, name, roleLabel, invoice, CollectionModel });
      }
      const freshEntry = await CollectionModel.findById(entry._id);
      if (
        !freshEntry ||
        freshEntry.scheduled_req === "sent" ||
        (freshEntry.EndDay &&
          freshEntry.lastSentDate &&
          freshEntry.lastSentDate === freshEntry.EndDay) ||
        freshEntry.Iteration === "0"
      )
        continue;
      // Always schedule the daily cron
      cron.schedule(cronTime, async () => {
        await handleScheduledSend({ freshEntry, roleLabel, CollectionModel });
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
      const isNeverEnding = !EndDay && Iteration === "";

      const shouldSendNow =
        scheduled_req === "pending" &&
        (isEarlierDay || (isToday && hasTimePassed)) &&
        (isEndDayValid ||
          isIterationValid ||
          isNeverEnding ||
          (EndDay && !isEndDayValid && lastSentDate !== EndDay));

      const cronTime = `${minute} ${hour} * * ${scheduledDayNum}`;

      if (shouldSendNow) {
        await sendImmediately({ entry, phoneNo, name, roleLabel, invoice, CollectionModel });
      }

      const freshEntry = await CollectionModel.findById(entry._id);
      if (
        !freshEntry ||
        freshEntry.scheduled_req === "sent" ||
        (freshEntry.EndDay &&
          freshEntry.lastSentDate &&
          freshEntry.lastSentDate === freshEntry.EndDay) ||
        freshEntry.Iteration === "0"
      )
        continue;
      cron.schedule(cronTime, async () => {
        await handleScheduledSend({ freshEntry, roleLabel, CollectionModel });
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
      const isNeverEnding = !EndDay && Iteration === "";
      const shouldSendNow =
        scheduled_req === "pending" &&
        (isEarlierDay || (isToday && hasTimePassed)) &&
        (isNeverEnding ||
          isEndDayValid ||
          isIterationValid ||
          (EndDay && !isEndDayValid && lastSentDate !== EndDay));

      if (shouldSendNow) {
        await sendImmediately({ entry, phoneNo, name, roleLabel, invoice, CollectionModel });
      }

      const freshEntry = await CollectionModel.findById(entry._id);
      if (
        !freshEntry ||
        freshEntry.scheduled_req === "sent" ||
        (freshEntry.EndDay &&
          freshEntry.lastSentDate &&
          freshEntry.lastSentDate === freshEntry.EndDay) ||
        freshEntry.Iteration === "0"
      )
        continue;
      cron.schedule(cronTime, async () => {
        await handleScheduledSend({ freshEntry, roleLabel, CollectionModel });
      });
    }
    else {
      const scheduleDate = new Date(scheduledTime);

      if (isNaN(scheduleDate)) {
        console.error(`Invalid scheduleDate for ${roleLabel} ${entry._id}`);
        continue;
      }

      if (scheduleDate <= now && scheduled_req === "pending") {
        try {
          await sendImmediately({ entry, phoneNo, name, roleLabel, invoice, CollectionModel });
          console.log(`(${roleLabel} Missed) Message sent to ${phoneNo}`);
          await CollectionModel.updateOne(
            { _id: entry._id },
            { $set: { scheduled_req: "sent" } }
          );
        } catch (err) {
          console.error(
            `(${roleLabel} Missed) Failed to send message to ${phoneNo}:`,
            err
          );
          await CollectionModel.updateOne(
            { _id: entry._id },
            { $set: { scheduled_req: "pending" } }
          );
        }
      } else if (scheduleDate > now && scheduled_req === "pending") {
        const delay = scheduleDate.getTime() - now.getTime();

        console.log(
          `(${roleLabel}) Scheduled message to ${phoneNo} in ${delay / 1000} seconds`
        );

        setTimeout(async () => {
          try {
            // Check if it wasn't already sent somehow (e.g., by crash recovery)
            const freshEntry = await CollectionModel.findById(entry._id);
            if (!freshEntry || freshEntry.scheduled_req === "sent") return;

            sendImmediately({ entry, phoneNo, name, roleLabel, invoice, CollectionModel })
            console.log(`(${roleLabel}) Message sent to ${phoneNo}`);
            await CollectionModel.updateOne(
              { _id: entry._id },
              { $set: { scheduled_req: "sent" } }
            );
          } catch (err) {
            console.error(
              `(${roleLabel}) Failed to send scheduled message to ${phoneNo}:`,
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
