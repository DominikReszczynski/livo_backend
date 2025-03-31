import mongoose from "mongoose";
import { CohereClientV2 } from "cohere-ai";
import Expanse from "../models/expanse";
const cohere = new CohereClientV2({
  token: "lvFN1NxrOnhFyleag55FMRqiaHQYVvZsQylwqDZn",
});
var message: string =
  "Analyze the following list of expenses and provide a short (maximum 10 sentences) response suggesting practical ways to optimize and reduce spending. Focus on identifying categories or specific areas where savings are possible, and propose actionable steps to cut costs while maintaining essential needs. Here is the list of expenses: ";

const dasboardFunctions = {
  async chatWithCohere(req: any, res: any) {
    console.log(req.body.userID);

    try {
      // Walidacja userID
      const authorId = new mongoose.Types.ObjectId(req.body.userID);

      // Pobranie wydatków użytkownika
      const expenses = await Expanse.find({ authorId: authorId });

      if (!expenses || expenses.length === 0) {
        return res.status(404).send({
          success: false,
          message: "No expenses found for the given user.",
        });
      }

      // Tworzenie wiadomości na podstawie wydatków
      const message = `Analyze the following list of expenses and provide a short response suggesting practical ways to optimize and reduce spending. Focus on identifying categories or specific areas where savings are possible, and propose actionable steps to cut costs while maintaining essential needs. Here is the list of expenses: ${JSON.stringify(
        expenses
      )}`;

      console.log("Message sent to Cohere API:", message);

      // Wywołanie Cohere API
      const response = await cohere.chat({
        model: "command-r-plus",
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      });

      if (response?.message?.content) {
        const responseMessage = response.message.content;
        console.log("Response from Cohere:", responseMessage);

        return res.status(200).send({
          success: true,
          text: responseMessage,
        });
      } else {
        return res.status(500).send({
          success: false,
          message: "Cohere API did not return a valid response.",
        });
      }
    } catch (error) {
      console.error("Error communicating with Cohere API:", error);
      return res.status(500).send({
        success: false,
        message: "An error occurred while processing your request.",
      });
    }
  },
};

module.exports = dasboardFunctions;
