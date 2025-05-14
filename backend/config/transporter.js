const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "remorsivemate@gmail.com",
    pass: "tmkl ukon xvbh gvuf", 
  },
});

module.exports = transporter;