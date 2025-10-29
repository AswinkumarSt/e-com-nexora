const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(':memory:');

const getProducts = async () => {
  try {
    const response = await fetch('https://fakestoreapi.com/products');
    const data = await response.json();
    return data.slice(0, 10).map(product => ({
      id: product.id.toString(),
      name: product.title,
      price: product.price,
      image: product.image,
      description: product.description
    }));
  } catch (error) {
    return [
      { id: '1', name: 'Headphones', price: 99.99, image: 'https://picsum.photos/200/300?random=1', description: 'Good headphones' },
      { id: '2', name: 'Smart Watch', price: 199.99, image: 'https://picsum.photos/200/300?random=2', description: 'Nice watch' },
      { id: '3', name: 'Backpack', price: 49.99, image: 'https://picsum.photos/200/300?random=3', description: 'Big backpack' },
      { id: '4', name: 'USB Hub', price: 29.99, image: 'https://picsum.photos/200/300?random=4', description: 'Many ports' },
      { id: '5', name: 'Keyboard', price: 79.99, image: 'https://picsum.photos/200/300?random=5', description: 'Mechanical keyboard' },
      { id: '6', name: 'Mouse', price: 39.99, image: 'https://picsum.photos/200/300?random=6', description: 'Wireless mouse' },
      { id: '7', name: 'Phone Case', price: 19.99, image: 'https://picsum.photos/200/300?random=7', description: 'Protective case' },
      { id: '8', name: 'Charger', price: 59.99, image: 'https://picsum.photos/200/300?random=8', description: 'Portable charger' }
    ];
  }
};

db.serialize(() => {
  db.run(`CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    image TEXT,
    description TEXT
  )`);

  db.run(`CREATE TABLE cart_items (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  getProducts().then(products => {
    const stmt = db.prepare("INSERT INTO products (id, name, price, image, description) VALUES (?, ?, ?, ?, ?)");
    products.forEach(product => {
      stmt.run(product.id, product.name, product.price, product.image, product.description);
    });
    stmt.finalize();
  });
});

app.get('/api/products', (req, res) => {
  db.all("SELECT * FROM products", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/api/cart', (req, res) => {
  const { productId, quantity } = req.body;
  
  if (!productId || !quantity) {
    return res.status(400).json({ error: 'Need product and quantity' });
  }

  db.get("SELECT * FROM products WHERE id = ?", [productId], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    db.get("SELECT * FROM cart_items WHERE product_id = ?", [productId], (err, existingItem) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        db.run("UPDATE cart_items SET quantity = ? WHERE product_id = ?", [newQuantity, productId], function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ message: 'Cart updated', cartItemId: existingItem.id });
        });
      } else {
        const cartItemId = uuidv4();
        db.run("INSERT INTO cart_items (id, product_id, quantity) VALUES (?, ?, ?)", 
          [cartItemId, productId, quantity], function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ message: 'Item added to cart', cartItemId });
        });
      }
    });
  });
});

app.delete('/api/cart/:id', (req, res) => {
  const { id } = req.params;
  
  db.run("DELETE FROM cart_items WHERE id = ?", [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Item removed' });
  });
});

app.get('/api/cart', (req, res) => {
  const query = `
    SELECT 
      ci.id,
      ci.quantity,
      p.id as product_id,
      p.name,
      p.price,
      p.image,
      (ci.quantity * p.price) as item_total
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
  `;

  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const total = rows.reduce((sum, item) => sum + item.item_total, 0);
    
    res.json({
      items: rows,
      total: total,
      itemCount: rows.reduce((count, item) => count + item.quantity, 0)
    });
  });
});

app.post('/api/checkout', (req, res) => {
  const { cartItems, customerInfo } = req.body;

  if (!cartItems || !cartItems.length) {
    return res.status(400).json({ error: 'Cart empty' });
  }

  if (!customerInfo || !customerInfo.name || !customerInfo.email) {
    return res.status(400).json({ error: 'Need name and email' });
  }

  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const receipt = {
    orderId: uuidv4(),
    customer: customerInfo,
    items: cartItems,
    total: total,
    timestamp: new Date().toISOString()
  };

  db.run("DELETE FROM cart_items");

  res.json(receipt);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});