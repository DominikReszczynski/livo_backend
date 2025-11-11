import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { propertiesFunctions } from '../../src/method/properties'; 

// Mock modelu Mongoose używanego w funkcji
jest.mock('../../src/models/properties', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));
import Property from '../../src/models/properties';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.post('/property/getAllByOwner', propertiesFunctions.getAllPropertiesByOwner);
  return app;
}

describe('getAllPropertiesByOwner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('zwraca 400 gdy brak userID w body', async () => {
    const app = makeApp();

    const res = await request(app)
      .post('/property/getAllByOwner')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: expect.stringContaining('Brakuje'),
    });
    expect(Property.find).not.toHaveBeenCalled();
  });

  it('zwraca 200 i listę properties dla poprawnego userID', async () => {
    const app = makeApp();
    const ownerId = new mongoose.Types.ObjectId().toHexString();

    (Property.find as jest.Mock).mockResolvedValueOnce([
      { _id: 'p1', ownerId, name: 'Mieszkanie 1' },
      { _id: 'p2', ownerId, name: 'Mieszkanie 2' },
    ]);

    const res = await request(app)
      .post('/property/getAllByOwner')
      .send({ userID: ownerId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.properties)).toBe(true);
    expect(res.body.properties).toHaveLength(2);

    // asercja, że find dostał ObjectId tego właściciela
    expect(Property.find).toHaveBeenCalledTimes(1);
    const queryArg = (Property.find as jest.Mock).mock.calls[0][0];
    expect(String(queryArg.ownerId)).toBe(ownerId);
  });
});