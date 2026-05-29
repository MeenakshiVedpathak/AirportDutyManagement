const City = require('../models/City');

const DEFAULT_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat',
  'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal',
  'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra',
  'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi',
];

exports.getCities = async (req, res, next) => {
  try {
    let cities = await City.find({ isActive: true }).sort({ name: 1 });
    // Seed defaults if collection is empty
    if (cities.length === 0) {
      await City.insertMany(DEFAULT_CITIES.map(name => ({ name })));
      cities = await City.find({ isActive: true }).sort({ name: 1 });
    }
    res.json(cities.map(c => c.toJSON()));
  } catch (err) {
    next(err);
  }
};

exports.createCity = async (req, res, next) => {
  try {
    const city = await City.create({ name: req.body.name });
    res.status(201).json(city.toJSON());
  } catch (err) {
    next(err);
  }
};

exports.updateCity = async (req, res, next) => {
  try {
    const city = await City.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name },
      { new: true }
    );
    if (!city) return res.status(404).json({ message: 'City not found' });
    res.json(city.toJSON());
  } catch (err) {
    next(err);
  }
};

exports.toggleCity = async (req, res, next) => {
  try {
    const city = await City.findById(req.params.id);
    if (!city) return res.status(404).json({ message: 'City not found' });
    city.isActive = !city.isActive;
    await city.save();
    res.json(city.toJSON());
  } catch (err) {
    next(err);
  }
};
