import { env } from "./config/env";
import { app } from "./app";
import { startAutomationScheduler } from "./modules/automation/automation.scheduler";

app.listen(env.PORT, () => {
  console.log(`API Sorteou Ganhou Admin rodando na porta ${env.PORT}`);
});

startAutomationScheduler();
