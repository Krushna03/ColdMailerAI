import { Request, Response } from "express";
import { Contact } from "../models/Contact.model.js";

interface BuildStoredMessageParams {
  message: string;
  company?: string;
  monthlyVolume?: string;
  source?: string;
}

const buildStoredMessage = ({ message, company, monthlyVolume, source }: BuildStoredMessageParams): string => {
  const parts: string[] = [];
  if (source === "enterprise") parts.push("[Enterprise inquiry]");
  if (company) parts.push(`Company: ${company}`);
  if (monthlyVolume) parts.push(`Estimated monthly volume: ${monthlyVolume}`);
  if (parts.length) parts.push("");
  parts.push(message);
  return parts.join("\n");
};

const contact = async (req: Request, res: Response) => {
  const {
    name,
    email,
    message,
    company = "",
    monthlyVolume = "",
    source = "contact",
  } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  const storedMessage = buildStoredMessage({
    message,
    company,
    monthlyVolume,
    source,
  });

  try {
    const newContactMessage = await Contact.create({
      name,
      email,
      message: storedMessage,
    });

    if (!newContactMessage) {
      return res.status(500).json({
        success: false,
        message: "Could not save your message. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Message submitted successfully.",
    });
  } catch (error) {
    console.error("Error saving contact message:", error);
    return res.status(500).json({
      success: false,
      message: "Could not save your message. Please try again later.",
    });
  }
};

export { contact };
