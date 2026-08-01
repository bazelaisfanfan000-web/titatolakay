/**
 * MonCashConnect API Client
 * Intégration sécurisée paiements + payouts
 */

import crypto from "crypto";

import type {
  MonCashPaymentRequest,
  MonCashPaymentResponse,
  MonCashPaymentStatus,
  MonCashPayoutRequest,
  MonCashPayoutResponse,
  MonCashBalance,
  MonCashWebhookEvent
} from "@/types/wallet";


const BASE_URL =
  process.env.MONCASH_API_URL ||
  "https://api.moncashconnect.com/v1";


const API_KEY =
  process.env.MONCASHCONNECT_SECRET_KEY ||
  process.env.MONCASH_API_KEY ||
  "";


const WEBHOOK_SECRET =
  process.env.MONCASH_WEBHOOK_SECRET ||
  "";



/**
 * Vérification configuration MonCash
 */
export function validateMonCashConfig() {

  if (!API_KEY) {

    return {
      valid:false,
      error:
      "Clé API MonCash manquante"
    };

  }


  if (!API_KEY.startsWith("sk_proj_")) {

    return {
      valid:false,
      error:
      "Clé API invalide. Elle doit commencer par sk_proj_"
    };

  }


  return {
    valid:true
  };

}




/**
 * Génère une référence unique
 */
export function generateReferenceId(
  prefix:string="txn"
) {

  return (
    `${prefix}_${Date.now()}_` +
    crypto
    .randomBytes(8)
    .toString("hex")
  );

}





/**
 * Génère clé idempotence
 */
export function generateIdempotencyKey(){

  return (
    "idemp_" +
    Date.now() +
    "_" +
    crypto
    .randomBytes(16)
    .toString("hex")
  );

}




/**
 * Création paiement entrant
 */
export async function createMonCashPayment(
  request:MonCashPaymentRequest,
  idempotencyKey?:string
):Promise<MonCashPaymentResponse>{


  const config =
    validateMonCashConfig();


  if(!config.valid){

    throw new Error(
      config.error
    );

  }



  const key =
    idempotencyKey ||
    generateIdempotencyKey();



  console.log(
    "[MONCASH PAYMENT SEND]",
    {
      amount:request.amount,
      referenceId:request.referenceId
    }
  );



  const response =
    await fetch(
      `${BASE_URL}/pay-create`,
      {

        method:"POST",

        headers:{

          Authorization:
          `Bearer ${API_KEY}`,

          "Content-Type":
          "application/json",

          "Idempotency-Key":
          key

        },


        body:
        JSON.stringify(request)

      }
    );



  const data =
    await response.json();



  console.log(
    "[MONCASH PAYMENT RESPONSE]",
    {
      status:response.status,
      data
    }
  );



  if(!response.ok){

    throw new Error(
      `MonCash Error ${response.status}: ${
        JSON.stringify(data)
      }`
    );

  }



  return data;

}





/**
 * Vérifier statut paiement
 */
export async function getPaymentStatus(
  referenceId:string
):Promise<MonCashPaymentStatus>{


  const config =
    validateMonCashConfig();



  if(!config.valid){

    throw new Error(
      config.error
    );

  }



  const response =
    await fetch(
      `${BASE_URL}/pay-status?referenceId=${referenceId}`,
      {

        headers:{

          Authorization:
          `Bearer ${API_KEY}`

        }

      }
    );



  const data =
    await response.json();



  if(!response.ok){

    throw new Error(
      `MonCash Error ${response.status}: ${
        JSON.stringify(data)
      }`
    );

  }



  return data;

}
/**
 * Création payout (retrait vers utilisateur MonCash)
 */
export async function createMonCashPayout(
  request: MonCashPayoutRequest,
  idempotencyKey?: string
): Promise<MonCashPayoutResponse> {


  const config =
    validateMonCashConfig();


  if (!config.valid) {

    throw new Error(
      config.error
    );

  }



  // Validation montant

  if (
    !Number.isInteger(request.amount) ||
    request.amount < 1 ||
    request.amount > 100000
  ) {

    throw new Error(
      "Montant payout invalide"
    );

  }




  // Nettoyage numéro MonCash

  const moncashNumber =
    String(request.moncashNumber)
      .replace(/\D/g, "");



  if (!/^509\d{8}$/.test(moncashNumber)) {

    throw new Error(
      "Numéro MonCash invalide. Format attendu: 509XXXXXXXX"
    );

  }




  const key =
    idempotencyKey ||
    generateIdempotencyKey();




  const payload = {

    amount:
      request.amount,

    moncashNumber,

    referenceId:
      request.referenceId

  };




  console.log(
    "[MONCASH PAYOUT REQUEST]",
    {
      url:
      `${BASE_URL}/payout-create`,

      payload,

      idempotencyKey:key
    }
  );




  const response =
    await fetch(
      `${BASE_URL}/payout-create`,
      {

        method:"POST",

        headers:{

          Authorization:
          `Bearer ${API_KEY}`,

          "Content-Type":
          "application/json",

          "Idempotency-Key":
          key

        },


        body:
        JSON.stringify(payload)

      }
    );





  let data:any;



  try {

    data =
      await response.json();

  }

  catch {

    throw new Error(
      "Réponse MonCash invalide"
    );

  }





  console.log(
    "[MONCASH PAYOUT RESPONSE]",
    {
      status:
      response.status,

      data
    }
  );





  if(!response.ok){

    throw new MonCashError(
      data?.error ||
      "Erreur payout MonCash",

      response.status,

      data?.code
    );

  }




  if(!data?.payout?.reference){

    throw new Error(
      "Réponse payout incomplète"
    );

  }




  return data;

}






/**
 * Solde marchand MonCashConnect
 */
export async function getMerchantBalance()
:Promise<MonCashBalance>{



  const config =
    validateMonCashConfig();



  if(!config.valid){

    throw new Error(
      config.error
    );

  }




  const response =
    await fetch(
      `${BASE_URL}/pay-balance`,
      {

        headers:{

          Authorization:
          `Bearer ${API_KEY}`

        }

      }
    );




  const data =
    await response.json();




  if(!response.ok){

    throw new Error(
      `MonCash Error ${response.status}`
    );

  }




  return data;

}







/**
 * Vérification signature webhook HMAC SHA256
 */
export function verifyWebhookSignature(
  payload:string,
  signature:string,
  timestamp:string
):boolean{



  if(!WEBHOOK_SECRET){

    console.error(
      "[MONCASH] Webhook secret absent"
    );

    return false;

  }




  const now =
    Math.floor(
      Date.now()/1000
    );



  const webhookTime =
    Number(timestamp);



  if(
    Math.abs(
      now - webhookTime
    ) > 300
  ){

    console.error(
      "[MONCASH] Timestamp expiré"
    );

    return false;

  }




  const hmac =
    crypto
    .createHmac(
      "sha256",
      WEBHOOK_SECRET
    )
    .update(payload)
    .digest("hex");




  const expected =
    `sha256=${hmac}`;




  try {


    return crypto
      .timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signature)
      );


  }

  catch {

    return false;

  }

}







/**
 * Parse webhook MonCash
 */
export function parseWebhook(
  body:string,
  signature:string,
  timestamp:string
):MonCashWebhookEvent|null{


  const valid =
    verifyWebhookSignature(
      body,
      signature,
      timestamp
    );



  if(!valid){

    return null;

  }




  try {


    return JSON.parse(body);


  }

  catch {


    return null;

  }

}







/**
 * Erreur MonCash personnalisée
 */
export class MonCashError extends Error {


  constructor(

    message:string,

    public statusCode:number=500,

    public code?:string

  ){

    super(message);

    this.name =
      "MonCashError";

  }

}