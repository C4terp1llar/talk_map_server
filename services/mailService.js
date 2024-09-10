const nodemailer = require("nodemailer");
const { getRegistrationEmailTemplate } = require("../templates/emailTemplates");

class MailService {

    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASSWORD
            }
        })
    }

    async sendRegCode (email, code) {
        try{
            await this.transporter.sendMail({
                from: 'zeltovartem805@gmail.com',
                to: email,
                subject: `Код подтверждения в TalkMap - ${code}`,
                html: getRegistrationEmailTemplate(code)
            });

        }catch(err){
            console.error(err);
            throw err;
        }
    }
}

module.exports = new MailService();