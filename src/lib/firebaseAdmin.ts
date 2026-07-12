import { NextResponse } from "next/server";

import {
  adminDB,
  adminAuth
} from "@/lib/firebaseAdmin";



export async function POST(
  request: Request
){

  try{


    const body =
    await request.json();


    const {
      gameId,
      dominoId
    } = body;



    if(
      !gameId ||
      !dominoId
    ){

      return NextResponse.json(
        {
          error:"Informations manquantes"
        },
        {
          status:400
        }
      );

    }



    // Récupérer le token utilisateur

    const authHeader =
    request.headers.get(
      "authorization"
    );



    if(!authHeader){

      return NextResponse.json(
        {
          error:"Non authentifié"
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
    await adminAuth()
      .verifyIdToken(token);



    const uid =
    decoded.uid;



    // Lire la partie

    const db =
    adminDB();



    const gameRef =
    db.ref(
      `games/${gameId}`
    );


    const snapshot =
    await gameRef.once(
      "value"
    );



    if(!snapshot.exists()){

      return NextResponse.json(
        {
          error:"Partie inexistante"
        },
        {
          status:404
        }
      );

    }



    const game =
    snapshot.val();



    // Vérifier joueur dans partie

    if(
      !game.players ||
      !game.players[uid]
    ){

      return NextResponse.json(
        {
          error:"Vous ne participez pas à cette partie"
        },
        {
          status:403
        }
      );

    }



    // Vérifier le tour

    if(
      game.turn !== uid
    ){

      return NextResponse.json(
        {
          error:"Ce n'est pas votre tour"
        },
        {
          status:403
        }
      );

    }




    // POUR L'INSTANT ON ARRÊTE ICI
    // La validation domino viendra après



    return NextResponse.json({

      success:true,

      message:
      "Coup reçu par le serveur",

      player:
      uid,

      domino:
      dominoId

    });



  }
  catch(error:any){


    console.error(
      error
    );


    return NextResponse.json(
      {
        error:
        "Erreur serveur"
      },
      {
        status:500
      }
    );


  }


}