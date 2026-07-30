import {
  NextResponse,
} from "next/server";

import crypto from "crypto";

import {
  adminDB,
} from "@/lib/firebaseAdmin";


export const runtime = "nodejs";


const WEBHOOK_SECRET =
  process.env.MCC_WEBHOOK_SECRET || "";



/*
====================================================
TiTaTo - MONCASH WITHDRAW WEBHOOK

Confirmation retrait

MonCash
   |
   ↓
Webhook
   |
   ↓
Vérification signature
   |
   ↓
Recherche retrait pending
   |
   ↓
Débit wallet
   |
   ↓
Transaction completed

====================================================
*/



function verifySignature(
  rawBody:string,
  signature:string
) {


  if (
    !WEBHOOK_SECRET
  ) {

    return false;

  }


  const hash =
    crypto
      .createHmac(
        "sha256",
        WEBHOOK_SECRET
      )
      .update(
        rawBody
      )
      .digest(
        "hex"
      );


  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(signature)
  );


}





export async function POST(
  request:Request
) {


  try {


    const rawBody =
      await request.text();



    const signature =
      request.headers.get(
        "x-webhook-signature"
      );



    if (
      !signature ||
      !verifySignature(
        rawBody,
        signature
      )
    ) {


      return NextResponse.json(
        {
          success:false,
          error:
            "Signature invalide"
        },
        {
          status:401
        }
      );

    }



    const data =
      JSON.parse(
        rawBody
      );



    console.log(
      "MONCASH WITHDRAW WEBHOOK",
      data
    );



    /*
    ===============================================
    DONNEES MONCASH
    ===============================================
    */


    const withdrawalId =
      data.referenceId ||
      data.reference ||
      data.transactionId;


    const status =
      data.status;



    if (
      !withdrawalId
    ) {


      return NextResponse.json(
        {
          success:false,
          error:
            "Référence manquante"
        },
        {
          status:400
        }
      );

    }




    /*
    ===============================================
    CHERCHER TRANSACTION
    ===============================================
    */


    const transactions =
      await adminDB
        .ref(
          "transactions"
        )
        .once(
          "value"
        );



    let withdrawal:any =
      null;



    let uid =
      "";



    transactions.forEach(
      (user:any)=>{


        const item =
          user
            .child(
              withdrawalId
            )
            .val();



        if(
          item
        ){

          withdrawal =
            item;

          uid =
            item.uid;

        }


      }
    );




    if(
      !withdrawal
    ){


      return NextResponse.json(
        {
          success:false,
          error:
            "Retrait introuvable"
        },
        {
          status:404
        }
      );

    }




    /*
    ===============================================
    PROTECTION DOUBLE DEBIT
    ===============================================
    */


    if(
      withdrawal.status ===
      "completed"
    ){


      return NextResponse.json(
        {
          success:true,
          message:
            "Retrait déjà traité"
        }
      );

    }





    /*
    ===============================================
    ECHEC MONCASH
    ===============================================
    */


    if(
      status !== "completed" &&
      status !== "success"
    ){


      await adminDB
        .ref(
          `transactions/${uid}/${withdrawalId}`
        )
        .update(
          {

            status:
              "failed",

            updatedAt:
              Date.now()

          }
        );



      return NextResponse.json(
        {
          success:true
        }
      );

    }




    /*
    ===============================================
    DEBIT ATOMIQUE WALLET
    ===============================================
    */


    const walletRef =
      adminDB
        .ref(
          `users/${uid}`
        );



    const amount =
      Number(
        withdrawal.amount
      );



    const result =
      await walletRef.transaction(
        (wallet:any)=>{


          if(
            !wallet
          ){

            return;

          }



          const balance =
            Number(
              wallet.balance || 0
            );



          const reserved =
            Number(
              wallet.reservedBalance || 0
            );



          if(
            balance - reserved < amount
          ){

            return;

          }



          return {

            ...wallet,

            balance:
              balance - amount,

            updatedAt:
              Date.now()

          };


        }
      );



    if(
      !result.committed
    ){


      return NextResponse.json(
        {
          success:false,
          error:
            "Solde insuffisant"
        },
        {
          status:400
        }
      );

    }





    /*
    ===============================================
    MARQUER RETRAIT TERMINE
    ===============================================
    */


    await adminDB
      .ref(
        `transactions/${uid}/${withdrawalId}`
      )
      .update(
        {

          status:
            "completed",

          completedAt:
            Date.now()

        }
      );





    return NextResponse.json(
      {
        success:true,
        message:
          "Retrait confirmé"
      }
    );




  } catch(error){


    console.error(
      "WITHDRAW WEBHOOK ERROR:",
      error
    );



    return NextResponse.json(
      {
        success:false,
        error:
          "Erreur webhook retrait"
      },
      {
        status:500
      }
    );


  }


}