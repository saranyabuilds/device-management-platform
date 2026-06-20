import { appRoutes } from './app.routes';

describe('appRoutes', () => {
  it('should require DEVICE_READ for the device inventory route', () => {
    const shellRoute = appRoutes.find((route) => route.path === '');
    const devicesRoute = shellRoute?.children?.find((route) => route.path === 'devices');

    expect(devicesRoute?.data?.['permission']).toBe('DEVICE_READ');
  });

  it('should require DEVICE_READ for the device profile route', () => {
    const shellRoute = appRoutes.find((route) => route.path === '');
    const profileRoute = shellRoute?.children?.find((route) => route.path === 'devices/:serialNumber');

    expect(profileRoute?.data?.['permission']).toBe('DEVICE_READ');
  });
});
