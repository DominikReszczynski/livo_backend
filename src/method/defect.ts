import Defect from "../models/defect";
import Property from "../models/properties";

const defectsFunctions = {
  // 🧾 Dodaj defekt
  async addDefect(req: any, res: any) {
    console.log("➡️ Dodaj defekt:", req.body);
    try {
      const { propertyId, title, description, status, imageFilenames } = req.body;

      const newDefect = new Defect({
        propertyId,
        title,
        description,
        status,
        imageFilenames,
      });

      await newDefect.save();
      return res.status(201).send({ success: true, defect: newDefect });
    } catch (e) {
      console.error("❌ Add defect error:", e);
      return res.status(500).send({ success: false });
    }
  },
// 🧾 Pobierz wszystkie defekty powiązane z użytkownikiem
  async getAllDefects(req: any, res: any) {
    try {
      const { userID } = req.body;
      console.log("➡️ Pobieranie defektów dla usera:", userID);

      // 🏠 Znajdź mieszkania, w których user jest właścicielem lub najemcą
      const userProperties = await Property.find({
        $or: [{ ownerId: userID }, { tenantId: userID }],
      }).select("_id");

      const propertyIds = userProperties.map((p) => p._id);

      // 🧩 Pobierz wszystkie defekty związane z tymi mieszkaniami
      const defects = await Defect.find({
        propertyId: { $in: propertyIds },
      }).populate('propertyId', 'name location'); // opcjonalne: żeby zwrócić info o mieszkaniu

      return res.status(200).send({ success: true, defects });
    } catch (e) {
      console.error("❌ getAllDefects error:", e);
      return res.status(500).send({ success: false });
    }
  },
};

export default defectsFunctions;