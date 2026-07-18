import { NextResponse } from "next/server";

import {
  adminDB
} from "@/lib/firebaseAdmin";


export const runtime = "nodejs";


export async function POST(
  request: Request
) {

  try {

    const body = await request.json();


    const secret =
      request.headers.get(
        "x-webhook-secret"
      );


    if (
      secret !== process.env.TCHOTCHOM_WEBHOOK_SECRET
    ) {

      return NextResponse.json(
        {
          error: "Webhook non autorisé"
        },
        {
          status: 401
        }
      );

    }



    console.log(
      "Tchotchom webhook:",
      body
    );



    const event =
      body.event ||
      body.type;



    if (
      event === "payment.failed"
    ) {


      return NextResponse.json({
        success:true,
        message:"Paiement échoué enregistré"
      });


    }





    if (
      event !== "payment.completed"
    ) {


      return NextResponse.json({
        success:true,
        message:"Event ignoré"
      });


    }





    const payment =
      body.data ||
      body.payment ||
      body;



    const transactionId =
      payment.reference ||
      payment.id;



    const uid =
      payment.metadata?.uid ||
      payment.uid;



    const amount =
      Number(
        payment.amount || 0
      );





    if(
      !uid ||
      !amount ||
      !transactionId
    ){

      return NextResponse.json(
        {
          error:"Données paiement invalides"
        },
        {
          status:400
        }
      );

    }





    // Empêche un double crédit

    const already =
      await adminDB
      .ref(
        `transactions/${uid}/${transactionId}`
      )
      .get();



    if(
      already.exists()
    ){

      return NextResponse.json({
        success:true,
        message:"Déjà traité"
      });

    }





    // Crédit wallet

    await adminDB
    .ref(
      `users/${uid}/balance`
    )
    .transaction(
      (balance:any)=>{

        return Number(balance || 0)
        +
        amount;

      }
    );






    // Historique

    await adminDB
    .ref(
      `transactions/${uid}/${transactionId}`
    )
    .set({

      type:
      "deposit",

      method:
      "tchotchom",

      amount,

      createdAt:
      Date.now(),

      paymentId:
      transactionId

    });







    return NextResponse.json({

      success:true,

      message:
      "Wallet crédité"

    });




  }
  catch(error:any){


    console.error(
      "Tchotchom webhook error",
      error
    );


    return NextResponse.json(
      {
        error:error.message
      },
      {
        status:500
      }
    );


  }

}