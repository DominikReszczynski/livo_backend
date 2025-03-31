import mongoose from "mongoose";
import Expanse, { IExpanse } from "../models/expanse";
import moment from "moment";
import dayjs from "dayjs";

var expansesFunctions = {
  async addExpanse(req: any, res: any) {
    console.log("zaczynam dodawać");
    try {
      let expanseId = new mongoose.Types.ObjectId();
      let newExpanse = new Expanse(req.body.expanse);
      newExpanse._id = expanseId;
      let authorId = newExpanse.authorId;
      newExpanse.authorId = new mongoose.Types.ObjectId(authorId);

      await newExpanse.save();
      newExpanse = newExpanse.toObject();
      return res.status(200).send({ success: true, expanse: newExpanse });
    } catch (e) {
      console.log(e);
      return res.status(500).send({ success: false });
    }
  },

  async removeExpanse(req: any, res: any) {
    console.log("zaczynam removeExpanse");
    console.log(req.body.expanseId);
    try {
      const expanseId = new mongoose.Types.ObjectId(req.body.expanseId);
      const result = await Expanse.findByIdAndRemove(expanseId);

      if (!result) {
        return res
          .status(404)
          .send({ success: false, message: "Expanse not found" });
      }

      return res.status(200).send({ success: true });
    } catch (e) {
      console.log(e);
      return res.status(500).send({ success: false });
    }
  },

  async getAllExpansesByAuthor(req: any, res: any) {
    console.log(`Pobieram wydatki dla autora o ID ${req.body.authorId}`);
    try {
      const authorId = new mongoose.Types.ObjectId(req.body.authorId);

      // Pobieranie wydatków z bazy
      const expanses = await Expanse.find({ authorId: authorId });

      return res.status(200).send({ success: true, expanses });
    } catch (e) {
      console.log(e);
      return res.status(500).send({ success: false });
    }
  },

  async getAllExpansesByAuthorExcludingCurrentMonth(req: any, res: any) {
    console.log(`Pobieram wydatki dla autora o ID ${req.body.authorId}`);
    try {
      const authorId = new mongoose.Types.ObjectId(req.body.authorId);

      const now = moment();
      const startOfMonth = now.startOf("month").toDate();
      const endOfMonth = now.endOf("month").toDate();

      const expanses = await Expanse.find({
        authorId: authorId,
        $or: [
          { createdAt: { $lt: startOfMonth } },
          { createdAt: { $gt: endOfMonth } },
        ],
      });

      return res.status(200).send({ success: true, expanses });
    } catch (e) {
      console.error("Błąd podczas pobierania wydatków:", e);
      return res.status(500).send({ success: false });
    }
  },

  async getExpansesGroupedByMonth(req: any, res: any) {
    console.log(
      `Pobieram i grupuję wydatki dla autora o ID ${req.body.authorId} bez wydatków z bieżącego miesiąca`
    );
    try {
      const authorId = new mongoose.Types.ObjectId(req.body.authorId);

      const expanses = await Expanse.find({ authorId: authorId });

      const currentYear = moment().year();
      const currentMonth = moment().month();

      const filteredExpanses = expanses.filter((expanse) => {
        const createdAt = moment(expanse.createdAt);
        return !(
          createdAt.year() === currentYear && createdAt.month() === currentMonth
        );
      });

      const groupedExpanses = filteredExpanses.reduce<
        Record<string, IExpanse[]>
      >((acc, expanse) => {
        const createdAt = moment(expanse.createdAt);
        const yearMonth = createdAt.format("YYYY-MM");

        if (!acc[yearMonth]) {
          acc[yearMonth] = [];
        }
        acc[yearMonth].push(expanse);

        return acc;
      }, {});

      const groupedArray = Object.entries(groupedExpanses).map(
        ([key, values]) => ({
          monthYear: key,
          expanses: values,
        })
      );

      console.log(groupedArray);
      return res
        .status(200)
        .send({ success: true, groupedExpanses: groupedArray });
    } catch (e) {
      console.error("Błąd podczas grupowania wydatków:", e);
      return res.status(500).send({ success: false });
    }
  },

  async getExpansesByAuthorForCurrentMonth(req: any, res: any) {
    console.log(`Pobieram wydatki dla autora o ID ${req.body.authorId}`);

    try {
      const authorId = new mongoose.Types.ObjectId(req.body.authorId);

      const now = moment();
      const startOfMonth = now.startOf("month").toDate();
      const endOfMonth = now.endOf("month").toDate();

      const expanses = await Expanse.find({
        authorId: authorId,
        createdAt: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      });

      if (expanses.length > 0) {
        return res.status(200).send({ success: true, expanses });
      } else {
        return res.status(404).send({
          success: true,
          message: "No expenses found for the current month.",
        });
      }
    } catch (e) {
      console.error("Błąd podczas pobierania wydatków:", e);
      return res.status(500).send({ success: false });
    }
  },

  async getExpensesGroupedByCategory(req: any, res: any): Promise<Response> {
    console.log("Pobieram wydatki dla użytkownika i grupuję według kategorii");

    try {
      const { authorId, monthYear }: { authorId: string; monthYear: string } =
        req.body;

      if (!authorId || !monthYear) {
        return res.status(400).send({
          success: false,
          message: "Brakuje wymaganych parametrów (authorId, monthYear).",
        });
      }

      const [year, month] = monthYear.split("-");
      if (!year || !month || isNaN(Number(year)) || isNaN(Number(month))) {
        return res.status(400).send({
          success: false,
          message: "Nieprawidłowy format miesiąca. Oczekiwany format: YYYY-MM.",
        });
      }

      const startOfMonth = dayjs(`${year}-${month}-01`)
        .startOf("month")
        .toDate();
      const endOfMonth = dayjs(`${year}-${month}-01`).endOf("month").toDate();

      if (isNaN(startOfMonth.getTime()) || isNaN(endOfMonth.getTime())) {
        return res.status(400).send({
          success: false,
          message: "Nieprawidłowy zakres dat.",
        });
      }

      const authorObjectId = new mongoose.Types.ObjectId(authorId);

      const expenses: IExpanse[] = await Expanse.find({
        authorId: authorObjectId,
        createdAt: {
          $gte: startOfMonth,
          $lt: endOfMonth,
        },
      });

      const groupedByCategory: Record<string, number> = expenses.reduce(
        (acc: Record<string, number>, expanse: IExpanse) => {
          const category = expanse.category;
          const amount = expanse.amount;

          if (!acc[category]) {
            acc[category] = 0;
          }

          acc[category] += amount;
          return acc;
        },
        {}
      );

      console.log(groupedByCategory);

      return res.status(200).send({ success: true, groupedByCategory });
    } catch (error) {
      console.error("Błąd podczas grupowania wydatków:", error);
      return res.status(500).send({
        success: false,
        message: "Wystąpił błąd na serwerze.",
      });
    }
  },
};

module.exports = expansesFunctions;
