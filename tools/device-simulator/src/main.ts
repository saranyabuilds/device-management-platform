import { parseSimulatorConfig } from './simulator/config';
import { MqttPublisher } from './simulator/mqtt-publisher';
import { runSimulation } from './simulator/simulator';

async function main(): Promise<void> {
  const config = parseSimulatorConfig(process.argv.slice(2), process.env);
  const publisher = config.dryRun ? undefined : new MqttPublisher(config.mqtt);
  const result = await runSimulation(config, publisher);

  for (const line of result.logs) {
    console.log(JSON.stringify(line));
  }

  console.log(JSON.stringify({ level: 'info', event: 'simulation_complete', stats: result.stats }));

  if (result.stats.publishErrors > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ level: 'error', event: 'simulation_failed', message }));
  process.exitCode = 1;
});
