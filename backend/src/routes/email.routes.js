import express from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  deleteEmail,
  generateEmail,
  generateBatchEmails,
  getEmailById,
  getUsageSummary,
  getUserEmailHistory,
  markEmailSent,
  unmarkEmailSent,
  updateEmail,
  updateEmailHistory,
  startBatchJob,
  getBatchJobStatus,
  getBatchJobs
} from "../controllers/email.controller.js";
import { uploadImage, handleMulterError } from "../middlewares/upload.middleware.js";

const router = express.Router()

router.route('/generate-email').post(verifyJWT, uploadImage, handleMulterError, generateEmail)

router.route('/generate-batch').post(verifyJWT, generateBatchEmails)

router.route('/batch-jobs')
  .post(verifyJWT, startBatchJob)
  .get(verifyJWT, getBatchJobs)

router.route('/batch-jobs/:jobId').get(verifyJWT, getBatchJobStatus)

router.route('/update-email').post(verifyJWT, uploadImage, handleMulterError, updateEmail)

router.route('/get-user-email-history').get(verifyJWT, getUserEmailHistory)

router.route('/update-email-history').patch(verifyJWT, uploadImage, handleMulterError, updateEmailHistory)

router.route('/delete-email').delete(verifyJWT, deleteEmail)

router.route('/usage').get(verifyJWT, getUsageSummary)

router.route('/:id/mark-sent').patch(verifyJWT, markEmailSent)

router.route('/:id/unmark-sent').patch(verifyJWT, unmarkEmailSent)

router.route('/:id').get(verifyJWT, getEmailById)

export default router;