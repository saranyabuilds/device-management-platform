import { parseBrokerUrl } from './mqtt-publisher';

describe('parseBrokerUrl', () => {
  it('supports ssl and tcp aliases used by the repository config', () => {
    expect(parseBrokerUrl('ssl://localhost:8883')).toEqual({
      host: 'localhost',
      port: 8883,
      secure: true,
    });

    expect(parseBrokerUrl('tcp://mqtt:1883')).toEqual({
      host: 'mqtt',
      port: 1883,
      secure: false,
    });
  });

  it('defaults MQTT ports by protocol', () => {
    expect(parseBrokerUrl('mqtt://broker.local')).toEqual({
      host: 'broker.local',
      port: 1883,
      secure: false,
    });

    expect(parseBrokerUrl('mqtts://broker.local')).toEqual({
      host: 'broker.local',
      port: 8883,
      secure: true,
    });
  });
});
