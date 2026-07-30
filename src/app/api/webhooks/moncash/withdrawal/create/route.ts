import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  randomUUID,
} from "crypto";

import {
  adminAuth,
  adminDB,
} from "@/lib/firebaseAdmin";


export const runtime = "nodejs";

export const dynamic = "force-dynamic";



const MONCASH_SECRET =
  process.env.MONCASHCONNECT_SECRET_KEY || "";



const MIN_WITHDRAWAL =
  100;



/*
====================================================
TiTaTo - CREATE WITHDRAWAL

Flow:

User
 |
 ↓
Create withdrawal
 |
 ↓
Reserve balance
 |
 ↓
MonCashConnect payout-create
 |
 ↓
Webhook confirmation
 |
 ↓
completed / failed

====================================================
*/



export async function POST(
  request: NextRequest,
) {


  try {


    /*
    ================================================
    BODY
    ================================================
    */


    const body =
      await request.json();



    const {

      uid,

      amount,

      moncashNumber,

    } = body;



    if (
      !uid ||
      !amount ||
      !moncashNumber
    ) {

      return NextResponse.json(

        {
          success:false,

          error:
            "Informations manquantes",
        },

        {
          status:400,
        },

      );

    }




    const withdrawalAmount =
      Number(
        amount,
      );



    if (
      !Number.isInteger(
        withdrawalAmount,
      )
    ) {


      return NextResponse.json(

        {
          success:false,

          error:
            "Montant invalide",
        },

        {
          status:400,
        },

      );

    }




    /*
    ================================================
    MINIMUM
    ================================================
    */


    if (
      withdrawalAmount <
      MIN_WITHDRAWAL
    ) {


      return NextResponse.json(

        {
          success:false,

          error:
            "Le retrait minimum est de 100 HTG",
        },

        {
          status:422,
        },

      );

    }





    /*
    ================================================
    NUMERO MONCASH
    ================================================
    */


    const cleanNumber =
      String(
        moncashNumber,
      )
      .replace(
        /\D/g,
        "",
      );



    if (
      cleanNumber.length !== 8
    ) {


      return NextResponse.json(

        {
          success:false,

          error:
            "Numéro MonCash invalide",
        },

        {
          status:400,
        },

      );

    }



    const fullMoncashNumber =
      `509${cleanNumber}`;






    /*
    ================================================
    CREER REFERENCE UNIQUE
    ================================================
    */


    const referenceId =
      `wd_${uid}_${Date.now()}_${randomUUID().slice(0,8)}`;






    /*
    ================================================
    RESERVER LE SOLDE
    ================================================
    */


    const userRef =
      adminDB.ref(
        `users/${uid}`,
      );



    const reserveResult =
      await userRef.transaction(

        (user)=>{


          if(
            !user
          ){

            return;

          }



          const balance =
            Number(
              user.balance || 0,
            );



          const reserved =
            Number(
              user.reservedBalance || 0,
            );



          const available =
            balance - reserved;




          if(
            available <
            withdrawalAmount
          ){

            return;

          }




          return {

            ...user,


            reservedBalance:
              reserved +
              withdrawalAmount,


            updatedAt:
              Date.now(),

          };


        }

      );




    if(
      !reserveResult.committed
    ){


      return NextResponse.json(

        {
          success:false,

          error:
            "Solde insuffisant",
        },

        {
          status:400,
        },

      );

    }






    /*
    ================================================
    CREER TRANSACTION FIREBASE
    ================================================
    */


    await adminDB
      .ref(
        `transactions/${uid}/${referenceId}`,
      )
      .set({

        id:
          referenceId,


        uid,


        type:
          "withdrawal",


        amount:
          withdrawalAmount,


        moncashNumber:
          fullMoncashNumber,


        referenceId,


        status:
          "pending",


        fundsReserved:
          true,


        createdAt:
          Date.now(),


      });








    /*
    ================================================
    APPEL MONCASHCONNECT PAYOUT
    ================================================
    */


    const response =
      await fetch(

        "https://api.moncashconnect.com/v1/payout-create",

        {

          method:
            "POST",


          headers:

          {

            "Authorization":
              `Bearer ${MONCASH_SECRET}`,


            "Content-Type":
              "application/json",


            "Idempotency-Key":
              referenceId,

          },


          body:

            JSON.stringify({

              amount:
                withdrawalAmount,


              moncashNumber:
                fullMoncashNumber,


              referenceId,

            }),

        }

      );







    const payoutData =
      await response.json();







    /*
    ================================================
    ECHEC MONCASH
    ================================================
    */


    if(
      !response.ok
    ){



      await adminDB
        .ref(
          `transactions/${uid}/${referenceId}`,
        )
        .update({

          status:
            "failed",


          error:
            payoutData?.error ||
            "MonCash payout failed",


          updatedAt:
            Date.now(),

        });




      await userRef.transaction(

        (user)=>{


          if(
            !user
          ){

            return;

          }



          return {

            ...user,


            reservedBalance:
              Math.max(

                0,

                Number(
                  user.reservedBalance || 0
                )
                -
                withdrawalAmount

              ),


            updatedAt:
              Date.now(),

          };


        }

      );





      return NextResponse.json(

        {

          success:false,

          error:
            "Impossible de créer le retrait",

          details:
            payoutData,

        },

        {

          status:500,

        },

      );


    }








    /*
    ================================================
    SAUVEGARDE PAYOUT
    ================================================
    */


    const payout =
      payoutData.payout;



    await adminDB
      .ref(
        `transactions/${uid}/${referenceId}`,
      )
      .update({

        payoutId:
          payout?.reference || null,


        providerStatus:
          payout?.status || "queued",


        updatedAt:
          Date.now(),

      });








    return NextResponse.json(

      {

        success:true,


        withdrawal:

        {

          referenceId,


          payoutId:
            payout?.reference,


          status:
            "pending",

        },

      },

      {

        status:200,

      },

    );







  } catch(error){



    console.error(
      "WITHDRAW CREATE ERROR",
      error,
    );



    return NextResponse.json(

      {

        success:false,

        error:
          "Erreur serveur",

      },

      {

        status:500,

      },

    );

  }


}