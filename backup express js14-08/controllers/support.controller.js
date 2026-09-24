import db from "../config/db.js";
import validator from "validator";

// Create Support Ticket

export const createTicket = async (req, res) => {
  try {
    let { astrologer_id, issue_type, details, screenshot, user_type } = req.body;

    // ================= BASIC VALIDATION =================
    if (!astrologer_id || !issue_type || !details) {
      return res.status(400).json({
        status: false,
        message: "Astrologer ID, issue type, and details are required",
      });
    }

    // Trim and limit details to 500 chars
    details = details.trim().slice(0, 500);

    if (details.length < 10) {
      return res.status(400).json({
        status: false,
        message: "Details must be at least 10 characters long",
      });
    }

    // ================= ISSUE TYPE VALIDATION =================
    const validIssueTypes = ["payment", "technical", "account", "booking", "profile", "other"];
    if (!validIssueTypes.includes(issue_type)) {
      return res.status(400).json({
        status: false,
        message: "Invalid issue type",
      });
    }

    // ================= SANITIZE DETAILS =================
    // Escape HTML to prevent XSS
    details = validator.escape(details);

    // Optional: also remove any extra whitespace
    details = details.replace(/\s+/g, " ");

    // ================= CREATE TICKET =================
    const ticketId = `TKT${Date.now()}${Math.floor(Math.random() * 1000)}`;

    await db.query(
      `INSERT INTO support_tickets 
       (id, astrologer_id, issue_type, details, screenshot, status, created_at, updated_at, customer_type)
       VALUES (?, ?, ?, ?, ?, 'open', NOW(), NOW(), ?)`,
      [ticketId, astrologer_id, issue_type, details, screenshot || null, user_type]
    );

    res.json({
      status: true,
      message: "Support ticket created successfully",
      data: {
        ticket_id: ticketId,
        status: "open",
      },
    });
  } catch (error) {
    console.error("Error creating support ticket:", error);
    res.status(500).json({
      status: false,
      message: "Failed to create support ticket",
    });
  }
};


// Get All Tickets for a User
export const getTickets = async (req, res) => {
  try {
    const { userId } = req.params;
  const { userType } = req.query;

    if (!userId) {
      return res.status(400).json({
        status: false,
        message: "Astrologer ID is required",
      });
    }

    const [tickets] = await db.query(
      `SELECT * FROM support_tickets 
       WHERE astrologer_id = ? AND customer_type= ?
       ORDER BY created_at DESC`,
      [userId, userType]
    );

    return res.json({
      status: true,
      data: tickets,
    });

  } catch (error) {
    console.error("❌ getTickets error:", error); // IMPORTANT
    return res.status(500).json({
      status: false,
      message: "Failed to fetch support tickets",
    });
  }
};


// Get Single Ticket
export const getTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { astrologer_id } = req.body;

    const [rows] = await db.query(
      `SELECT * FROM support_tickets 
       WHERE id = ? AND astrologer_id = ?`,
      [ticketId, astrologer_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Ticket not found",
      });
    }

    res.json({
      status: true,
      data: rows[0],
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to fetch ticket",
    });
  }
};

// Update Ticket Status (Admin)
export const updateTicketStatus = async (req, res) => {
  try {
    const { ticket_id, status, response } = req.body;

    const validStatuses = ["open", "in-progress", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: false,
        message: "Invalid status",
      });
    }

    await db.query(
      `UPDATE support_tickets 
       SET status = ?, response = ?, updated_at = NOW(),
       resolved_at = IF(? IN ('resolved','closed'), NOW(), resolved_at)
       WHERE id = ?`,
      [status, response || null, status, ticket_id]
    );

    res.json({
      status: true,
      message: "Ticket status updated",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to update ticket",
    });
  }
};

// Statistics
export const getStatistics = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        COUNT(*) total,
        SUM(status='open') open,
        SUM(status='in-progress') progress,
        SUM(status='resolved') resolved,
        SUM(status='closed') closed
       FROM support_tickets`
    );

    res.json({
      status: true,
      data: rows[0],
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to fetch statistics",
    });
  }
};

// Delete Ticket
export const deleteTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const [result] = await db.query(
      "DELETE FROM support_tickets WHERE id = ?",
      [ticketId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: false,
        message: "Ticket not found",
      });
    }

    res.json({
      status: true,
      message: "Ticket deleted",
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to delete ticket",
    });
  }
};
