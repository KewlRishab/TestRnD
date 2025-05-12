// utils/handleScheduledSend.js
async function handleScheduledSend({
  freshEntry,
  roleLabel,
  transporter,
  CollectionModel,
  sendEmail,
}) {
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

  const validEndDay =
    !freshEntry.EndDay ||
    new Date().toISOString().split("T")[0] <=
      freshEntry.EndDay.split("T")[0];
  const validIteration =
    !freshEntry.Iteration || parseInt(freshEntry.Iteration) > 0;

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
    console.log(`(${roleLabel} Cron) Email sent to ${freshEmail}`);

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
      `(${roleLabel} Cron) Failed to send email to ${freshEmail}:`,
      err
    );
  }
}

module.exports = handleScheduledSend;
