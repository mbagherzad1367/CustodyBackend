const nodemailer = require("nodemailer");

const transport = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendEmail = async (receiver, subject, content) => {
  const mailOptions = {
    from: "llagoudis@hotmail.co.uk", // Sender email address
    to: receiver, // Receiver email address
    subject: subject, // Subject of the email
    html: content, // HTML content of the email (direct content, no template)
  };

  try {
    await transport.sendMail(mailOptions);
    return { message: "Email sent successfully" };
  } catch (error) {
    return { message: "Error sending email", error };
  }
};

module.exports = {
  sendEmail,
};
