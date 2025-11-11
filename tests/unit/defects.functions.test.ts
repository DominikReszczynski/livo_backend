import mongoose from 'mongoose';

// ---- MOCKI MODELI ----
jest.mock('../../src/models/defect', () => {
  const save = jest.fn();
  // Konstruktor, który można wywołać z "new"
  const Ctor = jest.fn().mockImplementation((data) => ({ ...data, save }));
  // Statyczne metody używane w kontrolerze
  (Ctor as any).find = jest.fn();
  (Ctor as any).findByIdAndUpdate = jest.fn();
  (Ctor as any).aggregate = jest.fn();
  return { __esModule: true, default: Ctor };
});

jest.mock('../../src/models/properties', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));

import defectsFunctions from '../../src/method/defect';
import Defect from '../../src/models/defect';
import Property from '../../src/models/properties';

// pomocnicza odpowiedź Express
function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
  (console.log as jest.Mock).mockRestore();
  (console.error as jest.Mock).mockRestore();
});

describe('defectsFunctions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addDefect', () => {
    it('zwraca 201 i instancję defektu', async () => {
      const req: any = {
        body: {
          propertyId: new mongoose.Types.ObjectId().toHexString(),
          title: 'Pęknięta rura',
          description: 'Łazienka',
          status: 'nowy',
          imageFilenames: ['a.jpg', 'b.png'],
        },
      };
      const res = mockRes();

      await defectsFunctions.addDefect(req, res);

      expect(Defect).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Pęknięta rura',
          status: 'nowy',
        })
      );
      // save() wywołane na instancji utworzonej przez "new Defect(...)"
      expect((Defect as any).mock.results[0].value.save).toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          defect: expect.objectContaining({ title: 'Pęknięta rura' }),
        })
      );
    });

    it('gdy save rzuca → 500', async () => {
      const res = mockRes();
      const inst: any = { save: jest.fn().mockRejectedValue(new Error('db')) };
      (Defect as any).mockImplementationOnce(() => inst);

      await defectsFunctions.addDefect({ body: { title: 'X' } } as any, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('getAllDefects', () => {
    it('pobiera mieszkania owner/tenant i zwraca defekty (200)', async () => {
      const userID = new mongoose.Types.ObjectId().toHexString();
      const res = mockRes();

      // Property.find(...).select(...): zwraca tablicę _id
      (Property.find as unknown as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce([{ _id: 'p1' }, { _id: 'p2' }]),
      });

      // Defect.find(...).populate(...): zwraca listę defektów
      (Defect as any).find.mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce([
          { _id: 'd1', propertyId: 'p1', title: 'A' },
          { _id: 'd2', propertyId: 'p2', title: 'B' },
        ]),
      });

      await defectsFunctions.getAllDefects({ body: { userID } } as any, res);

      expect(Property.find).toHaveBeenCalledWith({
        $or: [{ ownerId: userID }, { tenantId: userID }],
      });
      expect((Defect as any).find).toHaveBeenCalledWith({
        propertyId: { $in: ['p1', 'p2'] },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          defects: expect.arrayContaining([
            expect.objectContaining({ _id: 'd1' }),
            expect.objectContaining({ _id: 'd2' }),
          ]),
        })
      );
    });

    it('gdy coś padnie → 500', async () => {
      const res = mockRes();
      (Property.find as unknown as jest.Mock).mockImplementationOnce(() => {
        throw new Error('boom');
      });

      await defectsFunctions.getAllDefects({ body: { userID: 'x' } } as any, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  describe('updateDefectStatus', () => {
    it('zwraca 400 przy braku danych', async () => {
      const res = mockRes();

      await defectsFunctions.updateDefectStatus({ body: {} } as any, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('zwraca 404 gdy nie znaleziono defektu', async () => {
      const res = mockRes();
      (Defect as any).findByIdAndUpdate.mockResolvedValueOnce(null);

      await defectsFunctions.updateDefectStatus(
        { body: { defectId: 'd1', status: 'w trakcie' } } as any,
        res
      );

      expect((Defect as any).findByIdAndUpdate).toHaveBeenCalledWith(
        'd1',
        { status: 'w trakcie' },
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('aktualizuje na dozwolony status i zwraca 200', async () => {
      const res = mockRes();
      (Defect as any).findByIdAndUpdate.mockResolvedValueOnce({
        _id: 'd1',
        status: 'naprawiony',
      });

      await defectsFunctions.updateDefectStatus(
        { body: { defectId: 'd1', status: 'naprawiony' } } as any,
        res
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          defect: expect.objectContaining({ _id: 'd1', status: 'naprawiony' }),
        })
      );
    });

    it('odrzuca NIE-dozwolony status → 400 (bez wywołania DB)', async () => {
      const res = mockRes();

      await defectsFunctions.updateDefectStatus(
        { body: { defectId: 'd1', status: 'invalid' } } as any,
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect((Defect as any).findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('status normalization', () => {
    it('addDefect: "in progress" -> "w trakcie"', async () => {
      const req: any = {
        body: {
          propertyId: 'p1',
          title: 'A',
          description: 'B',
          status: 'in progress',
        },
      };
      const res = mockRes();

      await defectsFunctions.addDefect(req, res);

      const constructed = (Defect as any).mock.calls[0][0];
      expect(constructed.status).toBe('w trakcie');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('updateDefectStatus: "solved" -> "naprawiony"', async () => {
      const res = mockRes();

      (Defect as any).findByIdAndUpdate.mockResolvedValueOnce({
        _id: 'd1',
        status: 'naprawiony',
      });

      await defectsFunctions.updateDefectStatus(
        { body: { defectId: 'd1', status: 'solved' } } as any,
        res
      );

      expect((Defect as any).findByIdAndUpdate).toHaveBeenCalledWith(
        'd1',
        { status: 'naprawiony' },
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          defect: expect.objectContaining({ _id: 'd1', status: 'naprawiony' }),
        })
      );
    });

    it('updateDefectStatus: nieznany status -> 400', async () => {
      const res = mockRes();

      await defectsFunctions.updateDefectStatus(
        { body: { defectId: 'd1', status: 'whatever' } } as any,
        res
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect((Defect as any).findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });
});