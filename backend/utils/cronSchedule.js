const { loginAPI } = require("../API/loginAPI");
const { sendTxtMsg } = require("../API/sendTxtMsg");

// utils/handleScheduledSend.js
async function handleScheduledSend({
  freshEntry,
  roleLabel,
  CollectionModel,
}) {
  const freshPhoneNo =
    freshEntry.vendor_phoneNo ||
    freshEntry.cust_phoneNo || 
    freshEntry.comp_phoneNo;
  const freshName =
    freshEntry.vendor_name ||
    freshEntry.cust_name ||
    freshEntry.comp_name;

  const freshInvoice=
    freshEntry.vendor_invoice ||
    freshEntry.cust_invoice||
    freshEntry.comp_invoice ;

  const validEndDay = 
    !freshEntry.EndDay ||
    new Date().toISOString().split("T")[0] <=
    freshEntry.EndDay.split("T")[0];
  const validIteration =
    !freshEntry.Iteration || parseInt(freshEntry.Iteration) > 0;

  if (!validEndDay || !validIteration) {
    console.log(
      `(${roleLabel} Cron) Skipped ${freshPhoneNo} due to EndDay or Iteration limits`
    );
    return;
  }

  try {
    const loginRes = await loginAPI(); // returns the object you just showed
    console.log("loginRes's id :", loginRes.iid);
    if (!loginRes || !loginRes.token || !loginRes.iid) {
      throw new Error("Failed to get auth token or instance ID");
    } 

    const { token, iid, apikey } = loginRes;

    let payload = {
        iid,
        to:freshPhoneNo , // Without country code only 10 digit
        templateId: "3624221127877570",
        header: [roleLabel],
        body:["Invoice",freshInvoice]
      };
    // Step 2: Send WhatsApp message
    const msgResponse = await sendTxtMsg(payload,token,apikey);
    if (!msgResponse) throw new Error("Failed to send WhatsApp message");

    console.log(`WhatsApp message sent to ${freshPhoneNo}`);

    if (freshEntry.Iteration && parseInt(freshEntry.Iteration) > 0) {
      const newIteration = parseInt(freshEntry.Iteration) - 1;
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
      `(${roleLabel} Cron) Failed to send message to ${freshPhoneNo}:`,
      err
    );
  }
}

module.exports = handleScheduledSend;
