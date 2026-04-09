const db = require('../config/db');

const ContactController = {
  async submit(req, res) {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Name, email, subject and message are required' });
    }

    await db.prepare('INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)')
      .run(name, email, phone, subject, message);

    res.status(201).json({ message: 'Message sent successfully' });
  },

  async getOperators(req, res) {
    const operators = await db.prepare("SELECT * FROM operators WHERE status = 'active' ORDER BY service_type, name").all();
    res.json(operators);
  },
};

module.exports = ContactController;
