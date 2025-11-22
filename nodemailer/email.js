import mailClient from "./nodemailer.conf.js";
import { VERIFICATION_EMAIL_TEMPLATE } from "./emailTemplate.js";

const YEAR = new Date().getFullYear();

export const sendVerificationEmail = async(email, verificationCode, name) => {

	try {
		const msg = await mailClient.sendMail({
	  	from:'PayZen" <no-reply@payzen.com>',
	  	to: email,
	  	subject: "Verify your PayZen account",
	  	html: VERIFICATION_EMAIL_TEMPLATE.replace('{verificationCode}', verificationCode).replace('{name}', name).replace('{year}', YEAR).replace('{verifyUrl}', `${process.env.CLIENT_URL}/api/verify-email`)
		});
  
		console.log(`Message sent: ${msg.messageId}`);
	} catch (err) {
		console.log(`Error sending mail: ${err}`);
		throw new Error(`Error sending mail: ${err.message}`);
	}
	
}