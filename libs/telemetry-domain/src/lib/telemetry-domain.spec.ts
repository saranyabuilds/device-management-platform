import { telemetryDomain } from './telemetry-domain';

describe('telemetryDomain', () => {
  it('should work', () => {
    expect(telemetryDomain()).toEqual('telemetry-domain');
  });
});
