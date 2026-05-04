const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
app.use(cors());
app.use(express.json());

// IMPORTANT FOR RENDER
const PORT = process.env.PORT || 3001;

// DB
const db = new Database("stock.db");

// TABLES
db.prepare(`
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    currentStock INTEGER DEFAULT 0,
    fullStock INTEGER
)
`).run();

/* ---------------- API ---------------- */

// GET ITEMS
app.get("/items", (req, res) => {
    const items = db.prepare("SELECT * FROM items").all();
    res.json(items);
});

// ADD ITEM
app.post("/items", (req, res) => {
    const { name, fullStock } = req.body;

    db.prepare(`
        INSERT INTO items (name, currentStock, fullStock)
        VALUES (?, 0, ?)
    `).run(name, fullStock);

    res.json({ ok: true });
});

// UPDATE STOCK
app.patch("/items/:id", (req, res) => {
    const { delta } = req.body;

    db.prepare(`
        UPDATE items
        SET currentStock = currentStock + ?
        WHERE id = ?
    `).run(delta, req.params.id);

    res.json({ ok: true });
});

// DELETE ITEM
app.delete("/items/:id", (req, res) => {
    db.prepare("DELETE FROM items WHERE id = ?").run(req.params.id);
    res.json({ ok: true });
});

// SUMMARY
app.get("/summary", (req, res) => {
    const items = db.prepare("SELECT * FROM items").all();

    const total = items.length;
    const low = items.filter(i => i.currentStock < i.fullStock * 0.3).length;
    const full = items.filter(i => i.currentStock >= i.fullStock).length;

    const fillRate = total === 0 ? 0 :
        Math.round((items.reduce((a, b) => a + b.currentStock, 0) /
        items.reduce((a, b) => a + b.fullStock, 0)) * 100);

    res.json({ total, low, full, fillRate });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port", PORT);
});
