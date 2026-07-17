import {
  NextResponse
} from "next/server";


export const runtime = "nodejs";

export const dynamic = "force-dynamic";


import {
  adminAuth,
  adminDB
} from "@/lib/firebaseAdmin";


import {
  addBalance
} from "@/lib/firebaseEconomyAdmin";



const REWARD_AMOUNT = 5;

const DAILY_LIMIT = 3;



export async function POST(
  request: Request
) {

  try {


    console.log("[AD REWARD] START");



    const body =
      await request.json();


    const token =
      body?.token;



    if(!token){

      return NextResponse.json(
        {
          success:false,
          error:"Token manquant"
        },
        {
          status:400
        }
      );

    }



    const decoded =
      await adminAuth.verifyIdToken(
        token
      );



    const uid =
      decoded.uid;



    console.log(
      "[AD REWARD] USER",
      uid
    );



    const today =
      new Date()
      .toISOString()
      .split("T")[0];



    const rewardRef =
      adminDB.ref(
        `adRewards/${uid}/${today}`
      );



    const rewardSnap =
      await rewardRef.get();



    const count =
      rewardSnap.exists()
      ?
      Number(rewardSnap.val())
      :
      0;



    if(count >= DAILY_LIMIT){

      return NextResponse.json(
        {
          success:false,
          error:"Limite pub atteinte"
        },
        {
          status:429
        }
      );

    }



    const result =
      await addBalance(
        uid,
        REWARD_AMOUNT,
        "ad_reward"
      );



    await rewardRef.set(
      count + 1
    );



    return NextResponse.json(
      {
        success:true,
        message:"+5 HTG ajouté",
        reward:REWARD_AMOUNT,
        balance:result.newBalance,
        ads:count + 1
      }
    );


  } catch(error:any){


    console.error(
      "[AD REWARD ERROR]",
      error
    );


    return NextResponse.json(
      {
        success:false,
        error:
          error?.message ||
          "Erreur serveur"
      },
      {
        status:500
      }
    );


  }

}