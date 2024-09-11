const nodemailer = require("nodemailer");
const { getRegistrationEmailTemplate } = require("../templates/emailTemplates");

class MailService {

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: 'smtp.yandex.ru',
            port: 465,
            secure: true,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASSWORD
            }
        })
    }

    async sendRegCode (email, code) {
        try{
            await this.transporter.sendMail({
                from: process.env.MAIL_USER,
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