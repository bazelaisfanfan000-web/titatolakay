import {
  NextResponse
} from "next/server";


import {
  adminDB
} from "@/lib/firebaseAdmin";


export const runtime = "nodejs";



export async function POST(
  request: Request
){

  try{


    const {
      uid,
      amount,
      phone
    } = await request.json();



    if(
      !uid ||
      !amount ||
      !phone
    ){

      return NextResponse.json(
        {
          error:"Données manquantes"
        },
        {
          status:400
        }
      );

    }



    const value =
      Number(amount);



    if(value < 50){

      return NextResponse.json(
        {
          error:"Minimum retrait 50 HTG"
        },
        {
          status:400
        }
      );

    }





    const balanceRef =
      adminDB.ref(
        `users/${uid}/balance`
      );



    const result =
      await balanceRef.transaction(
        (balance:any)=>{


          const current =
            Number(balance || 0);



          if(current < value){

            return;

          }



          return current - value;


        }
      );





    if(
      !result.committed
    ){

      return NextResponse.json(
        {
          error:"Solde insuffisant"
        },
        {
          status:400
        }
      );

    }





    const withdrawId =
      `WITHDRAW-${Date.now()}`;





    await adminDB
    .ref(
      `withdrawals/${uid}/${withdrawId}`
    )
    .set({

      id:
      withdrawId,

      amount:value,

      phone,

      status:
      "pending",

      createdAt:
      Date.now()

    });





    await adminDB
    .ref(
      `transactions/${uid}/${withdrawId}`
    )
    .set({

      type:
      "withdraw",

      amount:value,

      status:
      "pending",

      createdAt:
      Date.now()

    });







    return NextResponse.json({

      success:true,

      withdrawId,

      message:
      "Demande de retrait envoyée"

    });




  }
  catch(error:any){


    console.error(error);


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