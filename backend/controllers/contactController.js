const Contact = require('../models/Contact');

const DEFAULT_CONTACTS = [
  { name: 'Rajesh Kumar',  phone: '9876543210', group: 'T1' },
  { name: 'Priya Sharma',  phone: '9876543211', group: 'T1' },
  { name: 'Amit Patel',    phone: '9876543212', group: 'T1' },
  { name: 'Sunita Verma',  phone: '9876543213', group: 'T1' },
  { name: 'Vikram Singh',  phone: '9876543214', group: 'T1' },
  { name: 'Deepak Gupta',  phone: '9876543215', group: 'T2' },
  { name: 'Kavita Rao',    phone: '9876543216', group: 'T2' },
  { name: 'Suresh Nair',   phone: '9876543217', group: 'T2' },
  { name: 'Anita Joshi',   phone: '9876543218', group: 'T2' },
  { name: 'Ravi Tiwari',   phone: '9876543219', group: 'T2' },
  { name: 'Pooja Mehta',   phone: '9876543220', group: 'Ulve' },
  { name: 'Sanjay Iyer',   phone: '9876543221', group: 'Ulve' },
  { name: 'Neha Pillai',   phone: '9876543222', group: 'Ulve' },
  { name: 'Arjun Reddy',   phone: '9876543223', group: 'Ulve' },
  { name: 'Meena Khanna',  phone: '9876543224', group: 'Ulve' },
];

// GET /api/v1/contacts  — optionally ?group=T1
exports.getContacts = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.group) query.group = req.query.group;

    let contacts = await Contact.find(query).sort({ group: 1, createdAt: 1 });

    // Seed defaults on first ever load
    if (contacts.length === 0 && !req.query.group) {
      await Contact.insertMany(DEFAULT_CONTACTS);
      contacts = await Contact.find({}).sort({ group: 1, createdAt: 1 });
    }

    res.json(contacts.map(c => c.toJSON()));
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/contacts
exports.createContact = async (req, res, next) => {
  try {
    const { name, phone, group } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
    if (!phone?.trim()) return res.status(400).json({ message: 'Phone is required' });
    if (!['T1', 'T2', 'Ulve'].includes(group)) return res.status(400).json({ message: 'Invalid group' });

    const contact = await Contact.create({ name: name.trim(), phone: phone.trim(), group });
    res.status(201).json(contact.toJSON());
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/contacts/:id
exports.updateContact = async (req, res, next) => {
  try {
    const { name, phone, group } = req.body;
    const update = {};
    if (name?.trim()) update.name = name.trim();
    if (phone?.trim()) update.phone = phone.trim();
    if (group && ['T1', 'T2', 'Ulve'].includes(group)) update.group = group;

    const contact = await Contact.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!contact) return res.status(404).json({ message: 'Contact not found' });
    res.json(contact.toJSON());
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/contacts/:id
exports.deleteContact = async (req, res, next) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Contact not found' });
    res.json({ message: 'Contact deleted' });
  } catch (err) {
    next(err);
  }
};
