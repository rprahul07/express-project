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
  const { rows } = await pool.query("SELECT id, name, class, dob FROM students ORDER BY id");
  res.json(rows);
});

// GET one student by id
router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "id must be a positive whole number" });

  const { rows } = await pool.query("SELECT id, name, class, dob FROM students WHERE id = $1", [id]);
  if (rows.length === 0) return res.status(404).json({ error: `student ${id} not found` });
  res.json(rows[0]);
});

// 2. POST - create a student: { "id": "1", "name": "rahul", "class": "cse", "dob": "2000-01-15" }
router.post("/", async (req, res) => {
  const body = req.body ?? {};
  const id = parseId(body.id);
  if (!id) return res.status(400).json({ error: "id must be a positive whole number" });
  if (!isText(body.name) || !isText(body.class)) {
    return res.status(400).json({ error: "name and class are required" });
  }
  const dob = body.dob !== undefined ? body.dob : null;

  try {
    const { rows } = await pool.query(
      "INSERT INTO students (id, name, class, dob) VALUES ($1, $2, $3, $4) RETURNING id, name, class, dob",
      [id, body.name.trim(), body.class.trim(), dob]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: `student ${id} already exists` });
    throw err;
  }
});

// 3. PUT - replace a student: { "id": "1", "name": "rahul", "class": "ece", "dob": "2000-01-15" }
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
  const dob = body.dob !== undefined ? body.dob : null;

  const { rows } = await pool.query(
    "UPDATE students SET name = $2, class = $3, dob = $4 WHERE id = $1 RETURNING id, name, class, dob",
    [id, body.name.trim(), body.class.trim(), dob]
  );
  if (rows.length === 0) return res.status(404).json({ error: `student ${id} not found` });
  res.json(rows[0]);
});

// 4. PATCH - change only the fields sent: { "class": "cse" }
router.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "id must be a positive whole number" });
  const body = req.body ?? {};

  const fields = ["name", "class", "dob"].filter((field) => body[field] !== undefined);
  if (fields.length === 0) return res.status(400).json({ error: "send name, class and/or dob to update" });
  if (!fields.filter(f => f !== "dob").every((field) => isText(body[field]))) {
    return res.status(400).json({ error: "name and class cannot be empty" });
  }

  // column names come from the fixed list above, values are passed as parameters
  const sets = fields.map((field, i) => `${field} = $${i + 2}`).join(", ");
  const { rows } = await pool.query(
    `UPDATE students SET ${sets} WHERE id = $1 RETURNING id, name, class, dob`,
    [id, ...fields.map((field) => body[field] === undefined ? null : (field === "dob" ? body[field] : body[field].trim()))]
  );
  if (rows.length === 0) return res.status(404).json({ error: `student ${id} not found` });
  res.json(rows[0]);
});

// 5. DELETE a student
router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "id must be a positive whole number" });

  const { rows } = await pool.query("DELETE FROM students WHERE id = $1 RETURNING id, name, class, dob", [id]);
  if (rows.length === 0) return res.status(404).json({ error: `student ${id} not found` });
  res.json({ deleted: rows[0] });
});

module.exports = router;
