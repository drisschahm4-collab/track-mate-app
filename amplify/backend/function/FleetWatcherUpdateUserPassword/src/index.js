const AWS = require('aws-sdk');

// Configuration sécurisée (variables d'environnement recommandées)
// AWS.config.update({
//   region: process.env.AWS_REGION || 'eu-west-3',
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

AWS.config.update({ region: 'eu-west-3' });

const cognito = new AWS.CognitoIdentityServiceProvider();

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : event.arguments || {};

    const { userPoolId, username, newPassword } = body;

    if (!userPoolId || !username || !newPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'userPoolId, username et newPassword sont requis.',
        }),
      };
    }

    await cognito.adminSetUserPassword({
      UserPoolId: userPoolId,
      Username: username,
      Password: newPassword,
      Permanent: true,
    }).promise();

    return {
        message: 'Mot de passe mis à jour avec succès',
        error: null,
      };
  } catch (error) {
    console.error('Erreur:', error);

    return {
        message: null,
        error: error.message || 'Erreur inconnue',
      };
  
  }
};
