import Link from "next/link";


export default function Footer(){

return (

<footer className="bg-black border-t border-zinc-800 text-gray-400 py-8 px-5">

<div className="max-w-5xl mx-auto">


<div className="flex flex-wrap justify-center gap-5 text-sm">


<Link
href="/conditions-utilisation"
className="hover:text-blue-400"
>
Conditions d'utilisation
</Link>


<Link
href="/politique-confidentialite"
className="hover:text-blue-400"
>
Confidentialité
</Link>


<Link
href="/remboursement"
className="hover:text-blue-400"
>
Remboursement
</Link>


<Link
href="/anti-fraude"
className="hover:text-blue-400"
>
Anti-fraude
</Link>


</div>


<p className="text-center mt-5 text-xs">
© {new Date().getFullYear()} Titato. Tous droits réservés.
</p>


</div>

</footer>

);

}