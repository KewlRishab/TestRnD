async function sendImmediately({
  entry,
  email,
  name,
  roleLabel,
  invoice,
  transporter,
  CollectionModel,
  sendEmail,
}) {
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
    console.log(`(${roleLabel} Recovery) Missed daily email sent to ${email}`);

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
      `(${roleLabel} Recovery) Failed to send missed daily email to ${email}:`,
      err
    );
  }
}

module.exports = sendImmediately;
