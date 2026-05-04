const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database
const db = new Database("stockpilot.db");

// Create table
db.prepare(`
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  fullStock INTEGER,
  currentStock INTEGER DEFAULT 0,
  createdAt TEXT,
  updatedAt TEXT
)
`).run();

// HEALTH CHECK
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// GET ALL ITEMS
app.get("/items", (req, res) => {
  const items = db.prepare("SELECT * FROM items").all();
  res.json(items);
});

// CREATE ITEM
app.post("/items", (req, res) => {
  const { name, fullStock } = req.body;

  if (!name || !fullStock) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO items (name, fullStock, currentStock, createdAt, updatedAt)
      VALUES (?, ?, 0, datetime('now'), datetime('now'))
    `);

    stmt.run(name, fullStock);

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE STOCK (+/-)
app.patch("/items/:id", (req, res) => {
  const { id } = req.params;
  const { delta } = req.body;

  const item = db.prepare("SELECT * FROM items WHERE id = ?").get(id);

  if (!item) return res.status(404).json({ error: "Not found" });

  let newStock = item.currentStock + delta;

  if (newStock < 0) newStock = 0;
  if (newStock > item.fullStock) newStock = item.fullStock;

  db.prepare(`
    UPDATE items
    SET currentStock = ?, updatedAt = datetime('now')
    WHERE id = ?
  `).run(newStock, id);

  res.json({ success: true });
});

// DELETE ITEM
app.delete("/items/:id", (req, res) => {
  const { id } = req.params;

  db.prepare("DELETE FROM items WHERE id = ?").run(id);

  res.json({ success: true });
});

// SUMMARY
app.get("/summary", (req, res) => {
  const items = db.prepare("SELECT * FROM items").all();

  let total = items.length;
  let full = 0;
  let low = 0;
  let totalMissing = 0;

  items.forEach(i => {
    const percent = i.currentStock / i.fullStock;

    if (percent >= 1) full++;
    else if (percent < 0.4) low++;

    totalMissing += (i.fullStock - i.currentStock);
  });

  res.json({
    total,
    full,
    low,
    totalMissing
  });
});

// START SERVER
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
