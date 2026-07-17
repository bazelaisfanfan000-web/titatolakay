import {
  ref,
  get,
  update
} from "firebase/database";

import {
  database
} from "@/lib/firebase";



export async function playGameMove(

  gameId:string,

  row:number,

  col:number,

  symbol:"X"|"O"

){


  const gameRef =
    ref(
      database,
      `rooms/${gameId}/game`
    );


  const snap =
    await get(gameRef);


  if(!snap.exists()){

    throw new Error(
      "Partie introuvable"
    );

  }


  const game =
    snap.val();



  const board:string[][] =
    game.board ||
    Array.from(
      {
        length:10
      },
      ()=>Array(10).fill("")
    );



  if(board[row][col]){

    throw new Error(
      "Case déjà utilisée"
    );

  }



  if(game.turn !== symbol){

    throw new Error(
      "Ce n'est pas ton tour"
    );

  }



  board[row][col]=symbol;



  const winner =
    checkWinner(
      board,
      row,
      col,
      symbol
    );



  const draw =
    !winner &&
    board.every(
      r=>r.every(
        cell=>cell!==""
      )
    );



  const nextTurn =
    symbol==="X"
    ?
    "O"
    :
    "X";



  await update(

    gameRef,

    {

      board,


      turn:
      winner || draw
      ?
      symbol
      :
      nextTurn,


      winner:
      winner ||
      (draw ? "draw" : null),


      status:
      winner || draw
      ?
      "finished"
      :
      "playing",


      turnStartedAt:
      Date.now()

    }

  );



  return {

    success:true,

    winner

  };


}







// ================================
// PAIEMENT DU GAGNANT
// ================================


export async function finishGamePayment(

  gameId:string,

  winnerUid:string

){


  const gameRef =
    ref(
      database,
      `rooms/${gameId}`
    );



  const gameSnap =
    await get(gameRef);



  if(!gameSnap.exists()){

    throw new Error(
      "Partie introuvable"
    );

  }



  const game =
    gameSnap.val();



  // Protection double paiement (leave check to server-side API)
  // This client helper should call the server API instead of writing to RTDB directly.
  const res = await fetch("/api/game/finish-payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ gameId })
  });

  const json = await res.json();

  return json;





}







// ================================
// VERIFICATION ALIGNEMENT 4
// ================================


function checkWinner(

  board:string[][],

  row:number,

  col:number,

  symbol:string

){


  const directions=[

    [1,0],

    [0,1],

    [1,1],

    [1,-1]

  ];



  for(
    const [dr,dc]
    of directions
  ){


    let count=1;



    count += countDirection(

      board,

      row,

      col,

      dr,

      dc,

      symbol

    );



    count += countDirection(

      board,

      row,

      col,

      -dr,

      -dc,

      symbol

    );



    if(count>=4){

      return symbol;

    }


  }



  return null;


}







function countDirection(

  board:string[][],

  row:number,

  col:number,

  dr:number,

  dc:number,

  symbol:string

){


  let count=0;


  let r=row+dr;

  let c=col+dc;



  while(

    r>=0 &&

    r<board.length &&

    c>=0 &&

    c<board[0].length &&

    board[r][c]===symbol

  ){


    count++;


    r+=dr;

    c+=dc;


  }



  return count;


}