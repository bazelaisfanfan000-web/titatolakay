// src/lib/tttEngine.ts


export type Board = string[][];





// Créer grille 10x10

export function createEmptyBoard():Board{

return Array.from(
{length:10},
()=>Array(10).fill("")
);

}







// Vérifier victoire alignement 4

export function checkWinner(

board:Board

):string|null{



const directions = [

[0,1],   // horizontal

[1,0],   // vertical

[1,1],   // diagonale \

[1,-1]   // diagonale /

];





for(
let row=0;
row<10;
row++
){



for(
let col=0;
col<10;
col++
){



const symbol =
board[row][col];



if(!symbol)
continue;





for(
const [dr,dc]
of directions
){



let count = 1;





// avant

count += countDirection(
board,
row,
col,
-dr,
-dc,
symbol
);



// après

count += countDirection(
board,
row,
col,
dr,
dc,
symbol
);







if(count >=4){

return symbol;

}



}



}



}



return null;


}









function countDirection(

board:Board,

row:number,

col:number,

dr:number,

dc:number,

symbol:string

){


let count = 0;



let r =
row + dr;


let c =
col + dc;





while(

r>=0 &&
r<10 &&
c>=0 &&
c<10 &&
board[r][c]===symbol

){


count++;


r += dr;

c += dc;


}



return count;


}









// Plateau plein

export function isDraw(

board:Board

){


for(
const row of board
){

for(
const cell of row
){


if(cell===""){

return false;

}


}


}


return true;


}









// Jouer un coup

export function makeMove(

board:Board,

row:number,

col:number,

symbol:string

):Board{



const newBoard =

board.map(
row=>[...row]
);





if(
newBoard[row][col] !== ""
){

return board;

}





newBoard[row][col]=symbol;




return newBoard;


}