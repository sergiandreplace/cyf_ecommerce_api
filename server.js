const express = require("express");
const app = express();
const { Pool } = require("pg");
const secrets = require("./secrets");
const bodyParser = require("body-parser");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "cyf_ecommerce",
  password: secrets.dbPassword,
  port: 5432
});

app.use(bodyParser.json());

app.get("/customers", (req, res) => {
  pool
    .query("SELECT * FROM customers")
    .then(result => res.json(result.rows))
    .catch(err => res.json(err, 404));
});

app.post("/customers", (req, res) => {
  const name = req.body.name;
  const address = req.body.address;
  const city = req.body.city;
  const country = req.body.country;

  const query =
    "INSERT INTO customers(name, address, city, country) VALUES ($1, $2, $3, $4)";
  const parameters = [name, address, city, country];

  pool
    .query(query, parameters)
    .then(result => res.send("Customer created!"))
    .catch(err => res.json(err, 404));
});

app.get("/customers/:customerId", (req, res) => {
  const customerId = req.params.customerId;

  pool
    .query("SELECT * from customers where id = $1", [customerId])
    .then(result => res.json(result.rows))
    .catch(err => res.json(err, 500));
});

app.get("/suppliers", (req, res) => {
  pool.query("SELECT * FROM suppliers", (error, result) => {
    res.json(result.rows);
  });
});

app.get("/products", (req, res) => {
  const productName = req.query.name;

  let query =
    "SELECT products.*, suppliers.supplier_name FROM products join suppliers on products.supplier_id = suppliers.id";

  if (productName) {
    query += ` where products.product_name ilike '%${productName}%'`;
  }

  pool
    .query(query)
    .then(result => res.json(result.rows))
    .catch(err => res.json(err, 500));
});

app.listen(3000, function() {
  console.log("Server is listening on port 3000. Ready to accept requests!");
});
