// tests/unit/user.functions.test.ts
import mongoose from 'mongoose';

// ---- MOCKI MODELI / BIBLIOTEK ----
jest.mock('../../src/models/user', () => {
  const save = jest.fn();
  // Konstruktor: new User(data) -> { ...data, save }
  const Ctor: any = jest.fn().mockImplementation((data) => ({ ...data, save }));

  // Statyczne metody używane w kontrolerze:
  Ctor.findById = jest.fn();
  Ctor.findOne = jest.fn();

  return { __esModule: true, default: Ctor };
});

jest.mock('bcrypt', () => {
  const hash = jest.fn();
  const compare = jest.fn();
  return { __esModule: true, default: { hash, compare }, hash, compare };
});
import bcrypt, { hash as bcryptHash, compare as bcryptCompare } from 'bcrypt';

jest.mock('../../src/services/token', () => ({
  __esModule: true,
  signAccessToken: jest.fn(),
  signRefreshToken: jest.fn(),
}));
import { signAccessToken, signRefreshToken } from '../../src/services/token';

import userFunctions from '../../src/method/user';
import User from '../../src/models/user';

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

// Wycisz logi w testach
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  (console.log as jest.Mock).mockRestore();
  (console.error as jest.Mock).mockRestore();
});

describe('userFunctions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------- getById ----------
  describe('getById', () => {
    it('zwraca 400 gdy ID jest nieprawidłowe', async () => {
      const res = mockRes();
      jest.spyOn(mongoose, 'isValidObjectId').mockReturnValueOnce(false);

      await userFunctions.getById({ body: { id: 'x' } } as any, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect((User as any).findById).not.toHaveBeenCalled();
    });

    it('zwraca 404 gdy użytkownik nie istnieje', async () => {
      const res = mockRes();
      const id = new mongoose.Types.ObjectId().toHexString();
      jest.spyOn(mongoose, 'isValidObjectId').mockReturnValueOnce(true);

      (User as any).findById.mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce(null),
      });

      await userFunctions.getById({ body: { id } } as any, res);

      expect((User as any).findById).toHaveBeenCalledWith(id);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('zwraca 200 i usera gdy istnieje', async () => {
      const res = mockRes();
      const id = new mongoose.Types.ObjectId().toHexString();
      jest.spyOn(mongoose, 'isValidObjectId').mockReturnValueOnce(true);

      const userDoc = { _id: id, email: 'a@a.com', username: 'alice', phone: '123' };
      (User as any).findById.mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce(userDoc),
      });

      await userFunctions.getById({ body: { id } } as any, res);

      expect((User as any).findById).toHaveBeenCalledWith(id);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, user: userDoc })
      );
    });
  });

  // ---------- registration ----------
  describe('registration', () => {
    it('zwraca 400 gdy brakuje email/username/password', async () => {
      const res = mockRes();
      await userFunctions.registration({ body: {} } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('zwraca 409 gdy user już istnieje (email lub username)', async () => {
      const res = mockRes();
      (User as any).findOne.mockResolvedValueOnce({ _id: 'u1' });

      await userFunctions.registration(
        { body: { email: 'a@a.com', username: 'alice', password: 'pw' } } as any,
        res
      );

      expect((User as any).findOne).toHaveBeenCalledWith({
        $or: [{ email: 'a@a.com' }, { username: 'alice' }],
      });
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('zakłada konto, hashuje hasło i zwraca 201', async () => {
      const res = mockRes();
      (User as any).findOne.mockResolvedValueOnce(null);
      (bcryptHash as jest.Mock).mockResolvedValueOnce('<hashed>');

      // instancja zwrócona przez `new User({...})` ma mieć save():
      const inst: any = {
        _id: 'newId',
        email: 'a@a.com',
        username: 'alice',
        password: '<hashed>',
        save: jest.fn().mockResolvedValue(undefined),
      };
      (User as any).mockImplementationOnce(() => inst);

      await userFunctions.registration(
        { body: { email: 'a@a.com', username: 'alice', password: 'pw' } } as any,
        res
      );

      expect(bcryptHash).toHaveBeenCalledWith('pw', 10);
      expect(inst.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          user: expect.objectContaining({
            _id: 'newId',
            email: 'a@a.com',
            username: 'alice',
          }),
        })
      );
    });

    it('gdy coś padnie → 500', async () => {
      const res = mockRes();
      (User as any).findOne.mockResolvedValueOnce(null);
      (bcryptHash as jest.Mock).mockResolvedValueOnce('<hashed>');

      const inst: any = { save: jest.fn().mockRejectedValue(new Error('db')) };
      (User as any).mockImplementationOnce(() => inst);

      await userFunctions.registration(
        { body: { email: 'a@a.com', username: 'alice', password: 'pw' } } as any,
        res
      );

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---------- login ----------
  describe('login', () => {
    it('zwraca 400 gdy brak identifier albo password', async () => {
      const res = mockRes();
      await userFunctions.login({ body: { password: 'x' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);

      const res2 = mockRes();
      await userFunctions.login({ body: { email: 'a@a.com' } } as any, res2);
      expect(res2.status).toHaveBeenCalledWith(400);
    });

    it('zwraca 404 gdy user nie istnieje', async () => {
      const res = mockRes();
      (User as any).findOne.mockResolvedValueOnce(null);

      await userFunctions.login(
        { body: { email: 'a@a.com', password: 'pw' } } as any,
        res
      );

      expect((User as any).findOne).toHaveBeenCalledWith({
        $or: [{ email: 'a@a.com' }, { username: 'a@a.com' }],
      });
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('hashed password: zły -> 401', async () => {
      const res = mockRes();
      (User as any).findOne.mockResolvedValueOnce({
        _id: 'u1',
        email: 'a@a.com',
        username: 'alice',
        password: '$2b$xyz...', // wygląda jak bcrypt
      });
      (bcryptCompare as jest.Mock).mockResolvedValueOnce(false);

      await userFunctions.login(
        { body: { email: 'a@a.com', password: 'pw' } } as any,
        res
      );

      expect(bcryptCompare).toHaveBeenCalledWith('pw', '$2b$xyz...');
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('hashed password: OK -> 200 + tokens', async () => {
      const res = mockRes();
      (User as any).findOne.mockResolvedValueOnce({
        _id: 'u1',
        email: 'a@a.com',
        username: 'alice',
        password: '$2b$xyz...',
      });
      (bcryptCompare as jest.Mock).mockResolvedValueOnce(true);
      (signAccessToken as jest.Mock).mockReturnValue('acc');
      (signRefreshToken as jest.Mock).mockReturnValue('ref');

      await userFunctions.login(
        { body: { username: 'alice', password: 'pw' } } as any,
        res
      );

      expect((User as any).findOne).toHaveBeenCalledWith({
        $or: [{ email: 'alice' }, { username: 'alice' }],
      });
      expect(signAccessToken).toHaveBeenCalled();
      expect(signRefreshToken).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          user: expect.objectContaining({ email: 'a@a.com', username: 'alice', _id: 'u1' }),
          tokens: { accessToken: 'acc', refreshToken: 'ref' },
        })
      );
    });

    it('legacy (plain) password: OK -> 200 + tokens (bcrypt.compare nie wołany)', async () => {
      const res = mockRes();
      (User as any).findOne.mockResolvedValueOnce({
        _id: 'u1',
        email: 'a@a.com',
        username: 'alice',
        password: 'pw',
      });
      (signAccessToken as jest.Mock).mockReturnValue('acc');
      (signRefreshToken as jest.Mock).mockReturnValue('ref');

      await userFunctions.login(
        { body: { login: 'a@a.com', password: 'pw' } } as any,
        res
      );

      expect(bcryptCompare).not.toHaveBeenCalled(); // branch legacy
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          user: expect.objectContaining({ email: 'a@a.com', username: 'alice', _id: 'u1' }),
          tokens: { accessToken: 'acc', refreshToken: 'ref' },
        })
      );
    });

    it('legacy (plain) password: zły -> 401', async () => {
      const res = mockRes();
      (User as any).findOne.mockResolvedValueOnce({
        _id: 'u1',
        email: 'a@a.com',
        username: 'alice',
        password: 'pw',
      });

      await userFunctions.login(
        { body: { user: 'alice', password: 'bad' } } as any,
        res
      );

      expect(bcryptCompare).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('500 przy niespodziewanym wyjątku', async () => {
      const res = mockRes();
      (User as any).findOne.mockRejectedValueOnce(new Error('db down'));

      await userFunctions.login(
        { body: { email: 'a@a.com', password: 'pw' } } as any,
        res
      );

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});