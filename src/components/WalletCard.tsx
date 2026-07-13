"use client";


import React, { useEffect, useState } from "react";




interface WalletCardProps {
  uid: string;
}




export default function WalletCard({ uid }: WalletCardProps){
  const [wallet, setWallet] = useState<{
    balance: number;
    locked: number;
    available: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [processing, setProcessing] = useState(false);




  useEffect(() => {
    fetchWallet();
  }, [uid]);




  const fetchWallet = async () => {
    try{
      const response = await fetch("/api/wallet/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid })
      });
      
      const data = await response.json();
      if(data.success){
        setWallet(data.wallet);
      }
    } catch(err){
      console.error(err);
    } finally {
      setLoading(false);
    }
  };




  const handleDeposit = async () => {
    if(!amount || !phone){
      alert("Veuillez remplir tous les champs");
      return;
    }
    
    const depositAmount = Number(amount);
    if(depositAmount < 50 || depositAmount > 50000){
      alert("Le montant doit être entre 50 HTG et 50,000 HTG");
      return;
    }
    
    setProcessing(true);
    
    try{
      const response = await fetch("/api/wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          amount: depositAmount,
          phone,
          method: "MonCash"
        })
      });
      
      const data = await response.json();
      
      if(data.success){
        alert("Dépôt effectué avec succès!");
        setShowDeposit(false);
        setAmount("");
        setPhone("");
        fetchWallet();
      } else {
        alert(data.error || "Erreur lors du dépôt");
      }
    } catch(err){
      console.error(err);
      alert("Erreur lors du dépôt");
    } finally {
      setProcessing(false);
    }
  };




  const handleWithdraw = async () => {
    if(!amount || !phone){
      alert("Veuillez remplir tous les champs");
      return;
    }
    
    const withdrawAmount = Number(amount);
    if(withdrawAmount < 100 || withdrawAmount > 25000){
      alert("Le montant doit être entre 100 HTG et 25,000 HTG");
      return;
    }
    
    if(wallet && withdrawAmount > wallet.available){
      alert("Solde insuffisant");
      return;
    }
    
    setProcessing(true);
    
    try{
      const response = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          amount: withdrawAmount,
          phone,
          method: "MonCash"
        })
      });
      
      const data = await response.json();
      
      if(data.success){
        alert("Retrait effectué avec succès!");
        setShowWithdraw(false);
        setAmount("");
        setPhone("");
        fetchWallet();
      } else {
        alert(data.error || "Erreur lors du retrait");
      }
    } catch(err){
      console.error(err);
      alert("Erreur lors du retrait");
    } finally {
      setProcessing(false);
    }
  };




  if(loading){
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/3"></div>
        </div>
      </div>
    );
  }




  if(!wallet){
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-red-500">Erreur de chargement du wallet</p>
      </div>
    );
  }




  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 shadow-xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">Solde disponible</h3>
          <p className="text-3xl font-bold text-white">
            {wallet.available.toLocaleString()} HTG
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-xs mb-1">Verrouillé</p>
          <p className="text-lg font-semibold text-yellow-500">
            {wallet.locked.toLocaleString()} HTG
          </p>
        </div>
      </div>
      
      <div className="border-t border-gray-700 pt-4 mb-4">
        <div className="flex justify-between">
          <span className="text-gray-400">Solde total</span>
          <span className="text-white font-bold">
            {wallet.balance.toLocaleString()} HTG
          </span>
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={() => setShowDeposit(true)}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
        >
          Déposer
        </button>
        <button
          onClick={() => setShowWithdraw(true)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
        >
          Retirer
        </button>
      </div>
      
      {/* Modal Dépôt */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h4 className="text-white text-xl font-bold mb-4">Déposer</h4>
            
            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Montant (HTG)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Min: 50 HTG, Max: 50,000 HTG"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Numéro MonCash</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+509 XXXX XXXX"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeposit(false);
                  setAmount("");
                  setPhone("");
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleDeposit}
                disabled={processing}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {processing ? "Traitement..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Retrait */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h4 className="text-white text-xl font-bold mb-4">Retirer</h4>
            
            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Montant (HTG)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Max: ${wallet.available.toLocaleString()} HTG`}
                max={wallet.available}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="mb-4">
              <label className="text-gray-400 text-sm mb-2 block">Numéro MonCash</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+509 XXXX XXXX"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowWithdraw(false);
                  setAmount("");
                  setPhone("");
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleWithdraw}
                disabled={processing}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {processing ? "Traitement..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
