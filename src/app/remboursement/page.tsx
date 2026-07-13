"use client";

import { motion } from "framer-motion";
import Link from "next/link";


export default function Remboursement(){

return (

<div className="min-h-screen bg-black text-white px-5 py-10">

<div className="max-w-4xl mx-auto">


<Link
href="/"
className="text-blue-400 hover:text-blue-300"
>
← Retour
</Link>



<motion.div
initial={{opacity:0,y:20}}
animate={{opacity:1,y:0}}
className="mt-8 bg-zinc-900 rounded-3xl p-6 md:p-10 border border-zinc-800"
>


<h1 className="text-3xl md:text-5xl font-bold text-center mb-8">
Politique de remboursement
</h1>


<p className="text-gray-400 text-center mb-8">
Dernière mise à jour : Juillet 2026
</p>



<section className="space-y-8">


<div>
<h2 className="text-xl font-bold text-blue-400">
1. Dépôts
</h2>

<p className="text-gray-300 mt-2">
Les dépôts effectués sur Titato sont ajoutés au portefeuille
de l'utilisateur après confirmation du paiement par le service
de paiement utilisé.
</p>

</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
2. Vérification des transactions
</h2>

<p className="text-gray-300 mt-2">
Chaque transaction peut être vérifiée afin de protéger
les utilisateurs et prévenir les opérations frauduleuses.
</p>

</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
3. Mises engagées
</h2>

<p className="text-gray-300 mt-2">
Lorsqu'un utilisateur confirme une partie,
le montant de la mise est réservé.
Une mise engagée dans une partie en cours
ne peut généralement pas être annulée.
</p>

</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
4. Problème technique
</h2>

<p className="text-gray-300 mt-2">
En cas de problème technique empêchant le bon déroulement
d'une partie, Titato peut effectuer une analyse afin
de déterminer la meilleure solution :
</p>


<ul className="list-disc pl-5 mt-3 text-gray-300 space-y-2">

<li>remboursement de la mise ;</li>
<li>annulation de la partie ;</li>
<li>validation manuelle du résultat.</li>

</ul>

</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
5. Retraits
</h2>

<p className="text-gray-300 mt-2">
Les demandes de retrait sont traitées après vérification
des informations nécessaires.
Les délais peuvent dépendre du service de paiement utilisé.
</p>

</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
6. Transactions incorrectes
</h2>

<p className="text-gray-300 mt-2">
Si une erreur technique provoque un crédit ou un paiement
incorrect, Titato peut corriger la transaction après
vérification.
</p>

</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
7. Fraude
</h2>

<p className="text-gray-300 mt-2">
Toute transaction liée à une fraude ou une tentative
de fraude peut être bloquée pendant une enquête.
</p>

</div>



<div>
<h2 className="text-xl font-bold text-blue-400">
8. Contact
</h2>

<p className="text-gray-300 mt-2">
Pour toute demande concernant une transaction,
l'utilisateur peut contacter le support Titato.
</p>

</div>



</section>



</motion.div>


</div>

</div>

);

}