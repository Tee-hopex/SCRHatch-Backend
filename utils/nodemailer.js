const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

// Transporter configuration
const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// Send Password Reset the email
const sendPasswordReset = async (email, fullname, resetPasswordCode) => {
  try {
    const info = await transport.sendMail({
      from: `SCRHatch <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Reset your password",
      html: `<div>
            <div style="display: flex; align-items: center;">
                <img alt="SCRHatch Logo" style="height: 50px; margin-right: 8px; width: 50px;" src="https://link-to-scrhatch-logo.com/logo.png">
                <img alt="SCRHatch" style="height: 30px; margin-right: 8px;" src="https://link-to-scrhatch-logo.com/scrhatch-logo.png">
            </div>
            <br/>
            <p style="line-height: 1.2;">Hi ${fullname},</p>
            <p style="line-height: 1.2;">We've received a request to reset your password.</p>
            <p style="line-height: 1.5;">If you didn't make the request, just ignore this message. Otherwise, you can reset your password.</p>        
            <a href="https://scrhatch.com/reset_password/${resetPasswordCode}">
                <button style="font-weight: 500;font-size: 14px;cursor: pointer; background-color: rgba(238, 119, 36, 1); border: none; border-radius: 4px; padding: 12px 18px 12px 18px; color: white;">
                    Reset your password
                </button>
            </a>
            <br/>
            <br/>
            <p style="line-height: 0.2;">Thanks!</p>
            <p style="line-height: 0.5;">The SCRHatch Team.</p>
            <br/><br/> 
            <hr style="border: 0.5px solid rgb(186, 185, 185); width: 100%;">
            <br/> 
            <p style="font-size: 14px; color: grey">Powered by SCRHatch.</p>
            <p style="font-size: 14px; color: grey">Find, Connect & Share with the best Creators, Developers & Designers.</p>
        </div>`,
      headers: {
        "Content-Type": "multipart/mixed",
      },
    });

    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error sending email:", error);
    return { msg: "Error sending email", error };
  }
};

// Send OTP Email
const sendOTP = async (email, verificationCode) => {
    try {
        const otpHtml = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>OTP Verification</title>
              <style>
                  body {
                      font-family: Arial, sans-serif;
                      background-color: #f4f9f6;
                      color: #333;
                      margin: 0;
                      padding: 0;
                  }
                  .container {
                      width: 100%;
                      max-width: 600px;
                      margin: 0 auto;
                      padding: 20px;
                      background-color: #ffffff;
                      border-radius: 8px;
                      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                  }
                  .header {
                      text-align: center;
                      margin-bottom: 20px;
                  }
                  .header img {
                      width: 120px;
                      margin-bottom: 15px;
                  }
                  .header h1 {
                      color: #65c99f;
                      font-size: 24px;
                      font-weight: bold;
                  }
                  .content {
                      text-align: center;
                  }
                  .content p {
                      font-size: 16px;
                      line-height: 1.5;
                      color: #555;
                  }
                  .otp {
                      font-size: 32px;
                      font-weight: bold;
                      color: #65c99f;
                      padding: 10px 20px;
                      background-color: #e5f7e1;
                      border-radius: 8px;
                      margin-top: 20px;
                  }
                  .link {
                      display: inline-block;
                      margin-top: 20px;
                      padding: 12px 25px;
                      background-color: #65c99f;
                      color: white;
                      border-radius: 6px;
                      text-decoration: none;
                      font-size: 16px;
                  }
                  .footer {
                      margin-top: 40px;
                      text-align: center;
                      font-size: 12px;
                      color: #777;
                  }
                  .footer a {
                      color: #65c99f;
                      text-decoration: none;
                  }
              </style>
          </head>
          <body>
              <div class="container">
                  <!-- Header -->
                  <div class="header">
                      <img src="../images/logo.png" alt="SCRHatch Logo">
                      <h1>OTP Verification</h1>
                  </div>

                  <!-- Main content -->
                  <div class="content">
                      <p>Hello,</p>
                      <p>Here is your one-time password (OTP) for verification:</p>

                      <!-- OTP -->
                      <div class="otp">
                          ${verificationCode}  <!-- OTP dynamically injected here -->
                      </div>

                      <p>This OTP is valid for 10 minutes. Please use it to complete your verification.</p>

                  </div>

                  <!-- Footer -->
                  <div class="footer">
                      <p>If you did not request this OTP, please ignore this email.</p>
                      <p>Powered by <a href="#">SCRHatch</a></p>
                  </div>
              </div>
          </body>
          </html>
        `;

        const info = await transport.sendMail({
          from: `SCRHatch <${process.env.MAIL_USER}>`,
          to: email,
          subject: "Your OTP Verification Code",
          html: otpHtml, // Sending the OTP HTML content
        });

        console.log("Email sent:", info.response);
    } catch (error) {
        console.error("Error sending OTP:", error);
        return { msg: "Error sending OTP", error };
    }
};
  

// Send Account Verification Email
const sendAccountVerification = async (email, fullname, password) => {
  try {
    const info = await transport.sendMail({
      from: `SCRHatch <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Account Verification",
      html: `<p style="line-height: 1.5">
        Congratulations ${fullname}, your account has been approved.
        You can now log in and gain access to your account with the password: <b>${password}</b>.
        Best regards,<br />
        Team SCRHatch.
        </p>`,
    });

    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error sending email:", error);
    return { msg: "Error sending email", error };
  }
};

// Send Account Verification Denial Email
const sendAccountVerificationDenial = async (email, fullname) => {
  try {
    const info = await transport.sendMail({
      from: `SCRHatch <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Account Verification Denied",
      html: `<p style="line-height: 1.5">
        We are sorry to inform you that your account verification
        request has been denied.
        Please ensure that you send in correct details of your medical facility for 
        it to be verified.
        Best regards,<br />
        Team SCRHatch.
        </p>`,
    });

    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error sending email:", error);
    return { msg: "Error sending email", error };
  }
};

// Send Contact Us Email
const sendContactUs = async (fullname, subject, message, email) => {
  try {
    const info = await transport.sendMail({
      from: email,
      to: "contact@scrhatch.com",
      subject: subject,
      html: `<p style="line-height: 1.5">
        <b>${fullname}</b> <br />
        ${message}
        </p>`,
    });

    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error sending email:", error);
    return { msg: "Error sending email", error };
  }
};

module.exports = {
  sendPasswordReset,
  sendOTP,
  sendAccountVerification,
  sendAccountVerificationDenial,
  sendContactUs
};
