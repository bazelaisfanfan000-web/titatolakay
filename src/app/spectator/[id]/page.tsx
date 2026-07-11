"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  ref,
  onValue,
  push,
  set,
  serverTimestamp
} from "firebase/database";

import {
  database,
  auth
} from "@/lib/firebase";


export default function SpectatorRoom(){

const params = useParams();
const router = useRouter();
const id = params.id as string;


const [game,setGame] = useState<any>(null);
const [messages,setMessages] = useState<any[]>([]);
const [loading,setLoading] = useState(true);
const [error,setError] = useState<string | null>(null);


const reactions = [
"👏 Bravo",
"🔥 Bien joué",
"😂 MDR",
"😱 Incroyable",
"😎 Pro",
"🎉 GG",
"💪 Courage",
"🤔 Hmm",
"😭 Dommage"
];



useEffect(()=>{

console.log("ID PARTIE SPECTATEUR :", id);


if(!id){
setLoading(false);
setError("ID de partie manquant");
return;
}


const gameRef = ref(
database,
`rooms/${id}`
);


const unsubscribeGame = onValue(
gameRef,
(snapshot)=>{

console.log("DATA FIREBASE PARTIE :", snapshot.val());



const data = snapshot.val();



if(!data){
setGame(null);
setLoading(false);
return;
}



setGame(data);
setLoading(false);
setError(null);


},
(error)=>{

console.error("ERREUR FIREBASE :", error);
setError("Erreur de chargement de la partie");
setLoading(false);


}
);




const chatRef = ref(
database,
`rooms/${id}/spectatorMessages`
);




const unsubscribeChat = onValue(
chatRef,
(snapshot)=>{

const data = snapshot.val();



if(!data){
setMessages([]);
return;
}



setMessages(
Object.values(data)
);



}
);




// sécurité anti chargement infini
const timer = setTimeout(()=>{

if(loading){
console.warn("Timeout de chargement");
setLoading(false);
setError("Temps de chargement dépassé");
}


},10000);




return()=>{

unsubscribeGame();
unsubscribeChat();
clearTimeout(timer);


};



},[id,loading]);



async function sendReaction(text:string){



const user = auth.currentUser;



if(!user){
alert("Connecte-toi pour envoyer des réactions");
return;
}




try{

const messageRef = push(
ref(
database,
`rooms/${id}/spectatorMessages`

)
);




await set(
messageRef,
{

text,
user:user.displayName || "Spectateur",
createdAt:serverTimestamp()

}
);



}catch(error){
console.error("Erreur envoi réaction:",error);
alert("Erreur lors de l'envoi");
}



}





if(loading){

return(
<main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
<div className="text-center">
<p className="text-xl">🎮 Recherche de la partie...</p>
<p className="text-sm text-gray-400 mt-3">ID : {id}</p>
</div>
</main>
)

}



if(error || !game){

return(
<main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3 p-4">
<h1 className="text-xl font-bold">👁️ Spectateur</h1>
<p className="text-red-400">{error || "❌ Partie introuvable"}</p>
<p className="text-gray-400 text-xs">ID : {id}</p>
<button onClick={()=>router.push("/spectator")} className="mt-4 bg-purple-600 py-3 px-6 rounded-xl font-bold">← Retour aux parties</button>
</main>
)

}



return(


<main className="min-h-screen bg-[#050505] text-white p-4">
<div className="max-w-sm mx-auto">
<h1 className="text-xl font-black text-center mb-5">👁️ Spectateur</h1>

<div className="bg-white/10 rounded-2xl p-4 mb-4">
<h2 className="font-bold">🎮 {game.name || "Partie"}</h2>
<p className="text-green-400 text-sm mt-2">🔴 En direct</p>
<p className="text-sm mt-2">🔵 Tour : {game.game?.turn || "En attente"}</p>
<p className="text-sm mt-2">🏆 Gagnant : {game.game?.winner || "En cours"}</p>
</div>

<div className="bg-white/10 rounded-2xl p-4 mb-4">
<h2 className="font-bold mb-3">👥 Joueurs</h2>
{
game.players &&
Object.values(game.players).map((player:any)=>(
<p key={player.uid} className="text-sm">
🎮 {player.name}
{player.symbol && (
<span className={`ml-2 font-bold ${player.symbol==="X" ? "text-blue-500" : "text-red-500"}`}>
({player.symbol})
</span>
)}
</p>
))
}
</div>

<div className="bg-white/10 rounded-2xl p-4 mb-4">
<h2 className="font-bold mb-3">🎲 Plateau de jeu</h2>
{
game.game?.board && Array.isArray(game.game.board) ? (
<div className="grid grid-cols-10 gap-1">
{
game.game.board.map((row:string[],rowIndex:number)=>(
row.map((cell:string,colIndex)=>(
<div key={`${rowIndex}-${colIndex}`} className="h-8 w-8 bg-black/40 rounded-lg flex items-center justify-center text-sm font-black">
{cell==="X" && <span className="text-blue-500">X</span>}
{cell==="O" && <span className="text-red-500">O</span>}
</div>
))
))
}
</div>
) : (
<p className="text-gray-400 text-xs">Plateau en attente...</p>
)
}
</div>

<div className="bg-white/10 rounded-2xl p-4 mb-4">
<h2 className="font-bold mb-3">💬 Réactions rapides</h2>
<div className="grid grid-cols-2 gap-2">
{
reactions.map((reaction)=>(
<button key={reaction} onClick={()=>sendReaction(reaction)} className="bg-purple-600 rounded-xl py-2 text-xs font-bold hover:bg-purple-700 transition-all">
{reaction}
</button>
))
}
</div>
</div>

<div className="bg-black/40 rounded-2xl p-4 mb-4">
<h2 className="font-bold mb-3">🔴 Messages des spectateurs</h2>
{
messages.length === 0 ? (
<p className="text-gray-400 text-xs">Aucun message pour le moment</p>
) : (
messages.map((msg:any,index)=>(
<p key={index} className="text-sm mb-2"><b>{msg.user}</b> : {msg.text}</p>
))
)
}
</div>

<button onClick={()=>router.push("/spectator")} className="w-full bg-white/10 py-3 rounded-xl font-bold hover:bg-white/20 transition-all">
← Retour aux parties
</button>
</div>
</main>
)



}
