import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Defect from '../../src/models/defect';

describe('Defect model (Mongoose)', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'test' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  afterEach(async () => {
    await Defect.deleteMany({});
  });

  it('wymaga propertyId, title, description', async () => {
    const d = new Defect({});
    await expect(d.save()).rejects.toThrow(); // ValidationError
  });

  it('ustawia domyślny status = "nowy"', async () => {
    const d = new Defect({
      propertyId: new mongoose.Types.ObjectId(),
      title: 'Pęknięcie',
      description: 'Mała rysa',
    });
    const saved = await d.save();
    expect(saved.status).toBe('nowy');
  });

  it('odrzuca status spoza enum', async () => {
    const d = new Defect({
      propertyId: new mongoose.Types.ObjectId(),
      title: 'Coś',
      description: 'Opis',
      status: 'invalid',
    });
await expect(d.save()).rejects.toThrow(/not a valid enum/i);
  });

  it('akceptuje dozwolone statusy i zapisuje timestamps', async () => {
    const d = await new Defect({
      propertyId: new mongoose.Types.ObjectId(),
      title: 'Zamek',
      description: 'Nie domyka się',
      status: 'w trakcie',
      imageFilenames: ['a.jpg', 'b.png'],
    }).save();

    expect(d.status).toBe('w trakcie');
    expect(Array.isArray(d.imageFilenames)).toBe(true);
    expect(d.createdAt).toBeInstanceOf(Date);
    expect(d.updatedAt).toBeInstanceOf(Date);
  });
});
