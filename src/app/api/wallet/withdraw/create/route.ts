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



    if(!uid || !amount || !phone){

      return NextResponse.json(
        {
          error:"Données manquantes"
        },
        {
          status:400
        }
      );

    }




    const withdrawAmount =
    Number(amount);



    if(withdrawAmount < 100){

      return NextResponse.json(
        {
          error:"Minimum retrait 100 HTG"
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



    let success = false;



    await balanceRef.transaction(
      (current)=>{


        const balance =
        Number(current || 0);



        if(balance < withdrawAmount){

          return;

        }



        success = true;


        return balance - withdrawAmount;


      }
    );





    if(!success){

      return NextResponse.json(
        {
          error:"Solde insuffisant"
        },
        {
          status:400
        }
      );

    }





    const withdrawRef =
    adminDB
    .ref(
      `withdrawals/${uid}`
    )
    .push();




    await withdrawRef.set({

      id:
      withdrawRef.key,


      uid,


      amount:
      withdrawAmount,


      phone,


      status:
      "pending",


      provider:
      "tranzak",


      createdAt:
      Date.now()


    });







    await adminDB
    .ref(
      `transactions/${uid}`
    )
    .push({

      type:
      "withdraw_request",


      amount:
      withdrawAmount,


      withdrawId:
      withdrawRef.key,


      status:
      "pending",


      createdAt:
      Date.now()


    });







    return NextResponse.json({

      success:true,


      message:
      "Demande de retrait créée",


      withdrawId:
      withdrawRef.key

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