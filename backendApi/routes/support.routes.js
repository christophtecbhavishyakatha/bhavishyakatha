import express from "express";
import * as supportController from "../controllers/support.controller.js";

const router = express.Router();

// Create Support Ticket
router.post("/create", supportController.createTicket);

// Get all tickets for a user
router.get("/tickets/:userId", supportController.getTickets);

// Get single ticket details
router.get("/ticket/:ticketId", supportController.getTicketById);

// Update ticket status (Admin only)
router.patch("/status/:ticketId", supportController.updateTicketStatus);

// Get ticket statistics (Admin)
router.get("/statistics", supportController.getStatistics);

// Delete ticket (Admin only)
router.delete("/ticket/:ticketId", supportController.deleteTicket);

export default router;
