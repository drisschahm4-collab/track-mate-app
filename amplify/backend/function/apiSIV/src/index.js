
'use strict';

const AWS = require('aws-sdk');
const fetch = require('node-fetch');

/* =======================
   CONFIGURATION
======================= */

const VEHICLES_TABLE_NAME = 'Vehicle-s2u7z4ppy5cndoamshbscmpggy-dev';
const GSI_NAME = 'vehiclesByCompany';

const API_TOKEN = '2cc614726936bc2fc2533b8f47f42c06';
const API_ENDPOINT = 'https://app.auto-ways.net/api/v1/fr';

const COMPANY_VEHICLES_ID = 'f34b6531-f20b-49c9-b38c-9b745d1ec273';

const BATCH_SIZE = 100;
const CONCURRENCY = 5;
const API_DELAY = 150;
const API_RETRIES = 3;
const MAX_VEHICLES = 0;

/* =======================
   AWS CLIENTS
======================= */

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda();

/* =======================
   UTILS
======================= */

const delay = ms => new Promise(res => setTimeout(res, ms));

function buildUpdateExpression(attributes) {
  const expressionParts = [];
  const expressionValues = {};
  const expressionAttrNames = {};

  for (const key in attributes) {
    expressionParts.push(`#${key} = :${key}`);
    expressionValues[`:${key}`] = attributes[key];
    expressionAttrNames[`#${key}`] = key;
  }

  return {
    UpdateExpression: 'SET ' + expressionParts.join(', '),
    ExpressionAttributeValues: expressionValues,
    ExpressionAttributeNames: expressionAttrNames
  };
}

/* =======================
   HANDLER
======================= */

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  console.log('🚀 Batch véhicules démarré');

  try {
    const startKey = event.startKey || null;
    const processedCount = event.processedCount || 0;
    const successCount = event.successCount || 0;
    const failedCount = event.failedCount || 0;
    // const companyVehiclesId = event.companyVehiclesId || COMPANY_VEHICLES_ID;

    // Ici on récupère le companyVehiclesId depuis le resolver GraphQL
    const companyVehiclesId = event.companyVehiclesId || COMPANY_VEHICLES_ID;
    if (!companyVehiclesId) {
      throw new Error('companyVehiclesId requis');
    }


    //if (!companyVehiclesId) throw new Error('companyVehiclesId requis');

    // ===== Query DynamoDB =====
    const params = {
      TableName: VEHICLES_TABLE_NAME,
      IndexName: GSI_NAME,
      KeyConditionExpression: 'companyVehiclesId = :cid',
      ExpressionAttributeValues: { ':cid': companyVehiclesId },
      Limit: BATCH_SIZE
    };

    if (startKey) params.ExclusiveStartKey = startKey;

    const result = await dynamoDB.query(params).promise();
    const vehicles = result.Items || [];

    if (!vehicles.length) {
      return buildResponse('Traitement terminé', processedCount, successCount, failedCount);
    }

    // ===== Traitement concurrent =====
    const batchResults = await processBatchConcurrently(vehicles);

    const batchSuccess = batchResults.filter(r => r.success).length;
    const batchFailed = vehicles.length - batchSuccess;

    const totalProcessed = processedCount + vehicles.length;
    const totalSuccess = successCount + batchSuccess;
    const totalFailed = failedCount + batchFailed;

    console.log(`✅ Batch: ${batchSuccess} succès / ${batchFailed} échecs`);

    if (MAX_VEHICLES > 0 && totalProcessed >= MAX_VEHICLES) {
      return buildResponse('Maximum atteint', totalProcessed, totalSuccess, totalFailed);
    }

    // ===== Auto-invocation =====
    if (result.LastEvaluatedKey) {
      await lambda.invoke({
        FunctionName: context.functionName,
        InvocationType: 'Event',
        Payload: JSON.stringify({
          companyVehiclesId,
          startKey: result.LastEvaluatedKey,
          processedCount: totalProcessed,
          successCount: totalSuccess,
          failedCount: totalFailed
        })
      }).promise();

      return {
        statusCode: 202,
        body: JSON.stringify({ message: 'Batch suivant lancé', processed: totalProcessed })
      };
    }

    return buildResponse('Traitement terminé', totalProcessed, totalSuccess, totalFailed);

  } catch (err) {
    console.error('❌ Erreur globale', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

/* =======================
   BATCH CONCURRENT
======================= */

async function processBatchConcurrently(vehicles) {
  const results = [];

  for (let i = 0; i < vehicles.length; i += CONCURRENCY) {
    const chunk = vehicles.slice(i, i + CONCURRENCY);

    const promises = chunk.map(v =>
      processVehicleWithRetry(v)
        .then(() => ({ success: true }))
        .catch(err => {
          console.error('❌ Véhicule KO', err.message, 'immat:', v.immat);
          return { success: false };
        })
    );

    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);

    await delay(API_DELAY);
  }

  return results;
}

async function processVehicleWithRetry(vehicle) {
  let lastError;

  for (let i = 1; i <= API_RETRIES; i++) {
    try {
      return await processVehicle(vehicle);
    } catch (err) {
      lastError = err;
      console.warn(`Retry ${i} pour immat ${vehicle.immat}:`, err.message);
      await delay(200 * i);
    }
  }

  throw lastError;
}

/* =======================
   VEHICLE PROCESS
======================= */

async function processVehicle(vehicle) {
  const immatRaw = vehicle.immat || vehicle.name;
  if (!immatRaw) throw new Error('Pas immatriculation');

  if (immatRaw.toUpperCase().includes('LIEBHERR') || immatRaw.toUpperCase().includes('MK')) {
    return true; // Skip certains véhicules
  }

  const immat = extractImmat(immatRaw);
  if (!immat) throw new Error('Format immat invalide');

  const url = `${API_ENDPOINT}?plaque=${immat}&token=${API_TOKEN}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const api = await response.json();
  if (api.code !== 200) throw new Error(api.message);

  console.log('🔹 Données SIV récupérées pour', immatRaw, api.data);

  await updateVehicleWithSivData(immatRaw, api.data);
  return true;
}

/* =======================
   IMMATRICULATION
======================= */

function extractImmat(str) {
  if (!str) return null;
  const cleaned = str.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const match = cleaned.match(/([A-Z]{2})(\d{3})([A-Z]{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

/* =======================
   UPDATE DYNAMODB
======================= */

async function updateVehicleWithSivData(immat, sivData) {
  if (!immat) throw new Error('immat manquante pour update');

  const attributeUpdates = {
    realImmat: sivData.AWN_immat || "",
    AWN_VIN: sivData.AWN_VIN || "",
    marque: sivData.AWN_marque || "",
    modele: sivData.AWN_modele || "",
    AWN_version: sivData.AWN_version || "",
    AWN_nom_commercial: sivData.AWN_nom_commercial || "",
    AWN_label: sivData.AWN_label || "",
    carrosserie: sivData.AWN_carrosserie || sivData.AWN_carrosserie_carte_grise || "",
    couleur: sivData.AWN_couleur || "",
    puissanceFiscale: parseInt(sivData.AWN_puissance_fiscale) || 0,
    puissanceDin: parseInt(sivData.AWN_puissance_chevaux) || 0,
    AWN_puissance_KW: parseInt(sivData.AWN_puissance_KW) || 0,
    energie: sivData.AWN_energie || "",
    AWN_code_moteur: sivData.AWN_code_moteur || "",
    AWN_nbr_cylindres: parseInt(sivData.AWN_nbr_cylindres || sivData.AWN_nbr_cylindre_energie) || 0,
    AWN_nbr_soupapes: parseInt(sivData.AWN_nbr_soupapes || sivData.AWN_nbr_valves) || 0,
    AWN_max_speed: parseInt(sivData.AWN_max_speed) || 0,
    AWN_consommation_urbaine: parseFloat(sivData.AWN_consommation_urbaine) || 0,
    AWN_consommation_ex_urbaine: parseFloat(sivData.AWN_consommation_ex_urbaine) || 0,
    AWN_consommation_mixte: parseFloat(sivData.AWN_consommation_mixte) || 0,
    emissions: parseInt(sivData.AWN_emission_co_2 || sivData.AWN_emission_co_2_prf) || 0,
    AWN_codes_moteur: Array.isArray(sivData.AWN_codes_moteur) ? sivData.AWN_codes_moteur : [],
    AWN_KBAS: Array.isArray(sivData.AWN_KBAS) ? sivData.AWN_KBAS : [],
    AWN_pneus: Array.isArray(sivData.AWN_pneus) ? sivData.AWN_pneus : [],
    AWN_k_types: Array.isArray(sivData.AWN_k_types) ? sivData.AWN_k_types : [],
    AWN_url_image: sivData.AWN_url_image || sivData.AWN_chemin_image || "",
    AWN_categorie_vehicule: sivData.AWN_categorie_vehicule || "",
    AWN_group: sivData.AWN_group || "",
    AWN_style_carrosserie: sivData.AWN_style_carrosserie || sivData.AWN_style_carrosserie_code || "",
    AWN_niveau_de_bruit_au_ralenti: parseInt(sivData.AWN_niveau_de_bruit_au_ralenti) || 0,
    AWN_poids_total_roulant: parseInt(sivData.AWN_poids_total_roulant) || 0,
    AWN_poids_vide: parseInt(sivData.AWN_poids_vide) || 0,
    AWN_poids_total_roulant_prf: parseInt(sivData.AWN_poids_total_roulant_prf) || 0,
    AWN_empattement: parseInt(sivData.AWN_empattement) || 0,
    AWN_nbr_places: parseInt(sivData.AWN_nbr_places) || 0,
    AWN_nbr_portes: parseInt(sivData.AWN_nbr_portes) || 0,
    AWN_depollution: sivData.AWN_depollution || "",
    AWN_norme_euro_standardise: sivData.AWN_norme_euro_standardise || "",
    AWN_mode_injection: sivData.AWN_mode_injection || "",
    AWN_type_boite_vites: sivData.AWN_type_boite_vites || "",
    AWN_max_speed: parseInt(sivData.AWN_max_speed) || 0,
    AWN_tid: sivData.AWN_tid || "",
    AWN_generation: sivData.AWN_generation || "",
    AWN_type_anti_vol: sivData.AWN_type_anti_vol || "",
    AWN_classe_environnement_ce: sivData.AWN_classe_environnement_ce || "",
    AWN_niveau_sonore: sivData.AWN_niveau_sonore || "",
    AWN_segment: sivData.AWN_segment || "",
    AWN_marque_code: sivData.AWN_marque_code || "",
    AWN_modele_code: sivData.AWN_modele_code || "",
    AWN_modele_prf: sivData.AWN_modele_prf || "",
    AWN_marque_id: sivData.AWN_marque_id || "",
    AWN_modele_id: sivData.AWN_modele_id || "",
    AWN_type_variante_version: sivData.AWN_type_variante_version || "",
    AWN_nbr_vitesses: parseInt(sivData.AWN_nbr_vitesses) || 0,
    AWN_code_certificat_qualite_air: sivData.AWN_code_certificat_qualite_air || "",
    AWN_mode_transmission: sivData.AWN_mode_transmission || "",
    AWN_roues_motrices: sivData.AWN_roues_motrices || "",
    AWN_collection: sivData.AWN_collection || "",
    sivData, // on garde la structure complète
    updatedAt: new Date().toISOString()
  };
  
  /*const attributeUpdates = {
    realImmat: sivData.AWN_immat || "",
    AWN_VIN: sivData.AWN_VIN || "",
    marque: sivData.AWN_marque || "",
    modele: sivData.AWN_modele || "",
    AWN_version: sivData.AWN_version || "",
    AWN_nom_commercial: sivData.AWN_nom_commercial || "",
    AWN_label: sivData.AWN_label || "",
    carrosserie: sivData.AWN_carrosserie || "",
    couleur: sivData.AWN_couleur || "",
    puissanceFiscale: parseInt(sivData.AWN_puissance_fiscale) || 0,
    puissanceDin: parseInt(sivData.AWN_puissance_chevaux) || 0,
    AWN_puissance_KW: parseInt(sivData.AWN_puissance_KW) || 0,
    energie: sivData.AWN_energie || "",
    AWN_code_moteur: sivData.AWN_code_moteur || "",
    AWN_nbr_cylindres: parseInt(sivData.AWN_nbr_cylindres) || 0,
    AWN_nbr_soupapes: parseInt(sivData.AWN_nbr_soupapes) || 0,
    AWN_max_speed: parseInt(sivData.AWN_max_speed) || 0,
    AWN_consommation_urbaine: parseFloat(sivData.AWN_consommation_urbaine) || 0,
    AWN_consommation_ex_urbaine: parseFloat(sivData.AWN_consommation_ex_urbaine) || 0,
    AWN_consommation_mixte: parseFloat(sivData.AWN_consommation_mixte) || 0,
    emissions: parseInt(sivData.AWN_emission_co_2) || 0,
    AWN_codes_moteur: Array.isArray(sivData.AWN_codes_moteur) ? sivData.AWN_codes_moteur : [],
    AWN_KBAS: Array.isArray(sivData.AWN_KBAS) ? sivData.AWN_KBAS : [],
    AWN_pneus: Array.isArray(sivData.AWN_pneus) ? sivData.AWN_pneus : [],
    sivData,
    updatedAt: new Date().toISOString()
  };*/

  const updateParams = {
    TableName: VEHICLES_TABLE_NAME,
    Key: { immat },
    ...buildUpdateExpression(attributeUpdates),
    ReturnValues: 'UPDATED_NEW'
  };

  console.log('🔹 Update DynamoDB pour immat:', immat);
  console.log('🔹 Params:', JSON.stringify(updateParams, null, 2));

  const result = await dynamoDB.update(updateParams).promise();

  console.log('✅ Mise à jour OK pour immat:', immat);
  console.log('✅ Attributs:', JSON.stringify(result.Attributes, null, 2));

  return result.Attributes;
}

/* =======================
   RESPONSE
======================= */

function buildResponse(message, processed, success, failed) {
  return {
    statusCode: 200,
    body: JSON.stringify({ message, processed, success, failed })
  };
}
