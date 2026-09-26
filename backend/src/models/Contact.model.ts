import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContact extends Document {
  name: string;
  email: string;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    name: { 
      type: String, 
      required: true 
    },
    
    email: { 
      type: String, 
      required: true 
    },

    message: {
      type: String
    }
  },
  { timestamps: true }
);

export const Contact: Model<IContact> = mongoose.model<IContact>('Contact', ContactSchema);
