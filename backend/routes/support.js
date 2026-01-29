const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const mongoose = require('mongoose');

// Support Ticket Schema
const supportTicketSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['general', 'payment', 'appointment', 'technical', 'other'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  replies: [{
    message: String,
    isAdmin: Boolean,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SUPPORT_EMAIL,
      pass: process.env.EMAIL_PASSWORD // App password for Gmail
    }
  });
};

// @route   POST /api/support/ticket
// @desc    Create a new support ticket
// @access  Private
router.post('/ticket', protect, [
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('category').optional().isIn(['general', 'payment', 'appointment', 'technical', 'other'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { subject, message, category } = req.body;

    // Create support ticket in database
    const ticket = await SupportTicket.create({
      user: req.user._id,
      subject,
      message,
      category: category || 'general'
    });

    // Send email notification to support
    try {
      const transporter = createTransporter();

      await transporter.sendMail({
        from: process.env.SUPPORT_EMAIL,
        to: process.env.SUPPORT_EMAIL,
        subject: `[Kisan App Support] ${subject} - Ticket #${ticket._id.toString().slice(-6).toUpperCase()}`,
        html: `
          <h2>New Support Request</h2>
          <p><strong>Ticket ID:</strong> ${ticket._id.toString().slice(-6).toUpperCase()}</p>
          <p><strong>From:</strong> ${req.user.name} (${req.user.email})</p>
          <p><strong>Phone:</strong> ${req.user.phone}</p>
          <p><strong>User Type:</strong> ${req.user.userType}</p>
          <p><strong>Category:</strong> ${category || 'General'}</p>
          <hr>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
          <hr>
          <p><small>Sent from Kisan App at ${new Date().toLocaleString('en-IN')}</small></p>
        `
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Continue even if email fails - ticket is still created
    }

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: {
        _id: ticket._id,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.createdAt
      }
    });
  } catch (error) {
    console.error('Support ticket error:', error);
    res.status(500).json({ message: 'Failed to create support ticket', error: error.message });
  }
});

// @route   GET /api/support/tickets
// @desc    Get all tickets for logged in user
// @access  Private
router.get('/tickets', protect, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tickets', error: error.message });
  }
});

// @route   GET /api/support/tickets/:id
// @desc    Get single ticket
// @access  Private
router.get('/tickets/:id', protect, async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch ticket', error: error.message });
  }
});

// @route   POST /api/support/tickets/:id/reply
// @desc    Add reply to a ticket
// @access  Private
router.post('/tickets/:id/reply', protect, [
  body('message').trim().notEmpty().withMessage('Message is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.replies.push({
      message: req.body.message,
      isAdmin: false
    });

    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      ticket.status = 'open';
    }

    await ticket.save();

    // Send email notification
    try {
      const transporter = createTransporter();

      await transporter.sendMail({
        from: process.env.SUPPORT_EMAIL,
        to: process.env.SUPPORT_EMAIL,
        subject: `[Reply] Ticket #${ticket._id.toString().slice(-6).toUpperCase()} - ${ticket.subject}`,
        html: `
          <h2>New Reply on Support Ticket</h2>
          <p><strong>Ticket ID:</strong> ${ticket._id.toString().slice(-6).toUpperCase()}</p>
          <p><strong>From:</strong> ${req.user.name} (${req.user.email})</p>
          <hr>
          <p><strong>Reply:</strong></p>
          <p>${req.body.message}</p>
        `
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.json({
      success: true,
      message: 'Reply added successfully',
      ticket
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add reply', error: error.message });
  }
});

// @route   POST /api/support/quick-contact
// @desc    Quick contact form (without account)
// @access  Public
router.post('/quick-contact', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid phone number is required'),
  body('message').trim().notEmpty().withMessage('Message is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, message, subject } = req.body;

    // Send email
    try {
      const transporter = createTransporter();

      await transporter.sendMail({
        from: process.env.SUPPORT_EMAIL,
        to: process.env.SUPPORT_EMAIL,
        replyTo: email,
        subject: `[Kisan App Contact] ${subject || 'General Inquiry'} from ${name}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <hr>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
          <hr>
          <p><small>Sent from Kisan App Contact Form at ${new Date().toLocaleString('en-IN')}</small></p>
        `
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      return res.status(500).json({ message: 'Failed to send message. Please try again.' });
    }

    res.json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
});

module.exports = router;
