const express = require("express");
const { pool } = require("../db");

const router = express.Router();

// "1" or 1 -> 1; anything that is not a positive whole number -> null
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isText(value) {
  return typeof value === "string" && value.trim() !== "";
}

// 1. GET all students
router.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT id, name, class FROM students ORDER BY id");
  res.json(rows);
});

// GET one student by id
router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "id must be a positive whole number" });

  const { rows } = await pool.query("SELECT id, name, class FROM students WHERE id = $1", [id]);
  if (rows.length === 0) return res.status(404).json({ error: `student ${id} not found` });
  res.json(rows[0]);
});

// 2. POST - create a student: { "id": "1", "name": "rahul", "class": "cse" }
router.post("/", async (req, res) => {
  const body = req.body ?? {};
  const id = parseId(body.id);
  if (!id) return res.status(400).json({ error: "id must be a positive whole number" });
  if (!isText(body.name) || !isText(body.class)) {
    return res.status(400).json({ error: "name and class are required" });
  }

  try {
    const { rows } = await pool.query(
      "INSERT INTO students (id, name, class) VALUES ($1, $2, $3) RETURNING id, name, class",
      [id, body.name.trim(), body.class.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: `student ${id} already exists` });
    throw err;
  }
});

// 3. PUT - replace a student: { "id": "1", "name": "rahul", "class": "ece" }
router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "id must be a positive whole number" });
  const body = req.body ?? {};
  if (body.id !== undefined && parseId(body.id) !== id) {
    return res.status(400).json({ error: "id in the body does not match the id in the URL" });
  }
  if (!isText(body.name) || !isText(body.class)) {
    return res.status(400).json({ error: "name and class are required" });
  }

  const { rows } = await pool.query(
    "UPDATE students SET name = $2, class = $3 WHERE id = $1 RETURNING id, name, class",
    [id, body.name.trim(), body.class.trim()]
  );
  if (rows.length === 0) return res.status(404).json({ error: `student ${id} not found` });
  res.json(rows[0]);
});

// 4. PATCH - change only the fields sent: { "class": "cse" }
router.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "id must be a positive whole number" });
  const body = req.body ?? {};

  const fields = ["name", "class"].filter((field) => body[field] !== undefined);
  if (fields.length === 0) return res.status(400).json({ error: "send name and/or class to update" });
  if (!fields.every((field) => isText(body[field]))) {
    return res.status(400).json({ error: "name and class cannot be empty" });
  }

  // column names come from the fixed list above, values are passed as parameters
  const sets = fields.map((field, i) => `${field} = $${i + 2}`).join(", ");
  const { rows } = await pool.query(
    `UPDATE students SET ${sets} WHERE id = $1 RETURNING id, name, class`,
    [id, ...fields.map((field) => body[field].trim())]
  );
  if (rows.length === 0) return res.status(404).json({ error: `student ${id} not found` });
  res.json(rows[0]);
});

// 5. DELETE a student
router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "id must be a positive whole number" });

  const { rows } = await pool.query("DELETE FROM students WHERE id = $1 RETURNING id, name, class", [id]);
  if (rows.length === 0) return res.status(404).json({ error: `student ${id} not found` });
  res.json({ deleted: rows[0] });
});

module.exports = router;
