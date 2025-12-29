/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	ANTAI_USERNAME
	ANTAI_PASSWORD
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

import fetch from "node-fetch";

const BASE_URL = "https://sandbox.entreprises.antai.gouv.fr";

/* ============================================================================
   1️⃣ AUTHENTIFICATION ANTAI
   ============================================================================ */
async function authenticate() {
  const initResponse = await fetch(`${BASE_URL}/api/init`, { method: "GET" });
  const setCookieHeader = initResponse.headers.get("set-cookie");
  if (!setCookieHeader) throw new Error("Cookie XSRF-TOKEN introuvable");

  const xsrfToken = setCookieHeader.match(/XSRF-TOKEN=([^;]+)/)?.[1];
  if (!xsrfToken) throw new Error("Impossible d'extraire le XSRF-TOKEN");

   // 🔹 LOG XSRF TOKEN
   console.log("🔑 XSRF Token récupéré :", xsrfToken);

  const basicAuth = Buffer.from(
    `${process.env.ANTAI_USERNAME}:${process.env.ANTAI_PASSWORD}`
  ).toString("base64");

  const loginResponse = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "X-Xsrf-Token": xsrfToken,
      Cookie: `XSRF-TOKEN=${xsrfToken}`,
    },
  });

  const bearerHeader = loginResponse.headers.get("authorization");
  if (!bearerHeader?.startsWith("Bearer "))
    throw new Error("Bearer token non trouvé");

  const bearerToken = bearerHeader.replace("Bearer ", "");
  
   // 🔹 LOG Bearer Token (à ne pas exposer en prod)
   console.log("🔑 Bearer Token récupéré :", bearerToken);

  console.log("✅ Authentification ANTAI réussie");
  return { xsrfToken, bearerToken };
}

/* ============================================================================
   2️⃣ FONCTION GÉNÉRIQUE D’APPEL API
   ============================================================================ */
async function callAntaiAPI({ method, path, query, body, xsrfToken, bearerToken }) {
  let url = `${BASE_URL}/flotteconventionnee${path}`;
  if (query) {
    const queryString = new URLSearchParams(query).toString();
    url += `?${queryString}`;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${bearerToken}`,
    "X-Xsrf-Token": xsrfToken,
    Cookie: `XSRF-TOKEN=${xsrfToken}`,
  };

  const options = { method, headers };
  if (body && method !== "GET") options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  console.log(`📡 Appel ANTAI ${method} ${path} → ${response.status}`);
  return { status: response.status, ok: response.ok, data };
}

/* ============================================================================
   3️⃣ FONCTION D’AIDE : Génère dates si absentes
   ============================================================================ */
function withDates(input) {
  const now = new Date().toISOString();
  return {
    date_mise_a_jour: input.date_mise_a_jour || now,
    date_debut_gestion: input.date_debut_gestion || now,
    date_fin_gestion:
      input.date_fin_gestion === undefined ? null : input.date_fin_gestion,
    vehicule: input.vehicule,
  };
}

/* ============================================================================
   4️⃣ HANDLER PRINCIPAL LAMBDA
   ============================================================================ */
export const handler = async (event) => {
  // try {
  //   // 🧠 Parsing robuste — supporte tous les formats
  //   let body = event;
  //   console.log('body',body.arguments.request)
  //   if (event.body) {
  //     body =
  //       typeof event.body === "string"
  //         ? JSON.parse(event.body)
  //         : event.body;

  //     // 🩹 Corrige les appels type { body: { action: "..." } }
  //     if (body.body && !body.action && body.body.action) {
  //       body = body.body;
  //     }
  //   }
  try {
    // 🧠 Parsing robuste — supporte tous les formats
    let body = event;

    // 🚫 Évite erreur "cannot read properties of undefined"
    if (event?.arguments?.request) {
      console.log("body", event.arguments.request);
    } else {
      console.log("body", body); // alternative si arguments.request n'existe pas
    }

    // 📌 Si event.body existe → on parse
    if (event.body) {
      body = typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body;

      // 🩹 Corrige les appels type { body: { action: "..." } }
      if (body.body && !body.action && body.body.action) {
        body = body.body;
      }
    }

    // 👉 body.arguments.request existe ET event.body n'existait pas
    if (event?.arguments?.request && !event.body) {
      body = event.arguments.request;
    }

    console.log("📦 Body final:", body);

    const { action, ...params } = body || {};
    if (!action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Paramètre 'action' requis" }),
      };
    }

    // 🔐 Authentifie auprès d’ANTAI
    const { xsrfToken, bearerToken } = await authenticate();
    let result;

    /* ------------------------------------------------------------------------
       3️⃣ CRÉATION D’UN VÉHICULE (POST /vehicule)
       ------------------------------------------------------------------------ */
    if (action === "create") {
      result = await callAntaiAPI({
        method: "POST",
        path: "/vehicule",
        body: params,
        xsrfToken,
        bearerToken,
      });
    }

    /* ------------------------------------------------------------------------
       4️⃣ RÉCUPÉRATION D’UN VÉHICULE (GET /vehicule)
       ------------------------------------------------------------------------ */
    else if (action === "get") {
      result = await callAntaiAPI({
        method: "GET",
        path: "/vehicule",
        query: {
          immatriculation: params.immatriculation,
          pays: params.pays || params.paysImmatriculation,
        },
        xsrfToken,
        bearerToken,
      });
    }

    /* ------------------------------------------------------------------------
       5️⃣ SUPPRESSION D’UN VÉHICULE (PUT /vehicule/delete)
       ------------------------------------------------------------------------ */
       else if (action === "delete") {
        if (!params.vehicule) {
          // Si on ne reçoit pas l'objet complet, on le construit à partir des champs passés
          params.vehicule = {
            immatriculation: params.immatriculation,
            paysImmatriculation: params.pays || params.paysImmatriculation,
            marque: params.marque,
            modele: params.modele,
          };
        }
      
        // On ajoute les dates nécessaires
        const vehiculePayload = withDates(params);
      
        result = await callAntaiAPI({
          method: "DELETE",              // DELETE requis
          path: "/vehicule",      // chemin exact documenté
          body: vehiculePayload,         // payload formaté correctement
          xsrfToken,
          bearerToken,
        });
      }

      /* ------------------------------------------------------------------------
   6️⃣ RÉCUPÉRATION DE LA FLOTTE (GET /flotte/vehicules)
   ------------------------------------------------------------------------ */
else if (action === "getFlotteVehicules") {
  result = await callAntaiAPI({
    method: "GET",
    path: "/flotte/vehicules",
    query: {
      sort: params.sort || "immatriculation",
      desc: params.desc || false,
      page: params.page || 0,
    },
    xsrfToken,
    bearerToken,
  });
}

/* ------------------------------------------------------------------------
   7️⃣ CRÉATION D’UNE FLOTTE (POST /flotte/vehicules)
   ------------------------------------------------------------------------ */
else if (action === "createFlotteVehicules") {
  // params.vehicules attendu = tableau d'objets { immatriculation, paysImmatriculation, marque, modele }
  if (!Array.isArray(params.vehicules) || params.vehicules.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Le paramètre 'vehicules' doit être un tableau non vide.",
      }),
    };
  }

  result = await callAntaiAPI({
    method: "POST",
    path: "/flotte/vehicules",
    body: params.vehicules,
    xsrfToken,
    bearerToken,
  });
}

/* ------------------------------------------------------------------------
   8️⃣ SUPPRESSION (LOGIQUE) D’UNE LISTE DE VÉHICULES (PUT /vehicules/delete)
   ------------------------------------------------------------------------ */
else if (action === "deleteFlotteVehicules") {
  if (!Array.isArray(params.vehicules) || params.vehicules.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Le paramètre 'vehicules' doit être un tableau non vide.",
      }),
    };
  }

  // Chaque entrée doit être enrichie avec les dates
  const now = new Date().toISOString();
  const payload = params.vehicules.map((v) => ({
    vehicule: v.vehicule || {
      immatriculation: v.immatriculation,
      paysImmatriculation: v.paysImmatriculation,
      marque: v.marque,
      modele: v.modele,
    },
    date_mise_a_jour: v.date_mise_a_jour || now,
    date_debut_gestion: v.date_debut_gestion || now,
    date_fin_gestion: v.date_fin_gestion || now,
  }));

  result = await callAntaiAPI({
    method: "PUT",
    path: "/vehicules/delete",
    body: payload,
    xsrfToken,
    bearerToken,
  });
}

/* ------------------------------------------------------------------------
   9️⃣ GÉNÉRATION D’INFRACTIONS POUR TEST (POST /editeur/infraction)
   ------------------------------------------------------------------------ */
  //  else if (action === "generateInfractions") {
  //   // Cette route ne nécessite pas d'authentification
  //   const response = await fetch(`${BASE_URL}/editeur/infraction`, {
  //     method: "POST",
  //   });
  
  //   const data = await response.json().catch(() => ({}));
  //   console.log(`📡 Génération d'infractions → ${response.status}`);
  //   // console.log(await response.json().catch());
  
  //   result = { status: response.status, ok: response.ok, data };
  // }

  /* ------------------------------------------------------------------------
   9️⃣ GÉNÉRATION D’INFRACTIONS POUR TEST (POST /editeur/infraction)
   ------------------------------------------------------------------------ */
else if (action === "generateInfractions") {
  // Vérifie si des paramètres facultatifs ont été passés (par exemple nombre ou type)
  const payload = params || {};

  // 🔐 Appel authentifié à ANTAI
  result = await callAntaiAPI({
    method: "POST",
    path: "/editeur/infraction",
    body: Object.keys(payload).length > 0 ? payload : undefined,
    xsrfToken,
    bearerToken,
  });

  // Log pour debug
  console.log(`📡 Génération d'infractions → ${result.status}`);
}

  
  /* ------------------------------------------------------------------------
     🔟 RÉCUPÉRATION D’UNE INFRACTION (GET /infraction/{numero_aco})
     ------------------------------------------------------------------------ */
  else if (action === "getInfraction") {
    if (!params.numero_aco) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Paramètre 'numero_aco' requis" }),
      };
    }
  
    result = await callAntaiAPI({
      method: "GET",
      path: `/infraction/${params.numero_aco}`,
      xsrfToken,
      bearerToken,
    });
  }
  
  /* ------------------------------------------------------------------------
     1️⃣1️⃣ RÉCUPÉRATION DE LA LISTE DES INFRACTIONS (GET /infractions)
     ------------------------------------------------------------------------ */
  else if (action === "getInfractions") {
    result = await callAntaiAPI({
      method: "GET",
      path: "/infractions",
      query: {
        sort: params.sort || "codeNatinf",
        desc: params.desc || false,
        page: params.page || 0,
      },
      xsrfToken,
      bearerToken,
    });
  }
  
  /* ------------------------------------------------------------------------
   1️⃣2️⃣ CREER UNE DESIGNATION (POST /designation)
   ------------------------------------------------------------------------ */
// Supporte "createDesignation" et "postCreerDesignationUnitaire"
else if (action === "createDesignation" || action === "postCreerDesignationUnitaire") {
  // On attend le body de la désignation dans params.designation ou dans params directement
  const payload = params.designation || params;

  // Validation basique (tolérante) des champs obligatoires
  function isValidDesignation(p) {
    if (!p) return { ok: false, reason: "payload manquant" };
    if (!p.identifiantDesignation && p.identifiantDesignation !== 0)
      return { ok: false, reason: "identifiantDesignation requis" };
    if (!p.statut) return { ok: false, reason: "statut requis (DESIGNATION|NON_DESIGNATION)" };
    if (!p.source) return { ok: false, reason: "source requise (ex: GDI-VIT)" };
    // statut doit être DESIGNATION ou NON_DESIGNATION (tolérant)
    const statut = String(p.statut).toUpperCase();
    if (!["DESIGNATION", "NON_DESIGNATION"].includes(statut))
      return { ok: false, reason: "statut doit être 'DESIGNATION' ou 'NON_DESIGNATION'" };
    return { ok: true, payload: { ...p, statut } };
  }

  const check = isValidDesignation(payload);
  if (!check.ok) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Payload invalide: ${check.reason}` }),
    };
  }

  // Appel ANTAI
  result = await callAntaiAPI({
    method: "POST",
    path: "/designation",
    body: check.payload,
    xsrfToken,
    bearerToken,
  });
}

      

    /* ------------------------------------------------------------------------
       ❌ ACTION INCONNUE
       ------------------------------------------------------------------------ */
    else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Action '${action}' non supportée` }),
      };
    }

    /* ------------------------------------------------------------------------
       ✅ RETOUR FINAL
       ------------------------------------------------------------------------ */
       console.log('le retour', JSON.stringify({result}));

       return {
        success: result.ok,
        data: result.data,
        action
      };

      
    // return {
    //   statusCode: result.status,
    //   body: JSON.stringify({
    //     action,
    //     success: result.ok,
    //     data: result.data,
    //   }),
    // };
  } catch (error) {
    console.error("❌ Erreur Lambda ANTAI:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
