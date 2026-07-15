import { parseSimulatorConfig } from './config';
import { runSimulation, type Publisher } from './simulator';

describe('runSimulation', () => {
  it('runs dry-run without a publisher', async () => {
    const config = parseSimulatorConfig(['--count', '2', '--duration', '30s'], {});

    const result = await runSimulation(config);

    expect(result.stats.devicesStarted).toBe(2);
    expect(result.stats.messagesGenerated).toBeGreaterThan(0);
    expect(result.stats.messagesPublished).toBe(0);
    expect(result.stats.publishErrors).toBe(0);
    expect(result.logs.every((log) => log.dryRun)).toBe(true);
  });

  it('publishes through the provided publisher when dry-run is disabled', async () => {
    const published: string[] = [];
    const publisher: Publisher = {
      publish: async ({ topic }) => {
        published.push(topic);
      },
    };
    const config = parseSimulatorConfig(['--dry-run', 'false', '--duration', '30s'], {});

    const result = await runSimulation(config, publisher);

    expect(result.stats.messagesPublished).toBe(published.length);
    expect(result.stats.publishErrors).toBe(0);
    expect(published.length).toBeGreaterThan(0);
  });

  it('records publish failures for rejected auth simulation', async () => {
    const publisher: Publisher = {
      publish: async () => {
        throw new Error('not authorized');
      },
    };
    const config = parseSimulatorConfig(['--dry-run', 'false', '--failure-mode', 'rejected-auth'], {});

    const result = await runSimulation(config, publisher);

    expect(result.stats.publishErrors).toBeGreaterThan(0);
    expect(result.stats.failuresSimulated).toBeGreaterThan(0);
    expect(result.logs.some((log) => log.event === 'message_publish_failed')).toBe(true);
  });
});
