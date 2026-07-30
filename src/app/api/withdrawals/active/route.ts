import {
  NextRequest,
  NextResponse,
} from "next/server";


import {
  adminAuth,
  adminDB,
} from "@/lib/firebaseAdmin";



export const runtime = "nodejs";



export async function GET(
  request: NextRequest
) {

  try {


    /*
    ==============================
    AUTH FIREBASE
    ==============================
    */


    const authorization =
      request.headers.get(
        "authorization"
      );


    if(
      !authorization?.startsWith(
        "Bearer "
      )
    ){

      return NextResponse.json(
        {
          success:false,
          error:
          "Authentification requise."
        },
        {
          status:401
        }
      );

    }



    const token =
      authorization.substring(7);



    const decoded =
      await adminAuth.verifyIdToken(
        token
      );


    const uid =
      decoded.uid;



    /*
    ==============================
    CHERCHER RETRAITS ACTIFS
    ==============================
    */


    const snapshot =
      await adminDB
        .ref(
          "withdrawals"
        )
        .orderByChild(
          "uid"
        )
        .equalTo(
          uid
        )
        .get();



    if(
      !snapshot.exists()
    ){

      return NextResponse.json(
        {
          success:true,
          hasActive:false,
          withdrawals:[]
        }
      );

    }



    const data =
      snapshot.val();



    const withdrawals =
      Object.values(data);



    /*
    ==============================
    STATUTS BLOQUANTS
    ==============================
    */


    const activeWithdrawals =
      withdrawals.filter(
        (withdrawal:any)=>

          [
            "pending",
            "processing",
            "refund_pending"
          ].includes(
            withdrawal.status
          )

      );



    return NextResponse.json(
      {

        success:true,

        hasActive:
          activeWithdrawals.length > 0,

        withdrawals:
          activeWithdrawals

      }
    );



  }
  catch(error){


    console.error(
      "ACTIVE WITHDRAWAL ERROR:",
      error
    );



    return NextResponse.json(
      {

        success:false,

        error:
        "Impossible de vérifier les retraits actifs."

      },
      {
        status:500
      }
    );

  }

}