const sendEmail = async (
  email,
  name,
  roleLabel,
  invoice,
  entry,
  transporter,
  CollectionModel
) => {
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
    console.log(`(${roleLabel}) Email sent to ${email}`);
    await CollectionModel.updateOne(
      { _id: entry._id },
      { $set: { scheduled_req: "sent" } }
    );
  } catch (err) {
    console.error(`(${roleLabel}) Failed to send email to ${email}:`, err);
  }
};

module.exports = sendEmail;
