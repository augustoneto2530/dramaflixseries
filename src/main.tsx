import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Garante que visitantes recebam a versão mais nova do site:
// verifica atualizações ao abrir, a cada 5 minutos e ao voltar para a aba,
// e recarrega automaticamente quando uma nova versão é publicada.
if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => registration.update().catch(() => {});
      setInterval(check, 5 * 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);
