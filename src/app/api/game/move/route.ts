import {
  NextResponse
} from "next/server";


import {
  adminDB,
  adminAuth
} from "@/lib/firebaseAdmin";






export async function POST(
request:Request
){


try{


const body =
await request.json();



const {
roomId,
move
}=body;





if(
!roomId ||
!move
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








const authHeader =
request.headers.get(
"authorization"
);





if(!authHeader){


return NextResponse.json(

{
error:"Non connecté"
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









const roomRef =
adminDB.ref(
`rooms/${roomId}`
);



const snapshot =
await roomRef.get();





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






const room =
snapshot.val();







if(
room.status !== "playing"
){


return NextResponse.json(

{
error:"La partie n'est pas active"
},

{
status:400
}

);


}








const player =
room.players?.[uid];





if(!player){


return NextResponse.json(

{
error:"Vous ne participez pas à cette partie"
},

{
status:403
}

);


}








const game =
room.game;





if(!game){


return NextResponse.json(

{
error:"Jeu introuvable"
},

{
status:400
}

);


}








// vérifier le tour


if(
game.turn !== player.symbol
){


return NextResponse.json(

{
error:"Ce n'est pas votre tour"
},

{
status:400
}

);


}









// validation Ti Ta To 10x10


const row =
Number(move.row);


const col =
Number(move.col);





if(

isNaN(row) ||

isNaN(col)

){


return NextResponse.json(

{
error:"Coup invalide"
},

{
status:400
}

);


}






if(

row < 0 ||

row >= 10 ||

col < 0 ||

col >= 10

){


return NextResponse.json(

{
error:"Position invalide"
},

{
status:400
}

);


}








if(
game.board[row][col] !== ""
){


return NextResponse.json(

{
error:"Case déjà utilisée"
},

{
status:400
}

);


}








const newBoard =
game.board.map(
(row:any)=>[...row]
);




newBoard[row][col] =
player.symbol;









let nextTurn =

player.symbol === "X"

?

"O"

:

"X";









await roomRef
.child(
"game"
)
.update({


board:newBoard,


turn:nextTurn,


turnStartedAt:
Date.now()


});









return NextResponse.json({

success:true,


board:newBoard,


turn:nextTurn


});



}
catch(error:any){


console.error(
"MOVE ERROR",
error
);



return NextResponse.json(

{
error:
error.message ||
"Erreur serveur"
},

{
status:500
}

);


}


}