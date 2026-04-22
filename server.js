const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-super-secret-key';

app.use(cors());
app.use(express.json());

// Mocked in-memory data store
let items = [
  { id: 1, name: 'Laptop', category: 'Electronics' },
  { id: 2, name: 'Notebook', category: 'Stationery' },
  { id: 3, name: 'Coffee Mug', category: 'Kitchen' }
];
let nextId = 4;

// 🔐 Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

// 🔑 Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'Admin@123') {
    const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, {
      expiresIn: '1h'
    });

    return res.json({ token });
  }

  return res.status(401).json({ message: 'Invalid credentials' });
});

// � Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// �📦 Get items (with filters)
app.get('/api/items', authenticateToken, (req, res) => {
  const { name, category, id } = req.query;
  let filteredItems = items;

  if (id) {
    const parsedId = Number(id);
    filteredItems = Number.isNaN(parsedId)
      ? []
      : filteredItems.filter((item) => item.id === parsedId);
  }

  if (name) {
    const normalizedName = String(name).toLowerCase();
    filteredItems = filteredItems.filter((item) =>
      item.name.toLowerCase().includes(normalizedName)
    );
  }

  if (category) {
    const normalizedCategory = String(category).toLowerCase();
    filteredItems = filteredItems.filter((item) =>
      item.category.toLowerCase().includes(normalizedCategory)
    );
  }

  res.json(filteredItems);
});

// 📦 Get item by ID
app.get('/api/items/:id', authenticateToken, (req, res) => {
  const id = Number(req.params.id);
  const item = items.find((entry) => entry.id === id);

  if (!item) {
    return res.status(404).json({ message: 'Item not found' });
  }

  return res.json(item);
});

// ➕ Create item
app.post('/api/items', authenticateToken, (req, res) => {
  const { name, category } = req.body;

  if (!name || !category) {
    return res.status(400).json({ message: 'name and category are required' });
  }

  const newItem = { id: nextId++, name, category };
  items.push(newItem);

  return res.status(201).json(newItem);
});

// ✏️ Update item (PUT)
app.put('/api/items/:id', authenticateToken, (req, res) => {
  const id = Number(req.params.id);
  const { name, category } = req.body;

  const index = items.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ message: 'Item not found' });
  }

  if (!name || !category) {
    return res.status(400).json({ message: 'name and category are required' });
  }

  items[index] = { id, name, category };
  return res.json(items[index]);
});

// 🗑 Delete item
app.delete('/api/items/:id', authenticateToken, (req, res) => {
  const id = Number(req.params.id);
  const index = items.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ message: 'Item not found' });
  }

  const deleted = items.splice(index, 1)[0];
  return res.json(deleted);
});

// 🔧 Patch item
app.patch('/api/items/:id', authenticateToken, (req, res) => {
  const id = Number(req.params.id);
  const { name, category } = req.body;

  const index = items.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ message: 'Item not found' });
  }

  if (name) items[index].name = name;
  if (category) items[index].category = category;

  return res.json(items[index]);
});


const projectPath = path.join(
  process.env.HOME || '',
  'Desktop',
  'angularTraining',
  'dist',
  'angularTraining',
  'browser'
);

if (fs.existsSync(projectPath) && process.env.NODE_ENV !== 'ci') {
  app.use(express.static(projectPath));

  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(projectPath, 'index.html'));
  });
}

// 🧩 OPTIONS handler
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 🚀 Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${port}`);
});