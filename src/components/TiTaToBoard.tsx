"use client";

import React from "react";

interface Props {

board:string[][];

mySymbol:"X"|"O";

turn:"X"|"O";

playMove:(row:number,col:number)=>void;

winner:string|null;

}


export default function TiTaToBoard({

board,

mySymbol,

turn,

playMove,

winner

}:Props){



function clickCell(
row:number,
col:number
){


if(winner){

return;

}



if(board[row][col] !== ""){

return;

}



if(mySymbol !== turn){

alert("⚠️ Ce n'est pas ton tour");

return;

}



playMove(row,col);



}






return (

<div className="w-full flex flex-col items-center">


<div className="mb-5 text-center">


<p className="text-white text-xl font-bold">

🎮 Tu joues avec :

<span
className={`
ml-2
${mySymbol==="X"
?"text-blue-500"
:"text-red-500"
}
`}
>

{mySymbol}

</span>

</p>



<p className="text-white mt-2">

{
winner
?
"🏆 Partie terminée"
:
turn===mySymbol
?
"🟢 À toi de jouer"
:
"⏳ Tour de l'adversaire"
}

</p>


</div>





<div

className="
grid
grid-cols-10
gap-1
bg-black
p-2
rounded-2xl
"

>


{

board.map(
(row,rowIndex)=>(

row.map(
(cell,colIndex)=>(


<button

key={`${rowIndex}-${colIndex}`}

onClick={()=>clickCell(
rowIndex,
colIndex
)}

disabled={
winner!==null ||
cell!==""
}

className={`
w-10
h-10
sm:w-12
sm:h-12

rounded-lg

bg-white/10

border
border-white/20

flex
items-center
justify-center

text-3xl
font-black

transition

hover:scale-110

${
cell==="X"
?
"text-blue-500"
:
cell==="O"
?
"text-red-500"
:
""
}

`}

>


{cell}


</button>



))


)


)


}



</div>



</div>

);

}