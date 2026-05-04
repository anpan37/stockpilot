const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
const PORT = 8848;

app.use(cors());
app.use(express.json());

const db = new Database('./data.db');

db.prepare(`
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    fullStock INTEGER CHECK(fullStock BETWEEN 1 AND 50),
    currentStock INTEGER,
    createdAt TEXT,
    updatedAt TEXT
)
`).run();

function calculate(item) {
    const percentage = Math.round((item.currentStock / item.fullStock) * 100);
    const toAdd = item.fullStock - item.currentStock;

    let status = 'OK';
    if (percentage === 100) status = 'FULL';
    else if (percentage < 40) status = 'LOW';

    return { ...item, percentage, toAdd, status };
}

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/items', (req, res) => {
    try {
        const items = db.prepare("SELECT * FROM items").all();
        res.json(items.map(calculate));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/items', (req, res) => {
    try {
        const { name, fullStock, currentStock } = req.body;

        if (!name || !fullStock) {
            return res.status(400).json({ error: 'Invalid input' });
        }

        const now = new Date().toISOString();

        const existing = db.prepare("SELECT * FROM items WHERE name=?").get(name);

        if (existing) {
            db.prepare(`
                UPDATE items 
                SET fullStock=?, currentStock=?, updatedAt=? 
                WHERE name=?
            `).run(fullStock, currentStock ?? existing.currentStock, now, name);
        } else {
            db.prepare(`
                INSERT INTO items (name, fullStock, currentStock, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?)
            `).run(name, fullStock, currentStock || 0, now, now);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/items/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { delta, name, fullStock } = req.body;

        const item = db.prepare("SELECT * FROM items WHERE id=?").get(id);
        if (!item) return res.status(404).json({ error: 'Not found' });

        let newStock = item.currentStock;

        if (delta !== undefined) {
            newStock = Math.max(0, Math.min(item.fullStock, item.currentStock + delta));
        }

        const now = new Date().toISOString();

        db.prepare(`
            UPDATE items SET 
                currentStock=?,
                name=COALESCE(?, name),
                fullStock=COALESCE(?, fullStock),
                updatedAt=?
            WHERE id=?
        `).run(newStock, name, fullStock, now, id);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/items/:id', (req, res) => {
    try {
        db.prepare("DELETE FROM items WHERE id=?").run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/summary', (req, res) => {
    try {
        const items = db.prepare("SELECT * FROM items").all().map(calculate);

        const total = items.length;
        const full = items.filter(i => i.status === 'FULL').length;
        const low = items.filter(i => i.status === 'LOW').length;
        const ok = items.filter(i => i.status === 'OK').length;

        const missing = items.reduce((sum, i) => sum + i.toAdd, 0);

        const fillRate = total === 0
            ? 0
            : Math.round(items.reduce((s, i) => s + i.percentage, 0) / total);

        res.json({ total, full, low, ok, missing, fillRate });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
