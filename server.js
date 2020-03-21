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
    .catch(err => res.json(err, 500));
});

app.put("/customers/:customerId", (req, res) => {
  const customerId = req.params.customerId;
  const name = req.body.name;
  const address = req.body.address;
  const city = req.body.city;
  const country = req.body.country;

  const query =
    "UPDATE customers SET name=$1, address=$2, city=$3, country=$4 where id = $5";
  const parameters = [name, address, city, country, customerId];

  pool
    .query(query, parameters)
    .then(result => res.send("Customer updated!"))
    .catch(err => res.json(err, 500));
});

app.get("/customers/:customerId", (req, res) => {
  const customerId = req.params.customerId;

  pool
    .query("SELECT * from customers where id = $1", [customerId])
    .then(result => res.json(result.rows))
    .catch(err => res.json(err, 500));
});

// Add a new DELETE endpoint /customers/:customerId to delete an existing customer only if this customer doesn't have orders.

app.delete("/customers/:customerId", (req, res) => {
  const customerId = req.params.customerId;

  pool
    .query("select * from orders where customer_id = $1", [customerId])
    .then(result => {
      if (result.rows.length > 0) {
        res.status(400).send("Customer has orders, so can't be deleted");
        return;
      }

      pool
        .query("delete from customers where id = $1", [customerId])
        .then(() => res.send("customer deleted"))
        .catch(err => res.json(err, 500));
    })
    .catch(err => res.json(err, 500));
});

/* Add a new GET endpoint /customers/:customerId/orders to load all the orders along 
  the items in the orders of a specific customer. Especially, the following information 
  should be returned: order references, order dates, product names, unit prices, suppliers and quantities.
  */

app.get("/customers/:customerId/orders", (req, res) => {
  const customerId = req.params.customerId;

  const query =
    "select orders.order_date , orders.order_reference, products.product_name," +
    "products.unit_price, order_items.quantity, suppliers.supplier_name " +
    "from orders join order_items on orders.id=order_items.order_id " +
    "join products on products.id = order_items.product_id " +
    "join suppliers on products.supplier_id = suppliers.id " +
    "where orders.customer_id = $1";

  const params = [customerId];

  pool
    .query(query, params)
    .then(result => res.json(result.rows))
    .catch(err => res.json(err, 500));
});

app.post("/customers/:customerId/orders", (req, res) => {
  const date = req.body.order_date;
  const reference = req.body.order_reference;
  const customerId = req.params.customerId;

  pool
    .query("select * from customers where id=$1 ", [customerId])
    .then(result => {
      if (result.rows.length == 0) {
        res.status(404).send("customer does not exist!");
        return;
      }

      const query =
        "INSERT INTO orders (order_date, order_reference, customer_id) VALUES ($1, $2, $3)";
      const parameters = [date, reference, customerId];

      pool
        .query(query, parameters)
        .then(() => res.send("order created"))
        .catch(err => res.json(err, 500));
    })
    .catch(err => res.json(err, 500));
});

/* Add a new DELETE endpoint /orders/:orderId to delete an existing   
   order along all the associated order items.
*/

app.delete("/orders/:orderId", (req, res) => {
  const orderId = req.params.orderId;

  pool
    .query("DELETE FROM order_items where order_id = $1", [orderId])
    .then(() => {
      pool
        .query("DELETE FROM orders where id = $1", [orderId])
        .then(result => res.send(`order ${orderId} deleted`))
        .catch(err => res.json(err, 500));
    })
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

  let params = [];

  if (productName) {
    params = [`%${productName}%`];
    query += ` where products.product_name ilike $1`;
  }

  pool
    .query(query, params)
    .then(result => res.json(result.rows))
    .catch(err => res.json(err, 500));
});

app.post("/products", (req, res) => {
  const name = req.body.product_name;
  const price = req.body.unit_price;
  const supplierId = req.body.supplier_id;

  if (!Number.isInteger(price) || price <= 0) {
    res.status(404).send("Price should be a positive number");
    return;
  }

  pool
    .query("Select * from suppliers where id = $1", [supplierId])
    .then(result => {
      if (result.rows.length > 0) {
        const query =
          "INSERT INTO products(product_name, unit_price, supplier_id) VALUES ($1, $2, $3)";
        const parameters = [name, price, supplierId];

        pool
          .query(query, parameters)
          .then(() => res.send("Product created"))
          .catch(err => res.json(err, 404));
      } else {
        res.status(404).send("Not valid supplier");
      }
    })
    .catch(err => res.json(err, 404));
});

app.listen(3000, function() {
  console.log("Server is listening on port 3000. Ready to accept requests!");
});
