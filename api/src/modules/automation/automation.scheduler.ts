import { AutomationService } from "./automation.service";

export function startAutomationScheduler() {
  setInterval(() => {
    AutomationService.runPending().catch((error) => {
      console.error("Erro ao executar automação pendente.", error);
    });
  }, 5 * 60 * 1000);
}
