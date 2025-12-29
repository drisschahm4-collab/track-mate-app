import twilio from 'twilio';
import Mailjet from 'node-mailjet';

export default class ApiService {

  constructor() {
    this.twilioPhone = process.env.TWILIO_SENDER;
    this.twilioClient = twilio(
      process.env.TWILIO_APIKEY_PUBLIC,
      process.env.TWILIO_APIKEY_PRIVATE
    );
    this.mailClient = Mailjet.apiConnect(
      process.env.MJ_APIKEY_PUBLIC,
      process.env.MJ_APIKEY_PRIVATE,
    );
  }

  sendViaSms = async (recipients, template) => {
    for (const recipient of recipients) {
      await this.twilioClient.messages.create({
        body: template.replace(/\\n/g, '\n'),
        from: this.twilioPhone,
        to: recipient
      })
        .then(() => console.info(`Message sent successfully to ${recipient}.`))
        .catch((error) => console.error(`Error sending message to ${recipient}:`, error));
    }
  }

  sendViaWhatsapp = async (recipients, template) => {
    for (const recipient of recipients) {
      await this.twilioClient.messages.create({
        body: template.replace(/\\n/g, '\n'),
        from: `whatsapp:${this.twilioPhone}`,
        to: `whatsapp:${recipient}`
      })
        .then(() => console.info(`Message sent successfully to ${recipient}.`))
        .catch((error) => console.error(`Error sending message to ${recipient}:`, error));
    }
  }

  sendViaMail = async (emails, template) => {
    const formatedEmails = emails.map(email => ({Email: email}));
    await this.mailClient.post('send', {version: 'v3.1'}).request({
      Messages: [
        {
          From: {
            Email: process.env.MJ_SENDER,
            Name: 'Geoloc-Systems'
          },
          To: formatedEmails,
          Subject: "Notification Geoloc-Systems",
          HTMLPart: template
        }
      ]
    })
      .then((result) => console.log(`Email sent successfully to ${formatedEmails}`))
      .catch((error) => console.error(`Error sending email`, error));
  }
}
