"use client";


type Props = {

  board:string[][];

  mySymbol:"X"|"O"|"";

  turn:"X"|"O";

  winner:string|null;

  playMove:(
    row:number,
    col:number
  )=>void;

};



export default function TiTaToBoard({

board,

mySymbol,

turn,

winner,

playMove

}:Props){



return (

<div className="
grid
grid-cols-10
gap-1
p-4
bg-black/40
rounded-2xl
">


{
board.map(
(row,rowIndex)=>

row.map(
(cell,colIndex)=>(


<button

key={`${rowIndex}-${colIndex}`}

disabled={
!!cell || !!winner
}

onClick={()=>{

playMove(
rowIndex,
colIndex
);

}}

className="
w-8
h-8
md:w-10
md:h-10
rounded
bg-blue-900/50
border
border-blue-400/30
font-black
text-xl
"

>

{cell}


</button>


)

)

)

}


</div>

);

}