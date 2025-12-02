import express from "express";
import { ContactController } from "../controllers/contact.controller";
import {
  CsvUploadController,
  upload,
} from "../controllers/csvUpload.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();

/**
 * @route GET /api/contacts
 * @desc Get all contacts for the authenticated user
 * @access Private
 */
router.get("/", authenticate, asyncHandler(ContactController.getAll));

/**
 * @route GET /api/contacts/:id
 * @desc Get a contact by ID
 * @access Private
 */
router.get("/:id", authenticate, asyncHandler(ContactController.getById));

/**
 * @route POST /api/contacts
 * @desc Create a new contact
 * @access Private
 */
router.post("/", authenticate, asyncHandler(ContactController.create));

/**
 * @route PUT /api/contacts/:id
 * @desc Update a contact
 * @access Private
 */
router.put("/:id", authenticate, asyncHandler(ContactController.update));

/**
 * @route DELETE /api/contacts/:id
 * @desc Delete a contact
 * @access Private
 */
router.delete("/:id", authenticate, asyncHandler(ContactController.delete));

/**
 * @route POST /api/contacts/import/csv
 * @desc Import contacts from CSV file
 * @access Private
 */
router.post(
  "/import/csv",
  authenticate,
  upload.single("file"),
  asyncHandler(CsvUploadController.importCsvContacts)
);

/**
 * @route POST /api/contacts/import/preview
 * @desc Preview CSV import data
 * @access Private
 */
router.post(
  "/import/preview",
  authenticate,
  upload.single("file"),
  asyncHandler(CsvUploadController.previewCsvUpload)
);

/**
 * @route POST /api/contacts/import/bulk
 * @desc Bulk import contacts with progress tracking
 * @access Private
 */
router.post(
  "/import/bulk",
  authenticate,
  upload.single("file"),
  asyncHandler(CsvUploadController.bulkImportWithProgress)
);

/**
 * @route GET /api/contacts/import/template
 * @desc Download CSV template for contacts import
 * @access Private
 */
router.get(
  "/import/template",
  authenticate,
  asyncHandler(CsvUploadController.downloadCsvTemplate)
);

/**
 * @route GET /api/contacts/import/columns
 * @desc Get supported CSV columns
 * @access Private
 */
router.get(
  "/import/columns",
  authenticate,
  asyncHandler(CsvUploadController.getSupportedColumns)
);

export default router;
