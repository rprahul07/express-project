require("dotenv").config({ quiet: true });
const express = require("express");
const { initDb } = require("./db");
const studentsRouter = require("./routes/students");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.get("/rehan",(req,res)=>{
  res.json({"i am":"okay"})
})

app.use("/students", studentsRouter);

// bad JSON body -> 400, anything else (e.g. database down) -> 500
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "body is not valid JSON" });
  console.error(err);
  res.status(500).json({ error: "something went wrong" });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Could not connect to Supabase:", err.message);
    process.exit(1);
  });
