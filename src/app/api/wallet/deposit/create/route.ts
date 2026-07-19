import { NextResponse } from "next/server";

import {
  adminAuth,
  adminDB
} from "@/lib/firebaseAdmin";

import {
  randomUUID
} from "crypto";



export async function POST(
  request: Request
) {

  try {


    const body =
    await request.json();



    const {
      token,
      amount,
      phone
    } = body;



    if(!token){

      return NextResponse.json(
        {
          success:false,
          message:"Utilisateur non connecté"
        },
        {
          status:401
        }
      );

    }



    // Vérifier utilisateur Firebase

    const decoded =
    await adminAuth.verifyIdToken(token);


    const uid =
    decoded.uid;



    if(!amount || amount <= 0){

      return NextResponse.json(
        {
          success:false,
          message:"Montant invalide"
        },
        {
          status:400
        }
      );

    }



    const reference =
    "TITATO_" + randomUUID();



    const apiKey =
    process.env.TRANZAK_API_KEY;



    if(!apiKey){

      return NextResponse.json(
        {
          success:false,
          message:"Clé Tranzak manquante"
        },
        {
          status:500
        }
      );

    }



    // Création paiement Tranzak

    const response =
    await fetch(
      "https://tranzak.com/api/gateway/v1/payments",
      {

        method:"POST",

        headers:{

          "Content-Type":
          "application/json",

          "X-API-Key":
          apiKey

        },


        body:JSON.stringify({

          amount:Number(amount),

          currency:"HTG",

          payment_method:"moncash",

          customer_phone:
          phone || "",


          description:
          "Recharge Wallet TiTaTo",


          reference,


          metadata:{

            uid,

            type:"deposit"

          }

        })

      }
    );



    const data =
    await response.json();



    if(!response.ok){

      console.log(
        "Tranzak error",
        data
      );


      return NextResponse.json(
        {
          success:false,
          message:
          data.message ||
          "Erreur création paiement"
        },
        {
          status:500
        }
      );

    }



    // Sauvegarde transaction Firebase

    await adminDB
    .ref(
      `transactions/${reference}`
    )
    .set({

      uid,

      amount:Number(amount),

      provider:"tranzak",

      status:"processing",

      transaction_id:
      data.transaction_id,


      createdAt:
      Date.now()

    });



    return NextResponse.json({

      success:true,

      payment_url:
      data.payment_url,


      transaction_id:
      data.transaction_id

    });



  } catch(error:any){


    console.error(
      "Deposit error",
      error
    );


    return NextResponse.json(
      {

        success:false,

        message:
        error.message ||
        "Erreur serveur"

      },
      {
        status:500
      }
    );


  }

}