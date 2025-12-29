/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	ANTAI_EMAIL
	ANTAI_PASSWORD
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

import fetch from "node-fetch";
import base64 from "base-64";

const EMAIL = process.env.ANTAI_EMAIL;      // ⚠️ stocke en variable d’environnement Lambda
const PASSWORD = process.env.ANTAI_PASSWORD;
const BASE_URL = "https://sandbox.entreprises.antai.gouv.fr";

export const handler = async (event) => {
  console.log("Event reçu:", JSON.stringify(event, null, 2));

  const { immatriculation, marque, modele } = event.arguments.input;

  try {
    // 1. INIT
    let r_init = await fetch(`${BASE_URL}/api/init`, { method: "GET" });
    if (!r_init.ok) {
      return errorResponse(`Erreur INIT: ${r_init.status} ${await r_init.text()}`);
    }

    // Extraire cookies pour récupérer le XSRF-TOKEN
    const cookies = r_init.headers.raw()["set-cookie"] || [];
    const xsrfToken = extractCookie(cookies, "XSRF-TOKEN");
    if (!xsrfToken) return errorResponse("Token XSRF non trouvé");

    // 2. LOGIN
    const encoded = base64.encode(`${EMAIL}:${PASSWORD}`);
    let r_login = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${encoded}`,
        "X-XSRF-TOKEN": xsrfToken
      }
    });

    if (!r_login.ok) {
      return errorResponse(`Erreur LOGIN: ${r_login.status} ${await r_login.text()}`);
    }

    const jwt = r_login.headers.get("authorization");
    if (!jwt) return errorResponse("JWT introuvable");

    console.log("✅ Authentification réussie");

    // 3. CRÉATION VÉHICULE
    const vehiculeData = {
      immatriculation,
      paysImmatriculation: "FRA",
      marque,
      modele
    };

    let r_vehicle = await fetch(`${BASE_URL}/flotteconventionnee/vehicule`, {
      method: "POST",
      headers: {
        "Authorization": jwt,
        "X-XSRF-TOKEN": xsrfToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(vehiculeData)
    });

    const vehicleResponse = await r_vehicle.text();
    console.log("🚗 Création véhicule:", r_vehicle.status, vehicleResponse);

    // 4. GÉNÉRATION INFRACTION
    const infractionData = {
      immatriculation,
      paysImmatriculation: "FRA",
      nombre: 1
    };

    let r_infraction = await fetch(`${BASE_URL}/flotteconventionnee/test/genererInfractions`, {
      method: "POST",
      headers: {
        "Authorization": jwt,
        "X-XSRF-TOKEN": xsrfToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(infractionData)
    });

    const infractionResponse = await r_infraction.text();
    console.log("🚨 Génération infraction:", r_infraction.status, infractionResponse);

    // ✅ Retour structuré pour AppSync
    return {
      success: true,
      vehicleResponse,
      infractionResponse
    };

  } catch (err) {
    console.error("Erreur Lambda:", err);
    return errorResponse(err.message);
  }
};

// Helper pour extraire cookie
function extractCookie(cookieArray, name) {
  for (let c of cookieArray) {
    if (c.startsWith(`${name}=`)) {
      return c.split(";")[0].split("=")[1];
    }
  }
  return null;
}

// Helper pour uniformiser erreurs
function errorResponse(msg) {
  return {
    success: false,
    error: msg
  };
}
