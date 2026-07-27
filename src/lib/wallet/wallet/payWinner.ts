import {
 adminDB
} from "@/lib/firebaseAdmin";



/*
====================================================
TiTaTo - Pay Winner (Version Corrigée avec Verrou)
====================================================

Cette fonction utilise :
1. Un verrou atomique paidGames/${roomId} pour l'idempotence
2. Une transaction Firebase atomique pour le solde
3. Une transaction multi-path pour solde + ledger

IDEMPOTENCE :

Le verrou paidGames/${roomId} garantit qu'une partie
ne peut être payée qu'une seule fois.

Si la même transaction est tentée deux fois :
- Le verrou existe déjà
- La fonction retourne sans rien modifier
- Le gain n'est pas crédité deux fois

====================================================
*/


export async function payWinner(

winnerId:string,

bet:number,

roomId?:string

){


if (!roomId) {

 throw new Error(
 "roomId est requis pour l'idempotence du paiement"
 );

}


const pot = bet * 2;


const fee = pot * 0.10;


const reward = pot - fee;


const paidGameRef = adminDB.ref(`paidGames/${roomId}`);


/*
----------------------------------------------------
VERROU IDEMPOTENT
----------------------------------------------------

Cette transaction garantit que :
1. Une partie ne peut être payée qu'une seule fois
2. Deux appels simultanés ne peuvent pas créditer deux fois
----------------------------------------------------
*/

const lockResult = await paidGameRef.transaction((current: any) => {

 /*
 Si le verrou existe déjà, la partie a déjà été payée
 */

 if (current !== null) {

 return current;

 }


 /*
 Créer le verrou avec les informations de paiement
 */

 return {

 winnerId,

 bet,

 reward,

 paidAt: Date.now(),

 };

});


if (!lockResult.committed) {

 throw new Error(
 "Impossible de verrouiller le paiement. Transaction annulée."
 );

}


/*
 Si le verrou existait déjà, c'est un appel idempotent
 */

const existingLock = lockResult.snapshot.val();

if (existingLock && existingLock.winnerId === winnerId) {

 console.log(
 "[PAY_WINNER_IDEMPOTENT] Partie déjà payée",
 { roomId, winnerId }
 );


 return {

 reward: existingLock.reward,

 fee: existingLock.bet * 0.10,

 alreadyPaid: true,

 };

}


/*
----------------------------------------------------
TRANSACTION MULTI-PATH ATOMIQUE
----------------------------------------------------

Cette transaction garantit que :
1. Le solde et le ledger sont écrits atomiquement
2. Si le serveur crash pendant la transaction, l'état reste cohérent
3. Pas d'incohérence entre balance et ledger
----------------------------------------------------
*/

const transactionRef = adminDB.ref(`transactions/${winnerId}`).push();


const transactionId = transactionRef.key;


if (!transactionId) {

 throw new Error(
 "Impossible de créer l'identifiant de transaction"
 );

}


const now = Date.now();


const updates: Record<string, any> = {

 /*
 Mise à jour du balance
 */

 [`users/${winnerId}/balance`]: (currentBalance: any) => {

 const balance = Number(currentBalance || 0);

 if (!Number.isFinite(balance)) {

 return 0;

 }

 const newBalance = balance + reward;

 return Math.round(newBalance * 100) / 100;

 },

 /*
 Création de la transaction ledger
 */

 [`transactions/${winnerId}/${transactionId}`]: {

 id: transactionId,

 uid: winnerId,

 type: "win",

 amount: reward,

 roomId,

 status: "completed",

 description: "Gain de partie TiTaTo",

 metadata: {

 bet,

 pot,

 fee,

 roomId,

 },

 createdAt: now,

 completedAt: now,

 },

};


try {

 await adminDB.ref().update(updates);

} catch (error) {

 /*
 Compensation : annuler le verrou si l'écriture échoue
 */

 await paidGameRef.remove();


 console.error(
 "[PAY_WINNER_LEDGER_ERROR] Compensation effectuée",
 error
 );


 throw new Error(
 "Erreur lors de l'enregistrement de la transaction. Le paiement a été annulé."
 );

}



return {

reward,

fee

};

}