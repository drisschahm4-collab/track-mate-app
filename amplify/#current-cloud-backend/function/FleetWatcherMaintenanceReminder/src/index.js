/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	MJ_APIKEY_PRIVATE
	MJ_APIKEY_PUBLIC
	MJ_SENDER
	MAILJET_API_KEY
	MAILJET_SECRET_KEY
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const mailjet = require('node-mailjet');

const mailjetClient = mailjet.apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_SECRET_KEY
);

const sendMaintenanceReminder = async (reminderData, email) => {
  try {
    // Préparer le contenu de l'email selon le type de rappel
    let subject, textContent, htmlContent;

    if (reminderData.reminderType === 'EARLY') {
      subject = `Rappel de maintenance dans ${reminderData.reminderDays} ${reminderData.reminderText} - Véhicule ${reminderData.vehicle.immat}`;
      textContent = `Rappel: Une maintenance est prévue dans ${reminderData.reminderDays} ${reminderData.reminderText}`;
      htmlContent = `<p>Une maintenance est prévue dans ${reminderData.reminderDays} ${reminderData.reminderText}:</p>`;
    } else {
      subject = `Rappel: Maintenance prévue aujourd'hui - Véhicule ${reminderData.vehicle.immat}`;
      textContent = "Rappel: Une maintenance est prévue aujourd'hui";
      htmlContent = "<p>Une maintenance est prévue aujourd'hui:</p>";
    }

    const request = await mailjetClient.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: "k.izzouke@geoloc-systems.com",
            Name: "Fleet Watcher"
          },
          To: [
            {
              Email: email
            }
          ],
          Subject: subject,
          TextPart: `${textContent}
          
Véhicule: ${reminderData.vehicle.immat}
Type d'opération: ${reminderData.operationName}
Date prévue: ${new Date(reminderData.alertDate).toLocaleDateString()}
${reminderData.notes ? `Notes: ${reminderData.notes}` : ''}`,
          HTMLPart: `
            <h3>Rappel de maintenance</h3>
            ${htmlContent}
            <ul>
              <li><strong>Véhicule:</strong> ${reminderData.vehicle.immat}</li>
              <li><strong>Type d'opération:</strong> ${reminderData.operationName}</li>
              <li><strong>Date prévue:</strong> ${new Date(reminderData.alertDate).toLocaleDateString()}</li>
              ${reminderData.notes ? `<li><strong>Notes:</strong> ${reminderData.notes}</li>` : ''}
            </ul>
          `
        }
      ]
    });

    console.log('Email sent successfully:', request.body);
    return request.body;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

exports.handler = async (event) => {
  try {
    console.log('Event received:', JSON.stringify(event));

    const { email, reminderData } = event;
    
    if (!email || !reminderData) {
      throw new Error('Missing required parameters: email or reminderData');
    }

    await sendMaintenanceReminder(reminderData, email);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Maintenance reminder sent successfully',
        reminderType: reminderData.reminderType
      })
    };
  } catch (error) {
    console.error('Error in maintenance reminder handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Error sending maintenance reminder',
        error: error.message 
      })
    };
  }
};