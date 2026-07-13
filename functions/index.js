const { onCall, HttpsError } = require("firebase-functions/v2/https");

const { initializeApp } = require("firebase-admin/app");

const { getDatabase } = require("firebase-admin/database");


initializeApp();



exports.finishTitatoGame = onCall(async (request)=>{


const {
gameId,
winnerId
} = request.data;



if(!gameId || !winnerId){

throw new HttpsError(
"invalid-argument",
"Données manquantes"
);

}



const db = getDatabase();



const gameRef = db.ref(
`games/${gameId}`
);



const gameSnap = await gameRef.get();



if(!gameSnap.exists()){


throw new HttpsError(
"not-found",
"Partie introuvable"
);


}



const game = gameSnap.val();



if(game.status === "finished"){


throw new HttpsError(
"already-exists",
"Gain déjà distribué"
);


}




const players = game.playersCount || 2;



const pot =
game.bet * players;



const commission =
pot * 0.10;



const gain =
pot - commission;




const userRef =
db.ref(
`users/${winnerId}`
);



const userSnap =
await userRef.get();



if(!userSnap.exists()){


throw new HttpsError(
"not-found",
"Utilisateur introuvable"
);


}



const user =
userSnap.val();



await userRef.update({

balance:
(user.balance || 0) + gain

});




// fermer la partie

await gameRef.update({

status:"finished",

winner:winnerId

});




// historique

await db.ref("transactions").push({

userId:winnerId,

type:"GAME_WIN",

amount:gain,

fee:commission,

gameId,

createdAt:Date.now()

});



return {

success:true,

gain,

commission

};


});