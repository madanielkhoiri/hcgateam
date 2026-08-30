import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

function buatRequest(userId: number) {
  return { user: { id: userId, username: 'budi', role: 'ADMIN' } } as any;
}

describe('AuthController', () => {
  it('login meneruskan body ke AuthService.login', async () => {
    const login = jest.fn().mockResolvedValue({ accessToken: 'token-palsu' });
    const authService = { login } as unknown as AuthService;
    const controller = new AuthController(authService);
    const dto = { username: 'budi', password: 'rahasia123' };

    const hasil = await controller.login(dto as any);

    expect(login).toHaveBeenCalledWith(dto);
    expect(hasil).toEqual({ accessToken: 'token-palsu' });
  });

  it('getProfile meneruskan id user yang sedang login ke AuthService', async () => {
    const getProfile = jest.fn().mockResolvedValue({ id: 7, username: 'budi' });
    const authService = { getProfile } as unknown as AuthService;
    const controller = new AuthController(authService);

    const hasil = await controller.getProfile(buatRequest(7));

    expect(getProfile).toHaveBeenCalledWith(7);
    expect(hasil).toEqual({ id: 7, username: 'budi' });
  });

  it('updateProfile meneruskan id user & payload ke AuthService', async () => {
    const updateProfile = jest.fn().mockResolvedValue({ id: 7, name: 'Budi Baru' });
    const authService = { updateProfile } as unknown as AuthService;
    const controller = new AuthController(authService);
    const dto = { name: 'Budi Baru', username: 'budi.baru' };

    const hasil = await controller.updateProfile(buatRequest(7), dto as any);

    expect(updateProfile).toHaveBeenCalledWith(7, dto);
    expect(hasil).toEqual({ id: 7, name: 'Budi Baru' });
  });

  it('changePassword meneruskan id user & payload ke AuthService', async () => {
    const changePassword = jest.fn().mockResolvedValue({ message: 'Password berhasil diubah' });
    const authService = { changePassword } as unknown as AuthService;
    const controller = new AuthController(authService);
    const dto = { currentPassword: 'lama12345', newPassword: 'baru123456', confirmPassword: 'baru123456' };

    const hasil = await controller.changePassword(buatRequest(7), dto as any);

    expect(changePassword).toHaveBeenCalledWith(7, dto);
    expect(hasil).toEqual({ message: 'Password berhasil diubah' });
  });
});
