import {
  NextResponse
} from "next/server";


import {
  adminDB
} from "@/lib/firebaseAdmin";


export const runtime = "nodejs";



export async function POST(
  request: Request
) {


  try {


    const {
      uid,
      amount
    } = await request.json();



    if(
      !uid ||
      !amount
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



    if(
      value < 10
    ){

      return NextResponse.json(
        {
          error:"Minimum 10 HTG"
        },
        {
          status:400
        }
      );

    }





    const reference =
      `DEPOT-${uid}-${Date.now()}`;





    const response =
      await fetch(
        `${process.env.TCHOTCHOM_BASE_URL}/payments`,
        {

          method:"POST",

          headers:{


            "Content-Type":
            "application/json",


            "Authorization":
            "Basic " +
            Buffer
            .from(
              `${process.env.TCHOTCHOM_API_KEY}:${process.env.TCHOTCHOM_SECRET_KEY}`
            )
            .toString("base64")

          },


          body:JSON.stringify({

            amount:value,

            currency:"HTG",

            description:
            "Recharge Wallet TiTaTo",


            reference,


            metadata:{

              uid

            },


            callback_url:
            `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/tchotchom`

          })

        }

      );





    const data =
      await response.json();





    if(
      !response.ok
    ){

      console.error(
        "Tchotchom error",
        data
      );


      return NextResponse.json(
        {
          error:
          "Erreur création paiement",
          details:data
        },
        {
          status:500
        }
      );

    }





    // Sauvegarde transaction en attente

    await adminDB
    .ref(
      `transactions/${uid}/${reference}`
    )
    .set({

      type:
      "deposit",

      status:
      "pending",

      amount:value,

      method:
      "tchotchom",

      reference,

      createdAt:
      Date.now()

    });





    return NextResponse.json({

      success:true,

      payment:data,

      reference

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