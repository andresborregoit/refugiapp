import { AppService } from './app.service';

describe('AppService', () => {
  it('returns API health metadata', () => {
    const service = new AppService();

    expect(service.getHealth()).toEqual({
      name: 'refugiapp-api',
      status: 'ok',
      version: '0.1.0',
    });
  });
});
