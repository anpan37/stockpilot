const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3001;

/* ---------- MIDDLEWARE ---------- */
app.use(cors());
app.use(express.json());

/* ✅ SERVE FRONTEND (FIXES "Cannot GET /") */
app.use(express.static(path.join(__dirname, "public")));

/* ---------- SIMPLE JSON DATABASE ---------- */
const DB_FILE = "data.json";

/* create file if not exists */
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ items: [] }, null, 2));
}

function readDB() {
    return JSON.parse(fs.readFileSync(DB_FILE));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

/* ---------- ROUTES ---------- */

/* GET ALL ITEMS */
app.get("/items", (req, res) => {
    const db = readDB();
    res.json(db.items);
});

/* ADD ITEM */
app.post("/items", (req, res) => {
    const db = readDB();

    const newItem = {
        id: Date.now(),
        name: req.body.name,
        currentStock: 0,
        fullStock: req.body.fullStock
    };

    db.items.push(newItem);
    writeDB(db);

    res.json({ ok: true });
});

/* UPDATE STOCK (+1 / -1) */
app.patch("/items/:id", (req, res) => {
    const db = readDB();

    const item = db.items.find(i => i.id == req.params.id);
    if (item) {
        item.currentStock += req.body.delta;
    }

    writeDB(db);
    res.json({ ok: true });
});

/* DELETE ITEM */
app.delete("/items/:id", (req, res) => {
    const db = readDB();

    db.items = db.items.filter(i => i.id != req.params.id);

    writeDB(db);
    res.json({ ok: true });
});

/* SUMMARY */
app.get("/summary", (req, res) => {
    const db = readDB();
    const items = db.items;

    const total = items.length;
    const low = items.filter(i => i.currentStock < i.fullStock * 0.3).length;
    const full = items.filter(i => i.currentStock >= i.fullStock).length;

    const fillRate = total === 0 ? 0 :
        Math.round(
            (items.reduce((a, b) => a + b.currentStock, 0) /
            items.reduce((a, b) => a + b.fullStock, 0)) * 100
        );

    res.json({ total, low, full, fillRate });
});

/* ---------- START SERVER ---------- */
app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port", PORT);
});
