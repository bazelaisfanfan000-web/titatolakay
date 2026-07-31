import {
  NextResponse,
} from "next/server";


import {
  adminAuth,
  adminDB,
} from "@/lib/firebaseAdmin";



export const runtime =
  "nodejs";



export const dynamic =
  "force-dynamic";



/*
====================================================
CREATE USER WALLET
Création uniquement côté serveur
====================================================
*/


export async function POST(
  request: Request
) {


  try {


    /*
    ==================================
    VERIFICATION TOKEN FIREBASE
    ==================================
    */


    const authHeader =
      request.headers.get(
        "authorization"
      );


    if(
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ){

      return NextResponse.json(
        {
          error:
            "Token manquant"
        },
        {
          status:401
        }
      );

    }



    const token =
      authHeader.replace(
        "Bearer ",
        ""
      );



    const decoded =
      await adminAuth.verifyIdToken(
        token
      );



    const uid =
      decoded.uid;



    /*
    ==================================
    VERIFIER SI WALLET EXISTE
    ==================================
    */


    const walletRef =
      adminDB.ref(
        `users/${uid}`
      );


    const snapshot =
      await walletRef.get();



    if(
      snapshot.exists()
    ){

      const data =
        snapshot.val();



      /*
      Wallet déjà créé
      */

      if(
        data.balance !== undefined
      ){

        return NextResponse.json(
          {
            success:true,
            message:
              "Wallet déjà existant"
          }
        );

      }

    }




    /*
    ==================================
    CREATION WALLET SECURISE
    ==================================
    */


    const now =
      Date.now();



    const updates:any = {


      [`users/${uid}/balance`]:
        0,


      [`users/${uid}/reservedBalance`]:
        0,


      [`users/${uid}/balanceUpdatedAt`]:
        now,

    };



    await adminDB
      .ref()
      .update(
        updates
      );





    /*
    ==================================
    REPONSE
    ==================================
    */


    return NextResponse.json(

      {

        success:true,

        message:
          "Wallet créé avec succès",

        uid,

      }

    );



  }


  catch(error:any){


    console.error(
      "[CREATE WALLET ERROR]",
      error
    );



    return NextResponse.json(

      {

        error:
          "Impossible de créer le wallet"

      },

      {

        status:500

      }

    );


  }


}