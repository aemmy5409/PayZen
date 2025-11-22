import nodemailer from "nodemailer";

const mailClient = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, 
  auth: {
    user: process.env.EMAIL,                   
    pass: process.env.EMAIL_PASSWORD,      
  },
  tls: {
    rejectUnauthorized: true
  }
});

export default mailClient;