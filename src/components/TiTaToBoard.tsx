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

alert("⏳ Ce n'est pas ton tour");

return;

}



playMove(row,col);


}






return (

<div

className="
w-full
flex
flex-col
items-center
mt-6
"

>





{/* STATUT */}

<div

className="

w-full

max-w-md


bg-white/10


border

border-white/20


rounded-3xl


p-5


mb-6


"

>


<h2

className="

text-center

text-3xl

font-black

text-white

"

>

🎮 Ti Ta To

</h2>



<p

className="

text-center

mt-3

text-white

"

>

Votre symbole :


<span

className={`

ml-2

text-3xl

font-black


${

mySymbol==="X"

?

"text-blue-400"

:

"text-red-400"

}

`}

>

{mySymbol}

</span>


</p>






<div

className="

mt-4

text-center

font-bold

"

>


{

winner

?

<p className="text-yellow-400">

🏆 Joueur {winner} gagne !

</p>


:


turn===mySymbol


?


<p className="text-green-400">

🟢 Votre tour

</p>


:


<p className="text-gray-300">

⏳ Tour adversaire

</p>


}



</div>



</div>









{/* TABLE 10x10 */}


<div

className="

w-full

overflow-x-auto

"

>


<div

className="

inline-block


bg-black


p-4


rounded-3xl


border

border-blue-500/30


"

>


<div

className="

grid

grid-cols-10


gap-1

"

>


{


board.map(

(row,rowIndex)=>(


row.map(

(cell,colIndex)=>(



<button


key={

`${rowIndex}-${colIndex}`

}



onClick={()=>clickCell(

rowIndex,

colIndex

)}



disabled={

winner!==null ||

cell!==""


}



className={`


w-8

h-8


sm:w-10

sm:h-10



rounded-md



bg-white/10



border

border-white/20



flex

items-center

justify-center



text-xl

sm:text-2xl



font-black



transition



${

cell==="X"

?

"text-blue-400"

:

cell==="O"

?

"text-red-400"

:

"text-white"

}



${

cell===""

&&

!winner

&&

mySymbol===turn


?

"hover:bg-white/20"

:

""

}


`}



>


{

cell==="X"

&&

"❌"

}



{

cell==="O"

&&

"⭕"

}



</button>



))


)

)


}



</div>


</div>


</div>








<div

className="

mt-5

text-center

text-gray-400

text-sm

"

>

{

winner

?

"🏆 Partie terminée"

:

"Alignez 4 symboles pour gagner"

}


</div>





</div>

);


}