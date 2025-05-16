const { loginAPI } = require("../API/loginAPI");
const { sendTxtMsg } = require("../API/sendTxtMsg");

async function sendImmediately({
  entry,
  phoneNo,
  name,
  roleLabel,
  invoice,
  CollectionModel,
}) {
  try {
    const loginRes = await loginAPI(); // returns the object you just showed
    console.log("loginRes's id :", loginRes.iid);
    if (!loginRes || !loginRes.token || !loginRes.iid) {
      throw new Error("Failed to get auth token or instance ID");
    }

    const { token, iid, apikey } = loginRes;
    let payload = {
      iid,
      to: phoneNo, // Without country code only 10 digit
      templateId: "3624221127877570",
      header: [roleLabel],
      body: ["Invoice", invoice]
    };
    // Step 2: Send WhatsApp message
    const msgResponse = await sendTxtMsg(payload,token, apikey);
    if (!msgResponse) throw new Error("Failed to send WhatsApp message");

    console.log(`WhatsApp message sent to ${phoneNo}`);

    const { Iteration, EndDay } = entry;

    if (Iteration && parseInt(Iteration, 10) > 0) {
      const newIteration = parseInt(Iteration, 10) - 1;
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
      `(${roleLabel} Recovery) Failed to send missed daily message to ${phoneNo}:`,
      err
    );
  }
}

module.exports = sendImmediately;
