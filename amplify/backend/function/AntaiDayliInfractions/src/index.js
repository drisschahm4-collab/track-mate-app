/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	API_FLEETWATCHERFRONT_GRAPHQLAPIIDOUTPUT
	API_FLEETWATCHERFRONT_GRAPHQLAPIENDPOINTOUTPUT
	API_FLEETWATCHERFRONT_GRAPHQLAPIKEYOUTPUT
	ANTAI_USERNAME
	ANTAI_PASSWORD
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

import fetch from "node-fetch";

const BASE_URL = "https://sandbox.entreprises.antai.gouv.fr";

/* ============================================================================
   1️⃣ AUTHENTIFICATION ANTAI (exacte version que ta Lambda actuelle)
   ============================================================================ */
async function authenticate() {
  const initResponse = await fetch(`${BASE_URL}/api/init`, { method: "GET" });
  const setCookieHeader = initResponse.headers.get("set-cookie");
  if (!setCookieHeader) throw new Error("Cookie XSRF-TOKEN introuvable");

  const xsrfToken = setCookieHeader.match(/XSRF-TOKEN=([^;]+)/)?.[1];
  if (!xsrfToken) throw new Error("Impossible d'extraire le XSRF-TOKEN");

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

  const bearer = loginResponse.headers.get("authorization");
  if (!bearer?.startsWith("Bearer "))
    throw new Error("Bearer token non trouvé");

  const bearerToken = bearer.replace("Bearer ", "");

  return { xsrfToken, bearerToken };
}

/* ============================================================================
   2️⃣ APPEL API GENERIQUE (réutilisé tel quel)
   ============================================================================ */
async function callAntaiAPI({ method, path, query, xsrfToken, bearerToken }) {
  let url = `${BASE_URL}/flotteconventionnee${path}`;

  if (query) {
    const qs = new URLSearchParams(query).toString();
    url += `?${qs}`;
  }

  const headers = {
    Authorization: `Bearer ${bearerToken}`,
    "Content-Type": "application/json",
    "X-Xsrf-Token": xsrfToken,
    Cookie: `XSRF-TOKEN=${xsrfToken}`,
  };

  const res = await fetch(url, { method, headers });
  const data = await res.json().catch(() => ({}));

  return { ok: res.ok, status: res.status, data };
}

/* ============================================================================
   3️⃣ RÉCUPÉRATION DE TOUTES LES INFRACTIONS (pagination auto)
   ============================================================================ */
async function fetchAllInfractions(xsrfToken, bearerToken) {
  const all = [];
  let page = 0;

  while (true) {
    const result = await callAntaiAPI({
      method: "GET",
      path: "/infractions",
      query: {
        sort: "codeNatinf",
        desc: false,
        page,
      },
      xsrfToken,
      bearerToken,
    });

    if (!result.ok) {
      console.error("Erreur page", page, result);
      break;
    }

    const items = result.data?.content || [];

    console.log(`📄 Page ${page} → ${items.length} infractions`);

    all.push(...items);

    // 🔚 Si ANTAI renvoie moins de 10/20 résultats → fin
    if (items.length === 0) break;

    page++;
  }

  return all;
}

/* ============================================================================
   4️⃣ HANDLER LAMBDA (appelé par EventBridge)
   ============================================================================ */
export const handler = async () => {
  try {
    console.log("🚀 Lancement récupération quotidienne infractions ANTAI…");

    const { xsrfToken, bearerToken } = await authenticate();

    const infractions = await fetchAllInfractions(xsrfToken, bearerToken);

    console.log(`✅ TOTAL récupéré : ${infractions.length} infractions`);

    return {
      success: true,
      count: infractions.length,
      data: infractions,
    };
  } catch (e) {
    console.error("❌ ERREUR getAllInfractions:", e);
    return {
      success: false,
      error: e.message,
    };
  }
};
