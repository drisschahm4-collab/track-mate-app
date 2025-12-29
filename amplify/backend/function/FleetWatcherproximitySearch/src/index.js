/* Amplify Params - DO NOT EDIT
	API_ADMINQUERIES_APIID
	API_ADMINQUERIES_APINAME
	API_FLEETWATCHERFRONT_GRAPHQLAPIENDPOINTOUTPUT
	API_FLEETWATCHERFRONT_GRAPHQLAPIIDOUTPUT
	API_FLEETWATCHERFRONT_GRAPHQLAPIKEYOUTPUT
	ENV
	REGION
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
const axios = require('axios');
const AWS = require('aws-sdk');
const xml2js = require('xml2js');

const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
   const {
       arguments: { address, companyId }
   } = event;

   console.log('Received arguments:', { address, companyId });

   try {
       // Appel à l'API Gisgraphy
       const geoResponse = await axios.get(`http://198.244.212.151:8080/geocoding/geocode?address=${encodeURIComponent(address)}`);

       // Convertir la réponse XML en JSON
       const parsedResponse = await new Promise((resolve, reject) => {
           xml2js.parseString(geoResponse.data, (err, result) => {
               if (err) {
                   reject(err);
               } else {
                   resolve(result);
               }
           });
       });

       if (parsedResponse && parsedResponse.results && parsedResponse.results.result) {
           const addressLat = parseFloat(parsedResponse.results.result[0].lat[0]);
           const addressLng = parseFloat(parsedResponse.results.result[0].lng[0]);

           console.log('Geocoded coordinates:', { addressLat, addressLng });

           // Récupération des trames
           let trames = [];
           let lastEvaluatedKey = null;

           do {
               const tramesResponse = await dynamodb.query({
                   TableName: 'Trame-tktqxx6apngitfngva75btjsfm-fwatcher',
                   IndexName: 'tramesByCompany',
                   KeyConditionExpression: 'companyTramesId = :companyId',
                   ExpressionAttributeValues: {
                       ':companyId': companyId
                   },
                   ExclusiveStartKey: lastEvaluatedKey
               }).promise();

               // Calculer la distance pour chaque trame
               const tramesWithDistance = tramesResponse.Items
                   .filter(trame => trame.lat && trame.lng)
                   .map(trame => {
                       const distance = calculateDistance(
                           addressLat,
                           addressLng,
                           parseFloat(trame.lat),
                           parseFloat(trame.lng)
                       );
                       
                       // Créer une nouvelle trame avec la distance calculée
                       return {
                           ...trame,
                           distance: parseFloat(distance.toFixed(2))
                       };
                   });

               trames = [...trames, ...tramesWithDistance];
               lastEvaluatedKey = tramesResponse.LastEvaluatedKey;

           } while (lastEvaluatedKey);

           // Trier les trames par distance
           const sortedTrames = trames.sort((a, b) => a.distance - b.distance);

           return sortedTrames;

       } else {
           console.error('Invalid geocoding response');
           return [];
       }
   } catch (error) {
       console.error('Error:', error);
       return [];
   }
};

function calculateDistance(lat1, lon1, lat2, lon2) {
   const R = 6371; // Rayon de la Terre en km
   const dLat = deg2rad(lat2 - lat1);
   const dLon = deg2rad(lon2 - lon1);
   const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
       Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
       Math.sin(dLon / 2) * Math.sin(dLon / 2);
   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
   return R * c;
}

function deg2rad(deg) {
   return deg * (Math.PI / 180);
}