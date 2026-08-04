"use client";

import {
  useEffect,
  useState,
  useRef
} from "react";


import {
  ref,
  onValue,
  query,
  limitToLast,
  push,
  set
} from "firebase/database";


import {
  rtdb,
  auth
} from "@/lib/firebase";



type Props = {

  roomId:string;

  uid:string;

  userName:string;

};



type Message = {

  id:string;

  uid:string;

  name:string;

  message:string;

  timestamp:number;

  isSystem?:boolean;

  effect?:boolean; // true si message avec effet (2 HTG)

};



export default function GameChat({

roomId,

uid,

userName

}:Props){



const [messages,setMessages] =
useState<Message[]>([]);



const [text,setText] =
useState("");



const endRef =
useRef<HTMLDivElement>(null);



// États pour le chat payant
const [messageCount, setMessageCount] = useState(0);
const [isChatLocked, setIsChatLocked] = useState(false);
const [hasAcceptedPayment, setHasAcceptedPayment] = useState(false);
const [showPaymentModal, setShowPaymentModal] = useState(false);
const [balance, setBalance] = useState<number>(0);
const [pendingMessage, setPendingMessage] = useState("");
const [errorMessage, setErrorMessage] = useState("");
const [selectedAmount, setSelectedAmount] = useState<number>(1); // 1 ou 2 HTG
const [showEffectAnimation, setShowEffectAnimation] = useState(false);






useEffect(()=>{


const chatRef =

ref(

rtdb,

`rooms/${roomId}/chat`

);



const chatQuery =

query(

chatRef,

limitToLast(50)

);





const unsubscribe =

onValue(

chatQuery,

(snapshot)=>{


const data =
snapshot.val();



if(!data){

setMessages([]);

return;

}




const list =

Object.entries(data)

.map(([id,value]:any)=>({

id,

uid:value.uid || "",

name:value.name || "Joueur",

message:value.message || "",

timestamp:value.timestamp || Date.now(),

isSystem:value.isSystem || false,

effect:value.effect || false

}))

.sort(

(a,b)=>

a.timestamp - b.timestamp

);




setMessages(list);



}

);





return()=>unsubscribe();



},[roomId]);


// Écouter le solde de l'utilisateur
useEffect(()=>{
const user = auth.currentUser;
if(!user) return;

const balanceRef = ref(rtdb, `users/${user.uid}/balance`);
const unsubscribe = onValue(balanceRef, (snapshot) => {
setBalance(snapshot.val() || 0);
});

return () => unsubscribe();
}, []);

// Compter les messages envoyés par l'utilisateur et écouter l'état de blocage
useEffect(()=>{
const user = auth.currentUser;
if(!user) return;

// Écouter le compteur de messages gratuits utilisés
const freeMessagesRef = ref(rtdb, `rooms/${roomId}/freeMessagesUsed/${user.uid}`);
const unsubscribeFree = onValue(freeMessagesRef, (snapshot) => {
const count = snapshot.val() || 0;
setMessageCount(count);
});

// Écouter l'état de blocage du chat
const chatBlockedRef = ref(rtdb, `rooms/${roomId}/chatBlocked/${user.uid}`);
const unsubscribeBlocked = onValue(chatBlockedRef, (snapshot) => {
const blocked = snapshot.val() || false;
setIsChatLocked(blocked);
});

return () => {
unsubscribeFree();
unsubscribeBlocked();
};
}, [roomId]);








useEffect(()=>{


endRef.current?.scrollIntoView({

behavior:"smooth"

});


},[messages]);

// Détecter les messages avec effet et déclencher l'animation
useEffect(()=>{
const user = auth.currentUser;
if(!user) return;

// Chercher le dernier message avec effet envoyé par l'autre joueur
const lastMessageWithEffect = messages.filter(msg => 
msg.effect === true && 
msg.uid !== user.uid && 
!msg.isSystem
).slice(-1)[0];

if(lastMessageWithEffect){
setShowEffectAnimation(true);
setTimeout(() => setShowEffectAnimation(false), 500); // 0.5 seconde
}
}, [messages]);










async function sendMessage(){



if(!text.trim()){

return;

}



if(!uid){

alert(

"Utilisateur non connecté"

);

return;

}


// Vérifier si le chat est verrouillé
if(isChatLocked){
setErrorMessage("🔒 Chat verrouillé. Vous ne pouvez plus envoyer de messages pour cette partie.");
setTimeout(() => setErrorMessage(""), 5000);
return;
}

// Vérifier la limite de 15 mots
const wordCount = text.trim().split(/\s+/).length;
if(wordCount > 15){
setErrorMessage("📝 Maximum 15 mots par message.");
setTimeout(() => setErrorMessage(""), 3000);
return;
}

// Vérifier si c'est le 5ème message (déclencheur du paiement)
if(messageCount >= 4 && !hasAcceptedPayment){
setPendingMessage(text.trim());
setShowPaymentModal(true);
return;
}

// Si déjà accepté, vérifier le solde avant chaque message payant
if(hasAcceptedPayment && balance < 1){
setIsChatLocked(true);
setErrorMessage("💰 Solde insuffisant. Vous ne pouvez pas envoyer ce message. Veuillez recharger votre wallet.");
setTimeout(() => setErrorMessage(""), 5000);
return;
}

try{

const chatRef =

ref(

rtdb,

`rooms/${roomId}/chat`

);

const messageRef =

push(chatRef);

await set(

messageRef,

{

uid: uid,

name: userName || "Joueur",

message:text.trim(),

timestamp:Date.now(),

isSystem: false,

effect: selectedAmount === 2 // true si 2 HTG, false si 1 HTG

}

);

setText("");

// Incrémenter le compteur de messages gratuits utilisés (si < 4)
const user = auth.currentUser;
if(user && messageCount < 4){
const freeMessagesRef = ref(rtdb, `rooms/${roomId}/freeMessagesUsed/${user.uid}`);
await set(freeMessagesRef, messageCount + 1);
}

// Si le joueur a déjà accepté le paiement, déduire le montant pour TOUS les messages suivants
if(hasAcceptedPayment){
try{
if(user){
const token = await user.getIdToken(true);
const response = await fetch("/api/chat/deduct", {
method: "POST",
headers: {
"Content-Type": "application/json",
"Authorization": `Bearer ${token}`,
},
body: JSON.stringify({ amount: selectedAmount }),
});

const data = await response.json();
if(!data.success){
console.error("Erreur déduction:", data.error);
// Si erreur de déduction, afficher un message d'erreur
setErrorMessage("Erreur lors de la déduction. Veuillez réessayer.");
setTimeout(() => setErrorMessage(""), 3000);
}else{
console.log("Déduction réussie:", data);
}
}
}catch(deductError){
console.error("Erreur déduction solde:", deductError);
setErrorMessage("Erreur lors de la déduction. Veuillez réessayer.");
setTimeout(() => setErrorMessage(""), 3000);
}
}

}

catch(error){

console.error(

"Erreur envoi chat",

error

);
}
}

// Handler pour accepter le paiement
async function handleAcceptPayment(amount: number){
try{
const user = auth.currentUser;
if(!user){
setErrorMessage("Utilisateur non connecté");
return;
}

const token = await user.getIdToken(true);
const response = await fetch("/api/chat/deduct", {
method: "POST",
headers: {
"Content-Type": "application/json",
"Authorization": `Bearer ${token}`,
},
body: JSON.stringify({ amount }),
});

const data = await response.json();

if(!data.success){
setIsChatLocked(true);
setErrorMessage("💰 Solde insuffisant. Veuillez recharger votre wallet.");
setShowPaymentModal(false);
return;
}

setHasAcceptedPayment(true);
setSelectedAmount(amount);
setShowPaymentModal(false);

// Envoyer le message en attente
const chatRef = ref(rtdb, `rooms/${roomId}/chat`);
const messageRef = push(chatRef);
await set(messageRef, {
uid: uid,
name: userName || "Joueur",
message: pendingMessage,
timestamp: Date.now(),
isSystem: false,
effect: amount === 2 // true si 2 HTG
});

setText("");
setPendingMessage("");

}catch(error){
console.error("Erreur paiement:", error);
setErrorMessage("Erreur lors du paiement. Veuillez réessayer.");
}
}

// Handler pour refuser le paiement
function handleRefusePayment(){
setIsChatLocked(true);
setShowPaymentModal(false);
setPendingMessage("");

// Marquer le chat comme bloqué dans Firebase
const user = auth.currentUser;
if(user){
const chatBlockedRef = ref(rtdb, `rooms/${roomId}/chatBlocked/${user.uid}`);
set(chatBlockedRef, true);
}

// Envoyer un message système dans le chat (pour le joueur)
const chatRef = ref(rtdb, `rooms/${roomId}/chat`);
const messageRef = push(chatRef);
set(messageRef, {
uid: uid,
name: "Système",
message: "🔒 Chat verrouillé. Vous ne pouvez plus envoyer de messages pour cette partie.",
timestamp: Date.now(),
isSystem: true
});

// Notifier l'adversaire que le chat a été désactivé
const opponentMessageRef = push(chatRef);
set(opponentMessageRef, {
uid: "system",
name: "Système",
message: "💬 L'autre joueur a désactivé le chat.",
timestamp: Date.now(),
isSystem: true
});
}

const emojis = [

"😀",
"😂",
"🎮",
"🏆",
"🔥",
"👍",
"❤️",
"🎉"

];








return(

<>

{/* Animation d'effet visuel */}
{showEffectAnimation && (
<div className="fixed inset-0 pointer-events-none z-40">
<div className="absolute inset-0 bg-purple-500/30 animate-pulse" />
<div className="absolute inset-0 flex items-center justify-center">
<div className="text-6xl animate-bounce">✨</div>
</div>
</div>
)}

<div

className="

w-full

max-w-md

mt-4

bg-white/10

backdrop-blur

rounded-2xl

border

border-white/10

overflow-hidden

"

>



<div

className="

p-3

font-bold

border-b

border-white/10

"

>

💬 Chat

{messageCount < 4 && (
<span className="ml-2 text-xs text-green-400">
🔓 {4 - messageCount} messages gratuits
</span>
)}

{messageCount >= 4 && !isChatLocked && (
<span className="ml-2 text-xs text-yellow-400">
💰 Messages payants
</span>
)}

{isChatLocked && (
<span className="ml-2 text-xs text-red-400">
🔒 Verrouillé
</span>
)}

</div>







<div

className="

h-64

overflow-y-auto

p-3

space-y-3

"

>



{

messages.length===0 &&

<p className="text-gray-400 text-sm text-center">

Aucun message

</p>

}






{

messages.map((msg)=>(



<div

key={msg.id}

className={

msg.uid===uid

?

"text-right"

:

"text-left"

}

>


<p className="text-xs text-gray-400">

{msg.name}

</p>





<div

className={

msg.uid===uid

?

"inline-block bg-blue-600 px-3 py-2 rounded-xl"

:

"inline-block bg-gray-700 px-3 py-2 rounded-xl"

}

>

{msg.message}

</div>



</div>



))

}





<div ref={endRef}/>



</div>








<div

className="

px-3

py-2

flex

gap-1

overflow-x-auto

"

>


{

emojis.map((emoji)=>(


<button

key={emoji}

onClick={()=>setText(prev=>prev+emoji)}

className="text-xl"

>

{emoji}

</button>


))


}



</div>









<div

className="

p-3

border-t

border-white/10

flex

gap-2

"

>


<input

value={text}

onChange={(e)=>

setText(e.target.value)

}

onKeyDown={(e)=>{

if(e.key==="Enter"){

sendMessage();

}

}}

placeholder={`Écrire un message... (${messageCount}/4 gratuits)`}

className="

flex-1

bg-black/30

rounded-xl

px-3

py-2

outline-none

text-white

"

/>






<button

onClick={sendMessage}

className="

bg-blue-600

px-4

rounded-xl

font-bold

"

>

🚀

</button>



</div>

</div>

{/* Modal de paiement */}
{showPaymentModal && (
<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
<div className="bg-[#0D1224] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
<h2 className="text-xl font-black text-white mb-4 text-center">
💰 CHAT PAYANT
</h2>
<div className="space-y-3 text-gray-300 text-sm mb-6">
<p>Vous avez utilisé vos 4 messages gratuits.</p>
<p>Pour envoyer ce message, choisissez une option :</p>
<p className="text-yellow-400">📝 15 mots maximum par message.</p>
<p className="text-green-400 font-bold">Solde disponible : {balance} HTG</p>
</div>
<div className="space-y-3">
<button
onClick={() => handleAcceptPayment(1)}
className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-all"
>
💬 Message classique (1 HTG)
</button>
<button
onClick={() => handleAcceptPayment(2)}
className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-4 rounded-xl transition-all"
>
✨ Message avec effet (2 HTG)
</button>
<button
onClick={handleRefusePayment}
className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl transition-all"
>
❌ Refuser
</button>
</div>
</div>
</div>
)}

{/* Message d'erreur */}
{errorMessage && (
<div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-4 py-2 rounded-xl text-sm font-bold z-50">
{errorMessage}
</div>
)}

</>

);

}