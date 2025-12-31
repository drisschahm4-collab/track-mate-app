

// /**
//  * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
//  */
// exports.handler = async (event) => {
//     console.log(`EVENT: ${JSON.stringify(event)}`);
//     return {
//         statusCode: 200,
//     //  Uncomment below to enable CORS requests
//     //  headers: {
//     //      "Access-Control-Allow-Origin": "*",
//     //      "Access-Control-Allow-Headers": "*"
//     //  },
//         body: JSON.stringify('Hello from Lambda!'),
//     };
// };

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const AWS = require('aws-sdk');
const fetch = require('node-fetch');

const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Configuration
const INFO_SIV_TABLE_NAME = process.env.INFO_SIV_TABLE_NAME || 'SIV';
const API_TOKEN = process.env.API_TOKEN || '2cc614726936bc2fc2533b8f47f42c06';

// Fonction avancée pour extraire une immatriculation d'une chaîne de texte
// Prend en compte tous les formats observés dans les données
function extractImmat(vehicleName) { 
  if (!vehicleName || typeof vehicleName !== 'string') return null;
  
  // Convertir en majuscules pour une meilleure correspondance
  const upperVehicleName = vehicleName.toUpperCase();
  
  // 1. Format moderne avec ou sans tirets: AA-123-BB ou AA123BB
  const modernPattern = /([A-Z]{2})-?(\d{3})-?([A-Z]{2})/;
  const modernMatch = modernPattern.exec(upperVehicleName);
  
  if (modernMatch) {
    return `${modernMatch[1]}-${modernMatch[2]}-${modernMatch[3]}`;
  }
  
  // 2. Format moderne avec espaces: AA 123 BB
  const spacePattern = /([A-Z]{2})\s+(\d{3})\s+([A-Z]{2})/;
  const spaceMatch = spacePattern.exec(upperVehicleName);
  
  if (spaceMatch) {
    return `${spaceMatch[1]}-${spaceMatch[2]}-${spaceMatch[3]}`;
  }
  
  // 3. Format ancien: 123 ABC 45 ou 123-ABC-45
  const oldPattern = /(\d{2,3})[-\s]?([A-Z]{2,3})[-\s]?(\d{2})/;
  const oldMatch = oldPattern.exec(upperVehicleName);
  
  if (oldMatch) {
    return `${oldMatch[1]}-${oldMatch[2]}-${oldMatch[3]}`;
  }
  
  // 4. Cas spécial - Plaque entre parenthèses: (B) XX 123 YY
  const parenthesesPattern = /\([A-Z]\)\s+([A-Z]{2})\s+(\d{3})\s+([A-Z]{2})/;
  const parenthesesMatch = parenthesesPattern.exec(upperVehicleName);
  
  if (parenthesesMatch) {
    return `${parenthesesMatch[1]}-${parenthesesMatch[2]}-${parenthesesMatch[3]}`;
  }
  
  // Si aucun format reconnu n'est trouvé
  return null;
}

// Fonction pour enregistrer une immatriculation invalide dans les logs
function logInvalidImmatriculation(immat, reason) {
  // Date et heure actuelles
  const timestamp = new Date().toISOString();
  const logMessage = `[INVALID_IMMAT] ${timestamp} - Immatriculation invalide: ${immat} - Raison: ${reason}`;
  
  console.warn(logMessage);
}

// Fonction améliorée pour standardiser le format des plaques d'immatriculation
const formatImmatriculation = (plate) => {
  if (!plate) return plate;
  
  // Essayer d'abord d'extraire une immatriculation si le format n'est pas standard
  // Utile pour les cas comme "FY 573 HF - CITROEN BERLI..." ou "AA-710-FN 13T BACHE"
  const extractedPlate = extractImmat(plate);
  if (extractedPlate) {
    console.log(`Immatriculation extraite: ${extractedPlate} (depuis ${plate})`);
    return extractedPlate;
  }
  
  // Supprimer tous les tirets et espaces pour normaliser
  const cleaned = plate.replace(/[-\s]/g, '').toUpperCase();
  
  // Vérifier si la plaque est au format français moderne (AA-123-BB ou similaire)
  if (cleaned.length === 7 && 
      /^[A-Z]{2}\d{3}[A-Z]{2}$/.test(cleaned)) {
    return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 5)}-${cleaned.substring(5, 7)}`;
  }
  
  // Format ancien (123-ABC-34 ou similaire)
  if (cleaned.length === 7 && 
      /^\d{2,3}[A-Z]{2,3}\d{2}$/.test(cleaned)) {
    // Déterminer la position de séparation en fonction du nombre de chiffres au début
    if (/^\d{2}[A-Z]{3}\d{2}$/.test(cleaned)) {
      return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 5)}-${cleaned.substring(5, 7)}`;
    } else {
      return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 5)}-${cleaned.substring(5, 7)}`;
    }
  }
  
  // Si le format ne correspond à aucun des modèles connus, retourner tel quel
  return plate;
};

// Fonction pour vérifier si l'immatriculation existe déjà dans la table SIV
async function checkExistingImmatriculation(immat) {
  try {
    const params = {
      TableName: INFO_SIV_TABLE_NAME,
      Key: { id: immat }
    };
    
    const result = await dynamoDB.get(params).promise();
    
    if (result.Item) {
      console.log(`Immatriculation ${immat} trouvée dans la base de données`);
      return result.Item;
    }
    
    console.log(`Immatriculation ${immat} non trouvée dans la base de données`);
    return null;
  } catch (error) {
    console.error("Erreur lors de la vérification de l'immatriculation dans la base de données:", error);
    return null;
  }
}

// Fonction pour convertir un objet DynamoDB AttributeValue en objet JavaScript
function unmarshallDynamoDBObject(dynamoObject) {
  const converter = AWS.DynamoDB.Converter;
  return converter.unmarshall(dynamoObject);
}

exports.handler = async (event) => {
  try {
    // Vérification du token API
    if (!API_TOKEN) {
      console.error("API token non configuré dans les variables d'environnement");
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "API token non configuré.",
          error: true
        })
      };
    }
    
    // Récupération de la plaque depuis l'événement
    let plaque = event.plaque;
    console.log(`Plaque d'origine reçue: "${plaque}"`);
    
    // Si aucune plaque n'est fournie
    if (!plaque) {
      console.error("Aucune immatriculation fournie dans l'événement");
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Aucune immatriculation fournie",
          isValid: false,
          reason: "Immatriculation manquante"
        })
      };
    }
    
    // Cas spécial - si la plaque contient "ancien", la nettoyer
    if (typeof plaque === 'string' && plaque.toLowerCase().includes('ancien')) {
      plaque = plaque.replace(/ancien/i, '').trim();
      console.log(`Mot "ancien" retiré, nouvelle valeur: "${plaque}"`);
    }
    
    // Formatage de la plaque d'immatriculation (incluant l'extraction si nécessaire)
    const formattedImmat = formatImmatriculation(plaque);
    console.log(`Plaque formatée: "${formattedImmat}"`);
    
    // Vérifier si le formatage a échoué ou produit un résultat invalide
    if (!formattedImmat || formattedImmat.length < 7) {
      console.error(`Impossible de formater l'immatriculation: ${plaque}`);
      logInvalidImmatriculation(plaque, "Format non reconnu");
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Format d'immatriculation non reconnu",
          immat: plaque,
          isValid: false,
          reason: "Format non reconnu"
        })
      };
    }
    
    // Vérifier si cette immatriculation existe déjà dans la base de données
    const existingData = await checkExistingImmatriculation(formattedImmat);
    
    let apiResponse, normalizedData;
    let isImmatInvalid = false;
    
    if (existingData) {
      console.log("Utilisation des données existantes de la base SIV");
      normalizedData = existingData.data || {};
      apiResponse = {
        code: 200,
        error: false,
        country: existingData.country || "FR",
        plaque: formattedImmat
      };
    } else {
      console.log("Appel à l'API SIV pour obtenir les informations du véhicule");
      
      // Construction de l'URL de l'API avec les paramètres requis
      const apiEndpoint = "https://app.auto-ways.net/api/v1/fr";
      const params = new URLSearchParams({
        plaque: formattedImmat,
        token: API_TOKEN
      });
      const url = `${apiEndpoint}?${params.toString()}`;

      // Appel à l'API SIV
      try {
        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) {
          console.error(`Erreur HTTP lors de l'appel à l'API: ${response.status}`);
          isImmatInvalid = true;
          logInvalidImmatriculation(formattedImmat, `Erreur HTTP ${response.status}`);
          
          return {
            statusCode: 200, // On renvoie 200 pour que le client puisse traiter la réponse
            body: JSON.stringify({
              message: "Immatriculation invalide ou non trouvée",
              immat: formattedImmat,
              isValid: false,
              reason: `Erreur HTTP ${response.status} lors de l'appel à l'API`
            })
          };
        }
        
        apiResponse = await response.json();
        console.log("Réponse API :", JSON.stringify(apiResponse).substring(0, 200) + "...");
      } catch (error) {
        console.error("Erreur lors de l'appel à l'API SIV :", error);
        isImmatInvalid = true;
        logInvalidImmatriculation(formattedImmat, `Erreur réseau: ${error.message}`);
        
        return {
          statusCode: 200, // On renvoie 200 pour que le client puisse traiter la réponse
          body: JSON.stringify({
            message: "Erreur lors de la vérification de l'immatriculation",
            immat: formattedImmat,
            isValid: false,
            reason: `Erreur réseau: ${error.message}`
          })
        };
      }

      // Vérification de la réponse API (code 200 et error false)
      if (apiResponse.code !== 200 || apiResponse.error) {
        console.error("Erreur API SIV :", apiResponse.message);
        isImmatInvalid = true;
        logInvalidImmatriculation(formattedImmat, apiResponse.message || "Erreur API inconnue");
        
        return {
          statusCode: 200, // On renvoie 200 pour que le client puisse traiter la réponse
          body: JSON.stringify({
            message: "Immatriculation invalide ou non trouvée par l'API",
            immat: formattedImmat,
            isValid: false,
            reason: apiResponse.message || "Erreur API inconnue"
          })
        };
      }

      // Extraction des données retournées
      const data = apiResponse.data || {};
      
      // Vérifier si les données sont au format DynamoDB AttributeValue et les normaliser
      normalizedData = data;
      if (data.AWN_immat && typeof data.AWN_immat === 'object' && data.AWN_immat.S) {
        console.log("Données détectées au format AttributeValue, conversion en cours...");
        normalizedData = unmarshallDynamoDBObject(data);
        console.log("Données converties du format AttributeValue");
      }
      
      // Vérifier si les données sont trop limitées (ce qui pourrait indiquer une immatriculation invalide)
      if (normalizedData.AWN_VIN === 'INCONNU' && normalizedData.AWN_marque === 'INCONNU') {
        console.warn("Données véhicule trop limitées, possible immatriculation invalide");
        isImmatInvalid = true;
        logInvalidImmatriculation(formattedImmat, "Données véhicule trop limitées ou incomplètes");
      } else {
        // Préparation des données pour la table "info_siv" avec les champs spécifiques extraits
        const infoSivData = {
          id: formattedImmat,
          country: apiResponse.country,
          
          // Champs extraits spécifiquement comme demandé
          code_certificat_qualite_air: normalizedData.AWN_code_certificat_qualite_air,
          ad_blue: normalizedData.AWN_ad_blue,
          depollution: normalizedData.AWN_depollution,
          cl_environ_prf: normalizedData.AWN_cl_environ_prf,
          model_image: normalizedData.AWN_model_image,
          marque: normalizedData.AWN_marque,
          marque_id: normalizedData.AWN_marque_id,
          modele: normalizedData.AWN_modele,
          modele_id: normalizedData.AWN_modele_id,
          version: normalizedData.AWN_version,
          immatriculation: normalizedData.AWN_immat,
          VIN: normalizedData.AWN_VIN,
          k_type: normalizedData.AWN_k_type,
          type_mine: normalizedData.AWN_type_mine,
          AWN_url_image:normalizedData.AWN_url_image,
          
          // Ajouter des timestamps
          createdAt: existingData ? existingData.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          
          // Stocker également les données complètes
          data: normalizedData
        };

        // Insertion dans la table "info_siv"
        try {
          await dynamoDB.put({
            TableName: INFO_SIV_TABLE_NAME,
            Item: infoSivData
          }).promise();
          console.log("Insertion dans la table info_siv réussie");
        } catch (error) {
          console.error("Erreur lors de l'insertion dans la table info_siv :", error);
          return {
            statusCode: 500,
            body: JSON.stringify({
              message: `Erreur lors de l'insertion dans la table info_siv: ${error.message}`,
              immat: formattedImmat,
              isValid: true,
              error: true
            })
          };
        }
      }
    }

    // Préparer les informations extraites pour la réponse
    const vehicleInfo = {
      immatriculation: formattedImmat,
      marque: normalizedData.AWN_marque,
      modele: normalizedData.AWN_modele,
      version: normalizedData.AWN_version,
      VIN: normalizedData.AWN_VIN,
      date_mise_en_circulation: normalizedData.AWN_date_mise_en_circulation,
      code_certificat_qualite_air: normalizedData.AWN_code_certificat_qualite_air,
      ad_blue: normalizedData.AWN_ad_blue,
      depollution: normalizedData.AWN_depollution,
      cl_environ_prf: normalizedData.AWN_cl_environ_prf,
      model_image: normalizedData.AWN_model_image,
      type_mine: normalizedData.AWN_type_mine,
      k_type: normalizedData.AWN_k_type,
      data_source: existingData ? "database" : "api",
      isValid: !isImmatInvalid
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: existingData ? "Données récupérées depuis la base" : "Mise à jour réussie",
        vehicle: vehicleInfo,
        vehicules_update: "SKIPPED", // On ne touche plus à la table Vehicle
        info_siv_update: existingData ? "SKIPPED" : (isImmatInvalid ? "INVALID" : "OK"),
        immatIsValid: !isImmatInvalid
      })
    };
  } catch (error) {
    console.error("Erreur non gérée dans la fonction Lambda:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Erreur interne du serveur",
        error: error.message
      })
    };
  }
};