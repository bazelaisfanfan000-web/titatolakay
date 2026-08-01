"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, AlertCircle, CheckCircle, ArrowLeft, Smartphone, Monitor, Globe, Search } from "lucide-react";

export default function NotificationsHelp() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#05070b] px-4 text-white">
      <div className="absolute left-1/2 top-[-180px] h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] transition-all hover:bg-white/[0.05]"
          >
            <ArrowLeft size={20} className="text-white/70" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white">Notifications</h1>
            <p className="text-sm text-white/40">Comment les activer</p>
          </div>
        </div>

        {/* Pourquoi les notifications */}
        <div className="mb-6 rounded-2xl border border-blue-400/20 bg-blue-500/[0.08] p-5 backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2">
            <Bell size={24} className="text-blue-400" />
            <h2 className="text-lg font-bold text-blue-100">Pourquoi activer les notifications ?</h2>
          </div>
          <ul className="space-y-2 text-sm text-blue-100/70">
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-blue-400" />
              <span>Recevez une alerte quand une nouvelle partie commence</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-blue-400" />
              <span>Soyez notifié de vos victoires et gains</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={16} className="mt-0.5 shrink-0 text-blue-400" />
              <span>Ne manquez jamais une opportunité de jouer</span>
            </li>
          </ul>
        </div>

        {/* Instructions par navigateur */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider">Instructions par navigateur</h3>

          {/* Chrome */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
                <Globe size={20} className="text-white" />
              </div>
              <div>
                <h4 className="font-bold text-white">Chrome</h4>
                <p className="text-xs text-white/40">PC / Android</p>
              </div>
            </div>
            <ol className="space-y-2 text-sm text-white/60">
              <li className="flex gap-2">
                <span className="font-bold text-white/40">1.</span>
                <span>Cliquez sur l'icône 🔒 à gauche de l'URL</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-white/40">2.</span>
                <span>Cherchez "Notifications" dans la liste</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-white/40">3.</span>
                <span>Sélectionnez "Autoriser"</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-white/40">4.</span>
                <span>Rechargez la page</span>
              </li>
            </ol>
          </div>

          {/* Safari */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-500">
                <Search size={20} className="text-white" />
              </div>
              <div>
                <h4 className="font-bold text-white">Safari</h4>
                <p className="text-xs text-white/40">iPhone / iPad / Mac</p>
              </div>
            </div>
            <ol className="space-y-2 text-sm text-white/60">
              <li className="flex gap-2">
                <span className="font-bold text-white/40">1.</span>
                <span>iPhone/iPad: Réglages → Safari → Notifications</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-white/40">2.</span>
                <span>Mac: Safari → Réglages → Sites Web → Notifications</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-white/40">3.</span>
                <span>Trouvez wincash.vercel.app dans la liste</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-white/40">4.</span>
                <span>Activez "Autoriser"</span>
              </li>
            </ol>
          </div>

          {/* Firefox */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600">
                <Monitor size={20} className="text-white" />
              </div>
              <div>
                <h4 className="font-bold text-white">Firefox</h4>
                <p className="text-xs text-white/40">PC / Android</p>
              </div>
            </div>
            <ol className="space-y-2 text-sm text-white/60">
              <li className="flex gap-2">
                <span className="font-bold text-white/40">1.</span>
                <span>Cliquez sur l'icône 🔒 à gauche de l'URL</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-white/40">2.</span>
                <span>Permissions → Notifications</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-white/40">3.</span>
                <span>Cochez "Autoriser"</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-white/40">4.</span>
                <span>Rechargez la page</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Info importante */}
        <div className="mt-6 rounded-2xl border border-orange-400/20 bg-orange-500/[0.08] p-4 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-orange-400" />
            <div>
              <h4 className="text-sm font-bold text-orange-100">Important</h4>
              <p className="mt-1 text-xs text-orange-100/70">
                Si vous avez déjà refusé les notifications, vous devez d'abord les réinitialiser dans les paramètres de votre navigateur avant de pouvoir les autoriser.
              </p>
            </div>
          </div>
        </div>

        {/* Bouton retour */}
        <button
          onClick={() => router.back()}
          className="mt-6 w-full rounded-xl border border-white/[0.07] bg-white/[0.05] px-4 py-3 text-sm font-bold text-white transition-all hover:bg-white/[0.1]"
        >
          Retour
        </button>
      </motion.div>
    </main>
  );
}
